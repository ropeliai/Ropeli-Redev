/**
 * checkRateLimit.js
 *
 * Caps per-user generations by plan tier per rolling 24h window.
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

export const LIMITS = {
  free: 2,
  pro: 50,
  unlimited: 999999,
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

export default async function checkRateLimit(req, res, next) {
  try {
    if (!req.user?.id) {
      console.warn("[rate-limit] req.user.id missing — skipping check");
      return next();
    }

    const sb = getServiceClient();
    if (!sb) {
      console.warn("[rate-limit] SUPABASE_SERVICE_ROLE_KEY not set — skipping check");
      return next();
    }

    let plan = "free";
    try {
      const { data: profile } = await sb
        .from("profiles")
        .select("plan")
        .eq("id", req.user.id)
        .single();
      plan = profile?.plan || "free";
    } catch (profileErr) {
      console.warn("[rate-limit] profile lookup failed — defaulting to free:", profileErr?.message);
    }

    const DAILY_LIMIT = LIMITS[plan] ?? LIMITS.free;

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
        plan,
        limit: DAILY_LIMIT,
        message:
          plan === "free"
            ? "Free accounts get 2 generations per day. Upgrade to Pro for 50/day."
            : `You have used all ${DAILY_LIMIT} daily generations. Resets at midnight UTC.`,
        upgrade_required: plan === "free",
      });
    }

    return next();
  } catch (err) {
    console.warn("[rate-limit] unexpected error — failing open:", err?.message || err);
    return next();
  }
}
