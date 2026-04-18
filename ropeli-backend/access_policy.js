/**
 * Central access-control policy used by all generation-related routes.
 *
 * Guest access (unauthenticated requests) is DISABLED by default.
 * Marketing pages are served by the frontend without authentication.
 * Any generation or preview endpoint must go through requireGeneratedAccess
 * (or requireAuth) so that the server is the source of truth — the UI is
 * never trusted to gate access.
 *
 * To opt into a strictly-limited anonymous demo, set:
 *   ALLOW_GUEST_GENERATION=true
 * Guests will then be allowed ONLY on endpoints that explicitly pass
 * `allowGuests: true`, and will still be rate-limited by guestRateLimiter
 * (see rate_limit.middleware.js).
 */

function parseBool(value) {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parsePositiveInt(value, fallback) {
  const n = parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

export const ACCESS_POLICY = Object.freeze({
  allowGuestGeneration: parseBool(process.env.ALLOW_GUEST_GENERATION),
  guestDailyLimit: parsePositiveInt(process.env.GUEST_DAILY_LIMIT, 3),
  guestPromptCharLimit: parsePositiveInt(
    process.env.GUEST_PROMPT_CHAR_LIMIT,
    500
  ),
  guestMaxExistingFiles: parsePositiveInt(
    process.env.GUEST_MAX_EXISTING_FILES,
    0
  ),
  userBurstPerMinute: parsePositiveInt(
    process.env.USER_BURST_PER_MINUTE,
    20
  ),
  guestBurstPerMinute: parsePositiveInt(
    process.env.GUEST_BURST_PER_MINUTE,
    5
  ),
});

/**
 * Express middleware builder for generation/preview endpoints.
 * Use instead of requireAuth when you want the guest policy to apply.
 *
 *   router.post("/", requireGeneratedAccess({ allowGuests: true }), handler)
 *
 * - If `allowGuests` is false (default), behaves like requireAuth.
 * - If `allowGuests` is true AND ALLOW_GUEST_GENERATION=true, unauthenticated
 *   requests are permitted and marked as req.isGuest = true so downstream
 *   middleware (rate limiter, handler) can apply stricter limits.
 * - Otherwise, unauthenticated requests are rejected with 401.
 */
export function requireGeneratedAccess(opts = {}) {
  const allowGuests = Boolean(opts.allowGuests);
  return function generatedAccessGate(req, res, next) {
    if (req.user) {
      req.isGuest = false;
      return next();
    }
    if (allowGuests && ACCESS_POLICY.allowGuestGeneration) {
      req.isGuest = true;
      return next();
    }
    return res.status(401).json({
      error: "Authentication required",
      details: "Sign in to use Ropeli generation features.",
    });
  };
}
