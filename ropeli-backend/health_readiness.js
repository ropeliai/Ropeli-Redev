import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getAppEnv } from "./app_env.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let _pkgVersion = "unknown";
try {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, "package.json"), "utf8")
  );
  _pkgVersion = pkg.version || "unknown";
} catch {
  /* ignore */
}

const MODAL_DEFAULT =
  "https://coutinhoandrew0--my-coder-model-generate.modal.run";

function openaiIntegrationConfigured() {
  const base = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.trim();
  const key = process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim();
  return { ok: Boolean(base && key) };
}

/**
 * Liveness: process is running (safe for frequent probes).
 */
export function getLivenessPayload() {
  return {
    status: "ok",
    service: "ropeli-backend",
    version: _pkgVersion,
    uptimeSeconds: Math.floor(process.uptime()),
    pid: process.pid,
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || "development",
    appEnv: getAppEnv(),
  };
}

/**
 * Readiness: Modal endpoint + optional OpenAI fallback status.
 * Set READINESS_REQUIRE_OPENAI=1 to fail (503) when OpenAI env is missing.
 */
export async function getReadinessResult() {
  const modalUrl = (process.env.MODAL_API_URL || MODAL_DEFAULT).trim();
  const openai = openaiIntegrationConfigured();

  const checks = {
    modalEndpoint: {
      ok: modalUrl.length > 0,
      detail: modalUrl
        ? `Modal URL set (${modalUrl.length > 64 ? modalUrl.slice(0, 64) + "…" : modalUrl})`
        : "MODAL_API_URL empty",
    },
    openaiFallback: {
      ok: openai.ok,
      detail: openai.ok
        ? "OpenAI integration configured"
        : "OpenAI fallback not configured (Modal-first is ok)",
    },
  };

  const requireOpenai = process.env.READINESS_REQUIRE_OPENAI === "1";
  const allOk = checks.modalEndpoint.ok && (!requireOpenai || openai.ok);

  return {
    ok: allOk,
    status: allOk ? "ready" : "not_ready",
    checks,
  };
}
