/**
 * Structured logging: JSON lines in production (or LOG_FORMAT=json),
 * human-readable lines in development.
 */

const USE_JSON =
  process.env.LOG_FORMAT === "json" ||
  process.env.NODE_ENV === "production";

function write(level, service, msg, meta = {}) {
  if (
    level === "debug" &&
    process.env.LOG_LEVEL !== "debug" &&
    process.env.NODE_ENV === "production"
  ) {
    return;
  }

  const record = {
    ts: new Date().toISOString(),
    level,
    service,
    msg: typeof msg === "string" ? msg : String(msg),
  };
  if (meta && typeof meta === "object" && Object.keys(meta).length > 0) {
    record.meta = meta;
  }

  const line = USE_JSON
    ? JSON.stringify(record) + "\n"
    : formatPretty(record);

  if (level === "error") {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }
}

function formatPretty(record) {
  const metaStr =
    record.meta && Object.keys(record.meta).length
      ? " " + JSON.stringify(record.meta)
      : "";
  return `[${record.ts}] ${record.level.toUpperCase()} [${record.service}] ${record.msg}${metaStr}\n`;
}

/**
 * @param {string} service - e.g. "generate", "auth", "http"
 */
export function createLogger(service) {
  return {
    info: (msg, meta) => write("info", service, msg, meta || {}),
    warn: (msg, meta) => write("warn", service, msg, meta || {}),
    error: (msg, meta) => write("error", service, msg, meta || {}),
    debug: (msg, meta) => write("debug", service, msg, meta || {}),
  };
}

/** Default app-level logger (server bootstrap, etc.) */
export const log = createLogger("app");

/**
 * Logs each HTTP request after response finishes.
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const path = req.originalUrl || req.url || "";
    const meta = {
      method: req.method,
      path,
      status: res.statusCode,
      durationMs,
    };
    const msg = `${req.method} ${path} ${res.statusCode}`;
    const httpLog = createLogger("http");
    if (res.statusCode >= 500) httpLog.error(msg, meta);
    else if (res.statusCode >= 400) httpLog.warn(msg, meta);
    else httpLog.info(msg, meta);
  });
  next();
}
