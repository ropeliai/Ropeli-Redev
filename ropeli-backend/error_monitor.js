/**
 * Ring buffer, optional webhook, Express + process error handlers.
 *
 * Env: ERROR_WEBHOOK_URL, ERROR_WEBHOOK_FORMAT (generic|slack),
 * ERROR_RING_BUFFER_SIZE, ERROR_WEBHOOK_COOLDOWN_MS, ERROR_WEBHOOK_MAX_PER_MIN
 */

import { createLogger } from "./logger.js";

const log = createLogger("errors");

const BUFFER_SIZE = Math.min(
  Math.max(parseInt(process.env.ERROR_RING_BUFFER_SIZE || "50", 10) || 50, 1),
  500
);

const WEBHOOK_COOLDOWN_MS =
  parseInt(process.env.ERROR_WEBHOOK_COOLDOWN_MS || "60000", 10) || 60000;
const WEBHOOK_MAX_PER_MIN =
  parseInt(process.env.ERROR_WEBHOOK_MAX_PER_MIN || "20", 10) || 20;

/** @type {Array<Record<string, unknown>>} */
const entries = [];

/** @type {Map<string, number>} */
const lastWebhookAt = new Map();

let webhookWindowStart = Date.now();
let webhooksInWindow = 0;

function ringPush(entry) {
  entries.push(entry);
  if (entries.length > BUFFER_SIZE) entries.shift();
}

function fingerprint(err, where) {
  const msg = err?.message != null ? String(err.message) : String(err);
  return `${where}:${msg.slice(0, 200)}`;
}

function canSendWebhook(key) {
  const now = Date.now();
  if (now - webhookWindowStart > 60_000) {
    webhookWindowStart = now;
    webhooksInWindow = 0;
  }
  if (webhooksInWindow >= WEBHOOK_MAX_PER_MIN) return false;
  const last = lastWebhookAt.get(key) || 0;
  if (now - last < WEBHOOK_COOLDOWN_MS) return false;
  return true;
}

function markWebhook(key) {
  lastWebhookAt.set(key, Date.now());
  webhooksInWindow++;
  if (lastWebhookAt.size > 200) {
    const cutoff = Date.now() - WEBHOOK_COOLDOWN_MS * 2;
    for (const [k, t] of lastWebhookAt) {
      if (t < cutoff) lastWebhookAt.delete(k);
    }
  }
}

function buildWebhookBody(entry, format) {
  if (format === "slack") {
    const path = entry.path ? `\n${entry.method || ""} ${entry.path}`.trim() : "";
    const stack = entry.stack ? `\n\`\`\`${String(entry.stack).slice(0, 2800)}\`\`\`` : "";
    return {
      text: `*[${entry.where}]* ${entry.message}${path}${stack}`,
    };
  }
  return {
    event: "error",
    ...entry,
  };
}

function sendWebhook(entry) {
  const url = process.env.ERROR_WEBHOOK_URL;
  if (!url || typeof url !== "string" || !url.startsWith("http")) return;

  const key = fingerprint(
    { message: entry.message },
    String(entry.where || "unknown")
  );
  if (!canSendWebhook(key)) return;
  markWebhook(key);

  const format = (process.env.ERROR_WEBHOOK_FORMAT || "generic").toLowerCase();
  const body = buildWebhookBody(entry, format);

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  })
    .then((res) => {
      if (!res.ok) log.warn("webhook non-OK", { status: res.status });
    })
    .catch((e) => {
      log.warn("webhook failed", { err: String(e?.message || e) });
    })
    .finally(() => clearTimeout(t));
}

export function captureError({ err, where = "unknown", req = null, extra = null, alert = true }) {
  const e = err instanceof Error ? err : new Error(String(err));
  const stack = e.stack || "";
  const statusFrom =
    err && typeof err === "object" && err !== null
      ? err.status ?? err.statusCode
      : undefined;
  const entry = {
    ts: new Date().toISOString(),
    where,
    message: e.message,
    stack: stack.slice(0, 8000),
    status: statusFrom,
    method: req?.method,
    path: req?.originalUrl || req?.url,
    ...(extra && typeof extra === "object" ? { extra } : {}),
  };
  ringPush(entry);
  log.error("captured", {
    where,
    message: entry.message,
    path: entry.path,
  });

  if (alert) sendWebhook(entry);
}

export function getRecentErrors() {
  return [...entries].reverse();
}

export function errorHandlerMiddleware(err, req, res, next) {
  const status = Number(err?.status || err?.statusCode) || 500;

  if (status >= 500) {
    captureError({ err, where: "express", req, alert: true });
  } else {
    log.warn(`express ${status}`, {
      message: err?.message,
      path: req.originalUrl || req.url,
    });
  }

  if (res.headersSent) {
    return next(err);
  }

  const dev = process.env.NODE_ENV !== "production";
  res.status(status).json({
    error:
      status >= 500 && !dev ? "Internal server error" : err?.message || "Error",
    ...(dev && err?.stack ? { stack: err.stack } : {}),
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Not found" });
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function installProcessErrorHandlers() {
  process.on("unhandledRejection", (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    captureError({ err, where: "unhandledRejection", alert: true });
  });

  process.on("uncaughtException", (err) => {
    captureError({ err, where: "uncaughtException", alert: true });
    process.exit(1);
  });
}
