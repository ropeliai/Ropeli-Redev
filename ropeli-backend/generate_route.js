import express from "express";
import axios from "axios";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { enhancePromptForGeneration } from "./prompt_enhancer.js";
import requireAuth from "./middleware/requireAuth.js";
import checkRateLimit from "./middleware/checkRateLimit.js";

const router = express.Router();

// ── Supabase service client (used only to log generations for rate limiting) ──
let supabaseServiceClient = null;
function getSupabaseServiceClient() {
  if (supabaseServiceClient) return supabaseServiceClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabaseServiceClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseServiceClient;
}

/**
 * Fire-and-forget insert into generations table. Never awaited, never throws.
 * If SUPABASE_SERVICE_ROLE_KEY is missing, this is a silent no-op.
 */
function recordGeneration(userId) {
  if (!userId) return;
  const sb = getSupabaseServiceClient();
  if (!sb) return;
  sb.from("generations")
    .insert({ user_id: userId, created_at: new Date().toISOString() })
    .then(({ error }) => {
      if (error) console.warn("[rate-limit] insert failed:", error.message);
    });
}

const MODAL_API_URL =
  process.env.MODAL_API_URL ||
  "https://coutinhoandrew0--my-coder-model-generate.modal.run";

const MODAL_TIMEOUT_MS = 60000;

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

let groqClient = null;
function getGroq() {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      groqClient = new OpenAI({
        baseURL: "https://api.groq.com/openai/v1",
        apiKey,
      });
    }
  }
  return groqClient;
}

const BANNED_MOBILE = [
  "localStorage",
  "sessionStorage",
  "document.",
  "window.",
  "ReactDOM",
  "getElementById",
  "querySelector",
];

function sanitizeMobileFiles(files) {
  return files.map((file) => {
    let content = file.content
      .replace(
        /localStorage\.(getItem|setItem|removeItem|clear)\([^)]*\)/g,
        "/* localStorage removed */"
      )
      .replace(/document\.\w+/g, "/* document API removed */")
      .replace(/window\.\w+/g, "/* window API removed */")
      .replace(/import ReactDOM from ['"]react-dom['"]/g, "")
      .replace(/ReactDOM\.render\([^;]+;/g, "");

    content = content.replace(
      /import\s*\{\s*AsyncStorage\s*\}\s*from\s*['"]@react-native-async-storage\/async-storage['"]/g,
      "import AsyncStorage from '@react-native-async-storage/async-storage'"
    );

    return { ...file, content };
  });
}

function hasForbiddenNativeCode(files) {
  if (!Array.isArray(files)) return false;
  return files.some((f) => {
    const c = String(f?.content || "");
    return BANNED_MOBILE.some((b) => c.includes(b));
  });
}

function deriveProjectNameFromPrompt(prompt) {
  const trimmed = String(prompt || "").trim();
  const words = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 3);
  if (words.length === 0) return "my-app";
  return `${words.join("-")}-app`;
}

function extractJsonFromText(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }
  return null;
}

async function callModal(prompt, retryCount = 0) {
  const response = await axios.post(
    MODAL_API_URL,
    { prompt },
    { timeout: MODAL_TIMEOUT_MS }
  );
  return response;
}

function buildJsonGenerationMessages(userPrompt, type) {
  const webInstruction = `You are a code generator. Generate a React WEB app. Use only standard HTML elements (div, button, input, h1, p, ul, li) and inline styles or a styles object. Do NOT use any React Native or mobile libraries. The code must run in a browser with only React as a dependency.`;

  const nativeInstruction = `You are a code generator. Generate an Expo React Native MOBILE app. Use only React Native components (View, Text, TextInput, Button, TouchableOpacity, FlatList, ScrollView) and Expo-compatible libraries. Do NOT use browser APIs like localStorage, sessionStorage, window, document, ReactDOM, or HTML tags. For storage use AsyncStorage from @react-native-async-storage/async-storage. Always import React like: import React, { useState, useEffect } from 'react'. Always import AsyncStorage like: import AsyncStorage from '@react-native-async-storage/async-storage' (never destructured).`;

  const systemPrompt =
    type === "web" ? webInstruction : nativeInstruction;

  const userMessage = `${userPrompt}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation, just the JSON):
{
  "files": [
    {"path": "App.js", "content": "...full file content..."},
    {"path": "components/MyComponent.js", "content": "...full file content..."}
  ]
}`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];
}

function parseFilesJsonResponse(content, label) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = extractJsonFromText(content);
  }

  if (!parsed || !Array.isArray(parsed.files)) {
    throw new Error(`${label} did not return valid files JSON`);
  }

  return { success: true, data: { files: parsed.files } };
}

async function generateWithGroq(userPrompt, type) {
  const client = getGroq();
  if (!client) throw new Error("GROQ_API_KEY not set");

  const messages = buildJsonGenerationMessages(userPrompt, type);

  const response = await client.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: 8192,
    messages,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "";
  return parseFilesJsonResponse(content, "Groq");
}

router.post("/warmup", (_req, res) => {
  res.status(200).json({ warmed: true });
  axios
    .post(
      MODAL_API_URL,
      { prompt: "Hello. Return a minimal app with one file." },
      { timeout: 10000 }
    )
    .catch(() => {});
});

router.post("/", requireAuth, checkRateLimit, async (req, res) => {
  try {
    const { prompt, type: rawType, existingFiles } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const type = rawType === "web" ? "web" : "native";
    const trimmedPrompt = prompt.trim();

    const { enhancedIntent } = enhancePromptForGeneration({
      rawPrompt: trimmedPrompt,
      type,
      hasExistingFiles: Boolean(
        existingFiles && Array.isArray(existingFiles) && existingFiles.length > 0
      ),
    });

    const webInstruction =
      "IMPORTANT: Generate a React WEB app only. Use div, button, input, h1, p, ul, li - standard HTML elements only. Use inline styles or a styles object with standard CSS. Do NOT use View, Text, StyleSheet, TouchableOpacity, FlatList, react-native, expo, NavigationContainer, or any mobile library. The code must run in a browser with no dependencies except React.";
    const nativeInstruction =
      "IMPORTANT: Generate an Expo React Native MOBILE app only. Use React Native components (View, Text, TextInput, Button, TouchableOpacity, FlatList, ScrollView) and Expo-compatible libraries only. Do NOT use localStorage, sessionStorage, window, document, ReactDOM, react-router-dom, HTML tags (div/button/input), or any browser-only API. The app must run in Expo Go. For data persistence use AsyncStorage from @react-native-async-storage/async-storage, never localStorage or sessionStorage. Always import AsyncStorage like this: import AsyncStorage from '@react-native-async-storage/async-storage' — never use destructured { AsyncStorage }. Always import React like this: import React, { useState, useEffect } from 'react' at the top of every file. Never use localStorage, sessionStorage, document, window, or ReactDOM in React Native code. Keep dependencies minimal and compatible with Expo.";

    let fullPrompt;
    if (existingFiles && Array.isArray(existingFiles) && existingFiles.length > 0) {
      const filesContext = existingFiles
        .map((f) => `--- ${f.path} ---\n${(f.content ?? "").slice(0, 50000)}`)
        .join("\n\n");
      fullPrompt =
        type === "web"
          ? `${webInstruction}\n\nHere are the existing files:\n\n${filesContext}\n\nThe user wants to:\n${enhancedIntent}\n\nReturn the complete updated files.`
          : `${nativeInstruction}\n\nHere are the existing files:\n\n${filesContext}\n\nThe user wants to:\n${enhancedIntent}\n\nReturn the complete updated files.`;
    } else {
      fullPrompt =
        type === "web"
          ? `${webInstruction}\n\nUser request:\n${enhancedIntent}`
          : `${nativeInstruction}\n\nUser request:\n${enhancedIntent}`;
    }

    let responseData = null;
    let usedProvider = null;

    try {
      console.log("[generate] Trying Groq...");
      responseData = await generateWithGroq(fullPrompt, type);
      usedProvider = "groq";
      console.log("[generate] Groq succeeded");
    } catch (groqErr) {
      console.warn(
        "[generate] Groq failed:",
        groqErr.message,
        "— trying Modal fallback..."
      );

      try {
        const modalResponse = await callModal(fullPrompt);
        const { success, data } = modalResponse.data;
        if (success && data && Array.isArray(data.files)) {
          responseData = { success, data };
          usedProvider = "modal";
          console.log("[generate] Modal fallback succeeded");
        } else {
          throw new Error("Invalid Modal response structure");
        }
      } catch (modalErr) {
        console.error(
          "[generate] Modal fallback also failed:",
          modalErr.message
        );
        return res.status(502).json({
          error: "Generation failed",
          details: `Groq: ${groqErr.message} | Modal: ${modalErr.message}`,
        });
      }
    }

    let files = Array.isArray(responseData.data.files) ? responseData.data.files : [];

    if (type === "native") {
      files = sanitizeMobileFiles(files);

      if (hasForbiddenNativeCode(files) && usedProvider === "groq") {
        console.warn(
          "[generate] Banned mobile patterns found — requesting Groq correction..."
        );
        const correctionPrompt =
          `Fix this React Native app so it runs in Expo Go. Remove all browser APIs (localStorage, window, document, ReactDOM). Use @react-native-async-storage/async-storage for storage.\n\nUser request: ${trimmedPrompt}\n\nCurrent broken files:\n${files.map(f => `--- ${f.path} ---\n${String(f.content ?? "").slice(0, 30000)}`).join("\n\n")}`;
        try {
          const fixResp = await generateWithGroq(correctionPrompt, type);
          if (Array.isArray(fixResp.data.files)) {
            files = sanitizeMobileFiles(fixResp.data.files);
          }
        } catch (e) {
          console.error("[generate] Groq correction retry failed:", e.message);
        }
      }
    }

    const project_name = deriveProjectNameFromPrompt(trimmedPrompt);
    recordGeneration(req.user?.id);
    res.json({ success: true, project_name, files, provider: usedProvider });
  } catch (error) {
    console.error("[generate] Unexpected error:", error.message);
    res.status(500).json({ error: "Failed to generate app", details: error.message });
  }
});

export default router;
