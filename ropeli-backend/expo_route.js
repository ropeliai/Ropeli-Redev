import express from "express";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { startExpo, stopExpo, getExpoStatus } from "./expo_runner.js";
import { triggerEASBuild } from "./eas_builder.js";
import requireAuth from "./middleware/requireAuth.js";

const router = express.Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

// Mirrors expo_runner's directory resolution so the build endpoint targets
// the same project dir that Metro is already running against.
// Use EXPO_BASE_DIR env with sensible platform-specific fallback so previews
// can be written outside the repo on Windows or Linux render hosts.
const EXPO_BASE_DIR =
  process.env.EXPO_BASE_DIR || (process.platform === "win32" ? "D:/tmp/expo-projects" : "/var/data/expo-projects");

function safeProjectId(projectId) {
  return (
    String(projectId || "")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 64) || "expo-app"
  );
}

function resolveProjectDir(projectId) {
  return path.join(EXPO_BASE_DIR, safeProjectId(projectId));
}

let cachedServiceClient = null;
function getServiceClient() {
  if (cachedServiceClient) return cachedServiceClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedServiceClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedServiceClient;
}

function isUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(s || "")
  );
}

// ── Expo lifecycle routes (existing) ────────────────────────────────────────

router.post("/start", requireAuth, async (req, res) => {
  try {
    const { project_id, files } = req.body || {};
    if (!project_id) {
      return res.status(400).json({ error: "project_id is required" });
    }
    const result = await startExpo(project_id, files || []);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: "Failed to start expo",
      details: err?.message ?? String(err),
    });
  }
});

router.post("/stop", requireAuth, (req, res) => {
  try {
    const { project_id } = req.body || {};
    if (project_id) stopExpo(project_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({
      error: "Failed to stop expo",
      details: err?.message ?? String(err),
    });
  }
});

router.get("/status/:projectId", requireAuth, async (req, res) => {
  try {
    const status = await getExpoStatus(req.params.projectId);
    res.json(status);
  } catch (err) {
    res.json({ running: false, metroReachable: false });
  }
});

// ── APK build routes ────────────────────────────────────────────────────────

/**
 * POST /api/expo/build
 *
 * Triggers an async EAS APK build. Returns { build_id } immediately — the
 * frontend then polls GET /build-status/:buildId every 30s.
 *
 * Inserts a build_status row so the polling route can verify ownership
 * (user_id = req.user.id) before proxying to the EAS API.
 */
router.post("/build", requireAuth, async (req, res) => {
  const { project_id } = req.body || {};
  if (!project_id) {
    return res.status(400).json({ error: "project_id required" });
  }

  const projectDir = resolveProjectDir(project_id);
  if (!fs.existsSync(projectDir)) {
    return res.status(404).json({
      error: "BUILD_FAILED",
      message: "Project not found. Generate first.",
    });
  }

  let buildId;
  try {
    ({ build_id: buildId } = await triggerEASBuild(projectDir));
  } catch (err) {
    console.error("[build] error:", err.message);
    return res.status(500).json({ error: "BUILD_FAILED", message: err.message });
  }

  const sb = getServiceClient();
  if (sb) {
    const row = {
      user_id: req.user.id,
      build_id: buildId,
      status: "in-progress",
      platform: "android",
    };
    if (isUuid(project_id)) {
      row.generated_project_id = project_id;
    }
    const { error: insertErr } = await sb.from("build_status").insert(row);
    if (insertErr) {
      console.warn("[build] build_status insert failed:", insertErr.message);
    }
  } else {
    console.warn("[build] service client unavailable — build_status row skipped");
  }

  console.log(`[build] EAS build queued for ${project_id}, build_id: ${buildId}`);
  res.json({ success: true, build_id: buildId });
});

/**
 * GET /api/expo/build-status/:buildId
 *
 * Polled by the frontend every 30s. Looks up the build_status row, checks
 * ownership, proxies to https://api.expo.dev/v2/builds/:buildId, and on
 * completion writes apk_url back to both build_status and generated_projects.
 */
router.get("/build-status/:buildId", requireAuth, async (req, res) => {
  const { buildId } = req.params;
  if (!buildId) {
    return res.status(400).json({ error: "buildId is required" });
  }

  const sb = getServiceClient();
  if (!sb) {
    return res.status(503).json({
      error: "DATABASE_UNAVAILABLE",
      message: "Build tracking is not configured on the server.",
    });
  }

  // Ownership check.
  const { data: buildRow, error: lookupErr } = await sb
    .from("build_status")
    .select("id, user_id, generated_project_id, status, apk_url, build_id")
    .eq("build_id", buildId)
    .single();

  if (lookupErr || !buildRow) {
    return res.status(404).json({ error: "BUILD_NOT_FOUND" });
  }
  if (buildRow.user_id !== req.user.id) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  // Cached terminal states — no need to hit EAS again.
  if (buildRow.status === "finished" && buildRow.apk_url) {
    return res.json({
      status: "finished",
      apk_url: buildRow.apk_url,
      build_id: buildId,
    });
  }
  if (buildRow.status === "errored") {
    return res.json({ status: "errored", build_id: buildId });
  }

  // Proxy to EAS API.
  if (!process.env.EXPO_TOKEN) {
    return res.status(503).json({
      error: "EAS_PROXY_ERROR",
      message: "EXPO_TOKEN not configured on the server.",
    });
  }

  let easRes, easData;
  try {
    easRes = await fetch(`https://api.expo.dev/v2/builds/${encodeURIComponent(buildId)}`, {
      headers: { Authorization: `Bearer ${process.env.EXPO_TOKEN}` },
    });
    easData = await easRes.json();
  } catch (err) {
    console.error("[build-status] EAS proxy error:", err.message);
    return res.status(502).json({
      error: "EAS_PROXY_ERROR",
      message: "Could not reach build service.",
    });
  }

  const status = (easData?.data?.status || easData?.status || "in-progress").toLowerCase();
  const apkUrl =
    easData?.data?.artifacts?.buildUrl ||
    easData?.artifacts?.buildUrl ||
    null;
  const now = new Date().toISOString();

  if (status === "finished" && apkUrl) {
    await sb
      .from("build_status")
      .update({ status: "finished", apk_url: apkUrl, updated_at: now })
      .eq("build_id", buildId);

    if (buildRow.generated_project_id) {
      const { error: gpErr } = await sb
        .from("generated_projects")
        .update({ apk_url: apkUrl })
        .eq("id", buildRow.generated_project_id);
      if (gpErr) {
        console.warn("[build-status] generated_projects update failed:", gpErr.message);
      }
    }

    // Fire-and-forget email notification — never blocks the response.
    import("./email.js")
      .then(({ sendBuildReadyEmail }) =>
        sendBuildReadyEmail(req.user.email, apkUrl, buildId)
      )
      .catch((e) => console.warn("[email] dispatch failed:", e?.message || e));

    return res.json({ status: "finished", apk_url: apkUrl, build_id: buildId });
  }

  if (status === "errored" || status === "canceled") {
    await sb
      .from("build_status")
      .update({ status: "errored", updated_at: now })
      .eq("build_id", buildId);
    return res.json({ status: "errored", build_id: buildId });
  }

  res.json({ status: status || "in-progress", build_id: buildId });
});

export default router;

// New route: write PWA preview files to disk and return preview URL
router.post("/pwa-preview", requireAuth, async (req, res) => {
  try {
    const { files, project_id, plan } = req.body || {};
    if (!project_id) {
      return res.status(400).json({ error: "project_id is required" });
    }

    const safeId = safeProjectId(project_id);
    const previewsBase = path.join(EXPO_BASE_DIR, "previews");
    const previewDir = path.join(previewsBase, safeId);

    // Ensure base previews dir and target dir exist
    if (!fs.existsSync(previewsBase)) {
      fs.mkdirSync(previewsBase, { recursive: true });
    }
    if (!fs.existsSync(previewDir)) {
      fs.mkdirSync(previewDir, { recursive: true });
    }

    if (!Array.isArray(files)) {
      return res.status(400).json({ error: "files must be an array" });
    }

    for (const file of files) {
      const relPath = String(file.path || "");
      const content = String(file.content || "");
      const outPath = path.join(previewDir, relPath);

      // Ensure directory for file exists
      const dir = path.dirname(outPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      let finalContent = content;
      // Inject watermark for free plans into index.html before </body>
      if (
        relPath.toLowerCase() === "index.html" &&
        String(plan || "").toLowerCase() === "free"
      ) {
        if (finalContent.includes("</body>")) {
          finalContent = finalContent.replace(
            /<\/body>/i,
            '<div style="position:fixed;right:12px;bottom:12px;background:rgba(0,0,0,0.6);color:white;padding:6px 8px;border-radius:8px;font-size:12px;z-index:2147483647">Built with Ropeli</div></body>'
          );
        } else {
          finalContent += '<div style="position:fixed;right:12px;bottom:12px;background:rgba(0,0,0,0.6);color:white;padding:6px 8px;border-radius:8px;font-size:12px;z-index:2147483647">Built with Ropeli</div>';
        }
      }

      fs.writeFileSync(outPath, finalContent, "utf8");
    }

    const preview_url = `/preview/previews/${safeId}/index.html`;
    return res.json({ success: true, preview_url });
  } catch (err) {
    console.error("[pwa-preview] error:", err?.message || err);
    return res.status(500).json({ error: "FAILED", details: err?.message || String(err) });
  }
});
