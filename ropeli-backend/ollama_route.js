import express from "express";
import axios from "axios";
import { requireAuth } from "./auth.middleware.js";
import { requireGeneratedAccess } from "./access_policy.js";
import {
  burstLimiter,
  guestDailyLimiter,
  enforceGuestInputCaps,
} from "./rate_limit.middleware.js";

const router = express.Router();

// Configure your Ollama server URL
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "your-finetuned-model";

// POST /api/ollama/ask - Send prompt to Ollama model
router.post(
  "/ask",
  requireGeneratedAccess({ allowGuests: true }),
  burstLimiter(),
  guestDailyLimiter(),
  enforceGuestInputCaps,
  async (req, res) => {
    try {
      const { prompt } = req.body;

      if (!prompt || prompt.trim().length === 0) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const response = await axios.post(
        `${OLLAMA_API_URL}/api/generate`,
        {
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: false,
          temperature: 0.7,
          top_p: 0.9,
        },
        { timeout: 120000 }
      );

      res.json({
        success: true,
        response: response.data.response,
        model: OLLAMA_MODEL,
      });
    } catch (error) {
      console.error("Ollama API Error:", error.message);

      if (error.code === "ECONNREFUSED") {
        return res.status(503).json({
          error: "Ollama service is not running. Start it with 'ollama serve'",
          details: `Could not connect to ${OLLAMA_API_URL}`,
        });
      }

      res.status(500).json({
        error: "Failed to get response from Ollama",
        details: error.message,
      });
    }
  }
);

// POST /api/ollama/generate-code - Code generation for app builder
router.post(
  "/generate-code",
  requireGeneratedAccess({ allowGuests: true }),
  burstLimiter(),
  guestDailyLimiter(),
  enforceGuestInputCaps,
  async (req, res) => {
    try {
      const { prompt, projectConfig } = req.body;

      if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
        return res
          .status(400)
          .json({ success: false, error: "Prompt is required" });
      }

      const buildTypes = projectConfig?.buildTypes ?? [];
      const integrations = projectConfig?.integrations ?? [];
      let systemPrompt =
        "You are a code generator. Return only runnable React/TS code for a single component. " +
        "Output plain code only, no markdown fences or explanation. User request: " +
        prompt.trim();
      if (buildTypes.length > 0) {
        systemPrompt += "\nBuild type(s): " + buildTypes.join(", ");
      }
      if (integrations.length > 0) {
        systemPrompt += "\nIntegrations: " + integrations.join(", ");
      }

      const response = await axios.post(
        `${OLLAMA_API_URL}/api/generate`,
        {
          model: OLLAMA_MODEL,
          prompt: systemPrompt,
          stream: false,
          temperature: 0.5,
          top_p: 0.9,
        },
        { timeout: 120000 }
      );

      const code = response.data.response?.trim() ?? "";
      res.json({ success: true, code });
    } catch (error) {
      console.error("Ollama generate-code Error:", error.message);

      if (error.code === "ECONNREFUSED") {
        return res.status(503).json({
          success: false,
          error: "Ollama service is not running. Start it with 'ollama serve'",
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || "Failed to generate code",
      });
    }
  }
);

// POST /api/ollama/chat - Conversational format
router.post(
  "/chat",
  requireGeneratedAccess({ allowGuests: true }),
  burstLimiter(),
  guestDailyLimiter(),
  async (req, res) => {
    try {
      const { messages } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res
          .status(400)
          .json({ error: "Messages array is required" });
      }

      // Format messages for Ollama
      let prompt = "";
      for (const msg of messages) {
        const role = msg.role === "user" ? "User" : "Assistant";
        prompt += `${role}: ${msg.content}\n`;
      }
      prompt += "Assistant: ";

      const response = await axios.post(
        `${OLLAMA_API_URL}/api/generate`,
        {
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: false,
          temperature: 0.7,
          top_p: 0.9,
        },
        { timeout: 120000 }
      );

      res.json({
        success: true,
        response: response.data.response,
        model: OLLAMA_MODEL,
      });
    } catch (error) {
      console.error("Ollama Chat API Error:", error.message);

      if (error.code === "ECONNREFUSED") {
        return res.status(503).json({
          error: "Ollama service is not running",
          details: `Could not connect to ${OLLAMA_API_URL}`,
        });
      }

      res.status(500).json({
        error: "Failed to get chat response from Ollama",
        details: error.message,
      });
    }
  }
);

// GET /api/ollama/models - List available models (auth-only, ops info)
router.get("/models", requireAuth, async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_API_URL}/api/tags`);

    const models = response.data.models || [];
    res.json({
      success: true,
      currentModel: OLLAMA_MODEL,
      availableModels: models.map((m) => ({
        name: m.name,
        size: m.size,
        modifiedAt: m.modified_at,
      })),
    });
  } catch (error) {
    console.error("Ollama Models API Error:", error.message);

    res.status(500).json({
      error: "Failed to fetch models from Ollama",
      details: error.message,
    });
  }
});

// GET /api/ollama/health - Check if Ollama is running (auth-only)
router.get("/health", requireAuth, async (req, res) => {
  try {
    await axios.get(`${OLLAMA_API_URL}/api/tags`, { timeout: 5000 });
    res.json({ success: true, status: "Ollama is running" });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: "Ollama is not running",
      details: `Could not connect to ${OLLAMA_API_URL}`,
    });
  }
});

export default router;
