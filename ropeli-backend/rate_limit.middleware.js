import { ACCESS_POLICY } from "./access_policy.js";

/**
 * In-memory rate limiting. Process-local; acceptable for a single-instance
 * backend. For multi-instance deployments, swap the storage in
 * `createLimiter` for a Redis-backed counter.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

function getClientIp(req) {
  const fwd = req.headers?.["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim();
  }
  if (req.ip) return req.ip;
  return req.socket?.remoteAddress || "unknown";
}

function pruneExpired(buckets, now) {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

function createLimiter({ windowMs, max, keyFn, message, skip }) {
  const buckets = new Map();
  let lastPrune = 0;
  return function limiter(req, res, next) {
    if (typeof skip === "function" && skip(req)) return next();

    const now = Date.now();
    if (now - lastPrune > MINUTE_MS) {
      pruneExpired(buckets, now);
      lastPrune = now;
    }

    const key = keyFn(req);
    if (!key) return next();

    let entry = buckets.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(key, entry);
    }

    if (entry.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: message || "Too many requests",
        retryAfterSeconds: retryAfter,
      });
    }

    entry.count += 1;
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    res.setHeader(
      "X-RateLimit-Reset",
      String(Math.floor(entry.resetAt / 1000))
    );
    next();
  };
}

/**
 * Strict daily limit for guests (unauthenticated) on generation endpoints.
 * Authenticated users bypass this limiter.
 */
export function guestDailyLimiter(opts = {}) {
  const max = Number.isFinite(opts.max)
    ? opts.max
    : ACCESS_POLICY.guestDailyLimit;
  const windowMs = Number.isFinite(opts.windowMs) ? opts.windowMs : DAY_MS;
  return createLimiter({
    windowMs,
    max,
    keyFn: (req) => `guest:daily:${getClientIp(req)}`,
    message: "Guest usage limit reached — please sign in to continue.",
    skip: (req) => Boolean(req.user),
  });
}

/**
 * Short-window burst limiter. Applies to everyone; users keyed by user id,
 * guests keyed by IP. Guest quota is tighter than user quota.
 */
export function burstLimiter(opts = {}) {
  const userMax = Number.isFinite(opts.userMax)
    ? opts.userMax
    : ACCESS_POLICY.userBurstPerMinute;
  const guestMax = Number.isFinite(opts.guestMax)
    ? opts.guestMax
    : ACCESS_POLICY.guestBurstPerMinute;
  const windowMs = Number.isFinite(opts.windowMs) ? opts.windowMs : MINUTE_MS;

  const userLimiter = createLimiter({
    windowMs,
    max: userMax,
    keyFn: (req) => (req.user ? `user:burst:${req.user.id}` : null),
    message: "Too many requests — please slow down.",
  });
  const guestLimiter = createLimiter({
    windowMs,
    max: guestMax,
    keyFn: (req) => (req.user ? null : `guest:burst:${getClientIp(req)}`),
    message: "Too many requests — please slow down.",
  });

  return function combinedBurstLimiter(req, res, next) {
    if (req.user) return userLimiter(req, res, next);
    return guestLimiter(req, res, next);
  };
}

/**
 * Enforce guest-specific input caps (prompt length, existing-file payloads).
 * Applies only to requests marked req.isGuest === true.
 */
export function enforceGuestInputCaps(req, res, next) {
  if (!req.isGuest) return next();
  const body = req.body || {};
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  if (prompt.length > ACCESS_POLICY.guestPromptCharLimit) {
    return res.status(413).json({
      error: "Prompt too long for guest demo",
      details: `Guests are limited to ${ACCESS_POLICY.guestPromptCharLimit} characters. Please sign in for full access.`,
    });
  }
  if (
    Array.isArray(body.existingFiles) &&
    body.existingFiles.length > ACCESS_POLICY.guestMaxExistingFiles
  ) {
    return res.status(413).json({
      error: "Existing file context not available for guest demo",
      details: "Please sign in to continue working on saved projects.",
    });
  }
  next();
}

export { getClientIp };
