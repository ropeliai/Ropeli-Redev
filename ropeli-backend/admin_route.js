import express from "express";
import { requireAuth, isAuthConfigured } from "./auth.middleware.js";
import { requireAdmin } from "./admin.middleware.js";
import { ACCESS_POLICY } from "./access_policy.js";
import { stopExpo, getExpoStatus } from "./expo_runner.js";

const router = express.Router();

// Every admin endpoint requires both a valid session AND admin privileges.
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/ping - basic liveness check for operators
router.get("/ping", (req, res) => {
  res.json({
    ok: true,
    user: {
      id: req.user.id,
      email: req.user.email,
    },
    authConfigured: isAuthConfigured(),
    policy: ACCESS_POLICY,
  });
});

// GET /api/admin/policy - current runtime access policy
router.get("/policy", (_req, res) => {
  res.json({ policy: ACCESS_POLICY });
});

// GET /api/admin/expo/status/:projectId - inspect an Expo tunnel
router.get("/expo/status/:projectId", async (req, res) => {
  try {
    const status = await getExpoStatus(req.params.projectId);
    res.json(status);
  } catch (err) {
    res.status(500).json({
      error: "Failed to read Expo status",
      details: err?.message ?? String(err),
    });
  }
});

// POST /api/admin/expo/stop - forcibly stop an Expo tunnel for a project
router.post("/expo/stop", (req, res) => {
  try {
    const { project_id } = req.body || {};
    if (!project_id) {
      return res.status(400).json({ error: "project_id is required" });
    }
    stopExpo(project_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({
      error: "Failed to stop Expo",
      details: err?.message ?? String(err),
    });
  }
});

export default router;
