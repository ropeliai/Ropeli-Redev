/**
 * Operational routes (token-gated; no Supabase in this stack).
 * GET /api/ops/errors/recent — ring buffer (header X-Ops-Token must match OPS_ERRORS_TOKEN).
 */

import express from "express";
import { getRecentErrors } from "./error_monitor.js";

const router = express.Router();

function requireOpsToken(req, res, next) {
  const expected = process.env.OPS_ERRORS_TOKEN?.trim();
  if (!expected) {
    return res.status(503).json({
      error: "Error buffer endpoint disabled (set OPS_ERRORS_TOKEN)",
    });
  }
  const header =
    req.headers["x-ops-token"] ||
    (typeof req.headers.authorization === "string"
      ? req.headers.authorization.replace(/^Bearer\s+/i, "").trim()
      : "");
  if (header !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.get("/errors/recent", requireOpsToken, (_req, res) => {
  const errors = getRecentErrors();
  res.json({ errors, count: errors.length });
});

export default router;
