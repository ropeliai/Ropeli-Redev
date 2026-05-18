/**
 * requireAuth.js
 *
 * Express middleware that validates a Supabase Bearer JWT from the
 * Authorization header. On success it attaches the verified user to
 * req.user and calls next(). On failure it returns a structured 401.
 *
 * Required env:
 *   SUPABASE_URL      — Supabase project URL
 *   SUPABASE_ANON_KEY — Supabase anon key (used only for token validation)
 *
 * This middleware NEVER throws — every error path is caught and converted
 * to a 401 response with a stable error code that the frontend can switch on.
 */

import { createClient } from "@supabase/supabase-js";

function extractBearer(authHeader) {
  if (!authHeader || typeof authHeader !== "string") return null;
  const trimmed = authHeader.trim();
  if (trimmed.toLowerCase().startsWith("bearer ")) {
    const t = trimmed.slice(7).trim();
    return t || null;
  }
  return trimmed || null;
}

export default async function requireAuth(req, res, next) {
  try {
    const token = extractBearer(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: "TOKEN_MISSING" });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[requireAuth] SUPABASE_URL or SUPABASE_ANON_KEY missing");
      return res.status(401).json({ error: "TOKEN_INVALID" });
    }

    // Fresh client per request — required because the request-scoped
    // Authorization header is set in the client config below.
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "TOKEN_INVALID" });
    }

    req.user = data.user;
    return next();
  } catch (err) {
    console.error("[requireAuth] unexpected error:", err?.message || err);
    return res.status(401).json({ error: "TOKEN_INVALID" });
  }
}
