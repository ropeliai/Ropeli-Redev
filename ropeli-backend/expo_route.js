import express from "express";
import { startExpo, stopExpo, getExpoStatus } from "./expo_runner.js";
import { requireAuth } from "./auth.middleware.js";
import { burstLimiter } from "./rate_limit.middleware.js";

const router = express.Router();

// All Expo endpoints require an authenticated user — starting a tunnel is
// expensive and must never run for anonymous traffic, regardless of the
// guest-generation policy.
router.use(requireAuth);
router.use(burstLimiter());

router.post("/start", async (req, res) => {
  try {
    const { project_id, files } = req.body || {};
    if (!project_id) {
      return res.status(400).json({ error: "project_id is required" });
    }
    const result = await startExpo(project_id, files || []);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: "Failed to start expo",
      details: err?.message ?? String(err),
    });
  }
});

router.post("/stop", (req, res) => {
  try {
    const { project_id } = req.body || {};
    if (project_id) stopExpo(project_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({
      error: "Failed to stop expo",
      details: err?.message ?? String(err),
    });
  }
});

router.get("/status/:projectId", async (req, res) => {
  try {
    const status = await getExpoStatus(req.params.projectId);
    res.json(status);
  } catch (err) {
    res.json({ running: false, metroReachable: false });
  }
});

export default router;
