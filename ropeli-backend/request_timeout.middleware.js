/**
 * Global HTTP request timeout. REQUEST_TIMEOUT_MS (default 600000 = 10 min); 0 disables.
 * Health/readiness paths are excluded.
 */

import { createLogger } from "./logger.js";

const log = createLogger("http");

const DEFAULT_MS = 600_000;

const SKIP_PATHS = new Set([
  "/health",
  "/api/health",
  "/ready",
  "/api/ready",
]);

function resolveTimeoutMs() {
  const raw = process.env.REQUEST_TIMEOUT_MS;
  if (raw === undefined || raw === "") return DEFAULT_MS;
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n)) return DEFAULT_MS;
  return n;
}

export function requestTimeoutMiddleware() {
  const ms = resolveTimeoutMs();
  if (ms <= 0) {
    return (_req, _res, next) => next();
  }

  return (req, res, next) => {
    const path = req.path || "";
    if (SKIP_PATHS.has(path)) return next();

    const timer = setTimeout(() => {
      if (res.headersSent) return;
      log.warn("request timeout", {
        method: req.method,
        path: req.originalUrl || req.url,
        timeoutMs: ms,
      });
      res.status(503).json({
        error: "Request timeout",
        code: "REQUEST_TIMEOUT",
      });
    }, ms);

    const clear = () => clearTimeout(timer);
    res.on("finish", clear);
    res.on("close", clear);
    next();
  };
}
