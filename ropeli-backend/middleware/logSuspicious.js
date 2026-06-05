/**
 * logSuspicious.js
 *
 * Tracks burst request rates per user in memory. Logs suspicious patterns;
 * hard-blocks only extreme abuse (20+ requests/minute).
 */

const SUSPICIOUS_THRESHOLD = 10;

/** @type {Map<string, { count: number, windowStart: number }>} */
const requestCounts = new Map();

export function logSuspicious(req, res, next) {
  if (!req.user) return next();

  const userId = req.user.id;
  const now = Date.now();
  const window = 60_000;

  const entry = requestCounts.get(userId) || { count: 0, windowStart: now };

  if (now - entry.windowStart > window) {
    requestCounts.set(userId, { count: 1, windowStart: now });
  } else {
    entry.count++;
    requestCounts.set(userId, entry);

    if (entry.count >= SUSPICIOUS_THRESHOLD) {
      console.warn(
        `[security] Suspicious activity: user ${userId} made ${entry.count} requests in 60s`
      );
    }

    if (entry.count >= SUSPICIOUS_THRESHOLD * 2) {
      return res.status(429).json({
        error: "RATE_EXCEEDED",
        message: "Too many requests. Please slow down.",
      });
    }
  }

  next();
}
