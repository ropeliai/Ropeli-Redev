import { URL } from "url";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

const TOKEN_CACHE = new Map();
const TOKEN_CACHE_TTL_MS = 60 * 1000;
const TOKEN_CACHE_MAX_ENTRIES = 5000;

function pruneCache() {
  if (TOKEN_CACHE.size <= TOKEN_CACHE_MAX_ENTRIES) return;
  const now = Date.now();
  for (const [key, value] of TOKEN_CACHE) {
    if (value.expiresAt <= now) TOKEN_CACHE.delete(key);
  }
  if (TOKEN_CACHE.size > TOKEN_CACHE_MAX_ENTRIES) {
    const overflow = TOKEN_CACHE.size - TOKEN_CACHE_MAX_ENTRIES;
    let removed = 0;
    for (const key of TOKEN_CACHE.keys()) {
      TOKEN_CACHE.delete(key);
      if (++removed >= overflow) break;
    }
  }
}

function extractToken(req) {
  const header =
    req.headers?.authorization || req.headers?.Authorization || "";
  if (typeof header === "string" && header.length > 0) {
    const parts = header.split(" ");
    if (parts.length === 2 && /^Bearer$/i.test(parts[0]) && parts[1]) {
      return parts[1].trim();
    }
  }
  const alt = req.headers?.["x-supabase-auth"];
  if (typeof alt === "string" && alt.trim().length > 0) {
    return alt.trim();
  }
  return null;
}

async function verifyTokenWithSupabase(token) {
  if (!token) return null;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      "[auth] SUPABASE_URL or SUPABASE_ANON_KEY not configured — cannot verify tokens."
    );
    return null;
  }

  const cached = TOKEN_CACHE.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  try {
    const endpoint = new URL("/auth/v1/user", SUPABASE_URL).toString();
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const user = await res.json();
    if (!user || !user.id) return null;
    TOKEN_CACHE.set(token, {
      user,
      expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
    });
    pruneCache();
    return user;
  } catch (err) {
    console.warn("[auth] Supabase token verification failed:", err?.message || err);
    return null;
  }
}

export async function attachUser(req, _res, next) {
  try {
    const token = extractToken(req);
    if (token) {
      const user = await verifyTokenWithSupabase(token);
      if (user) {
        req.user = user;
        req.authToken = token;
      }
    }
  } catch (err) {
    console.warn("[auth] attachUser error:", err?.message || err);
  }
  next();
}

export async function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const user = await verifyTokenWithSupabase(token);
  if (!user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  req.user = user;
  req.authToken = token;
  next();
}

export function isAuthConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
