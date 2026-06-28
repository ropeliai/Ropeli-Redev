/**
 * checkRateLimit.js
 *
 * Tier-based per-user daily generation cap (rolling 24h window).
 *
 * Must run AFTER requireAuth (relies on req.user.id and req.user.email).
 *
 * Fail-open policy: if Supabase is unreachable, or the profiles row is
 * missing, the user is treated as "free" tier and the check still runs.
 * If the generations count query itself throws, we fail-open and let the
 * request through — we never block on infrastructure failure.
 *
 * Admin emails (ADMIN_EMAILS env, comma-separated) bypass all limits.
 *
 * Returns 429 only when the user has demonstrably exceeded their tier cap.
 */

import { createClient } from "@supabase/supabase-js";

// Tier limits — raise these without redeploying by adding tier-specific env overrides
const LIMITS = {
  free: 1,
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

    // Admin bypass — ADMIN_EMAILS is a comma-separated list in .env
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (req.user.email && adminEmails.includes(req.user.email)) {
      return next();
    }

    // Resolve plan — fail-open if profiles row is missing (defaults to free)
    let plan = "free";
    const { data: profile } = await sb
      .from("profiles")
      .select("plan")
      .eq("id", req.user.id)
      .maybeSingle();
    if (profile?.plan) plan = profile.plan;

    const dailyLimit = LIMITS[plan] ?? LIMITS.free;

    // Count generations in the last 24h
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

    if ((count ?? 0) >= dailyLimit) {
      return res.status(429).json({
        error: "DAILY_LIMIT_REACHED",
        message: `You have used all ${dailyLimit} daily generation${dailyLimit === 1 ? "" : "s"}. Resets at midnight UTC.`,
        plan,
        limit: dailyLimit,
        upgrade_required: plan === "free",
      });
    }

    return next();
  } catch (err) {
    console.warn("[rate-limit] unexpected error — failing open:", err?.message || err);
    return next();
  }
}
