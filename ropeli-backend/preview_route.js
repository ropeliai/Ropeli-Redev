/**
 * Serves PWA preview files from Supabase Storage with correct Content-Type headers.
 * Supabase public URLs force text/html → text/plain; this route renders properly in browsers.
 */
import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const BUCKET = "pwa-previews";
const MIME = {
  "index.html": "text/html; charset=utf-8",
  "manifest.json": "application/manifest+json",
  "sw.js": "application/javascript; charset=utf-8",
};

let cachedClient = null;
function getServiceClient() {
  if (cachedClient) return cachedClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedClient;
}

router.get("/projects/:projectId/:filename", async (req, res, next) => {
  if (process.env.SUPABASE_STORAGE_ENABLED !== "true") {
    return next();
  }

  const { projectId, filename } = req.params;
  if (!MIME[filename] || projectId.includes("..") || filename.includes("..")) {
    return res.status(404).end();
  }

  const sb = getServiceClient();
  if (!sb) {
    return res.status(503).json({ error: "Storage unavailable" });
  }

  const storagePath = `projects/${projectId}/${filename}`;
  const { data, error } = await sb.storage.from(BUCKET).download(storagePath);
  if (error || !data) {
    console.warn("[preview] storage miss:", storagePath, error?.message);
    return res.status(404).end();
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  res.setHeader("Content-Type", MIME[filename]);
  res.send(buffer);
});

export default router;
