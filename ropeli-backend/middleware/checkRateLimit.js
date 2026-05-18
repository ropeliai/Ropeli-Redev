/**
 * checkRateLimit.js
 *
 * Caps per-user generations at DAILY_LIMIT per rolling 24h window.
 *
 * Must run AFTER requireAuth (relies on req.user.id).
 *
 * Fail-open policy: if SUPABASE_SERVICE_ROLE_KEY is missing, or the DB
 * query throws for any reason, log a warning and call next(). We never
 * block legitimate generation traffic due to infra failure.
 *
 * Returns 429 only when the user has demonstrably exceeded the cap.
 */

import { createClient } from "@supabase/supabase-js";

export const DAILY_LIMIT = 20;

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

export default async function checkRateLimit(req, res, next) {
  try {
    if (!req.user?.id) {
      // requireAuth wasn't run, or didn't attach a user. Fail-open.
      console.warn("[rate-limit] req.user.id missing — skipping check");
      return next();
    }

    const sb = getServiceClient();
    if (!sb) {
      console.warn("[rate-limit] SUPABASE_SERVICE_ROLE_KEY not set — skipping check");
      return next();
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count, error } = await sb
      .from("generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", req.user.id)
      .gte("created_at", since);

    if (error) {
      console.warn("[rate-limit] query error — failing open:", error.message);
      return next();
    }

    if ((count ?? 0) >= DAILY_LIMIT) {
      return res.status(429).json({
        error: "DAILY_LIMIT_REACHED",
        message: `You have used all ${DAILY_LIMIT} daily generations. Resets at midnight UTC.`,
      });
    }

    return next();
  } catch (err) {
    console.warn("[rate-limit] unexpected error — failing open:", err?.message || err);
    return next();
  }
}
