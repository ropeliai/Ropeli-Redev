/**
 * Deployment flavor for logs and health.
 *
 * Set explicitly on Render staging: APP_ENV=staging
 */

export function getAppEnv() {
  const raw = (process.env.APP_ENV || "").trim().toLowerCase();
  if (raw === "staging" || raw === "production" || raw === "development") {
    return raw;
  }
  if (process.env.NODE_ENV === "production") return "production";
  return "development";
}
