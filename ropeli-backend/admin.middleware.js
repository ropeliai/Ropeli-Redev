/**
 * Admin gating.
 *
 * A user is treated as admin when ANY of the following is true:
 *   - their email is listed in ADMIN_EMAILS (comma-separated)
 *   - their user_metadata.role === "admin"
 *   - their app_metadata.role === "admin"
 *
 * This middleware requires requireAuth / attachUser to have run first.
 */

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user) {
  if (!user) return false;
  const email = (user.email || "").toLowerCase();
  const allowlist = getAdminEmails();
  if (email && allowlist.includes(email)) return true;
  const role =
    user.user_metadata?.role ||
    user.app_metadata?.role ||
    user.role;
  return role === "admin";
}

export function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (!isAdminUser(user)) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
