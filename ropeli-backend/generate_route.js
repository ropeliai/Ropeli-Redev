import express from "express";
import axios from "axios";
import OpenAI from "openai";
import { createLogger } from "./logger.js";

const log = createLogger("generate");

const router = express.Router();

const MODAL_API_URL =
  process.env.MODAL_API_URL ||
  "https://coutinhoandrew0--my-coder-model-generate.modal.run";

const MODAL_TIMEOUT_MS = 60000;

let openaiClient = null;
function getOpenAI() {
  if (!openaiClient) {
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    if (baseURL && apiKey) {
      openaiClient = new OpenAI({ baseURL, apiKey });
    }
  }
  return openaiClient;
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

async function generateWithOpenAI(userPrompt, type) {
  const client = getOpenAI();
  if (!client) throw new Error("OpenAI client not configured");

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

  const response = await client.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "";
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = extractJsonFromText(content);
  }

  if (!parsed || !Array.isArray(parsed.files)) {
    throw new Error("OpenAI did not return valid files JSON");
  }

  return { success: true, data: { files: parsed.files } };
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

router.post("/", async (req, res) => {
  try {
    const { prompt, type: rawType, existingFiles } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const type = rawType === "web" ? "web" : "native";
    const trimmedPrompt = prompt.trim();

    const webInstruction =
      "IMPORTANT: Generate a React WEB app only. Use div, button, input, h1, p, ul, li - standard HTML elements only. Use inline styles or a styles object with standard CSS. Do NOT use View, Text, StyleSheet, TouchableOpacity, FlatList, react-native, expo, NavigationContainer, or any mobile library. The code must run in a browser with no dependencies except React.";
    const nativeInstruction =
      "IMPORTANT: Generate an Expo React Native MOBILE app only. Use React Native components (View, Text, TextInput, Button, TouchableOpacity, FlatList, ScrollView) and Expo-compatible libraries only. Do NOT use localStorage, sessionStorage, window, document, ReactDOM, react-router-dom, HTML tags (div/button/input), or any browser-only API. The app must run in Expo Go. For data persistence use AsyncStorage from @react-native-async-storage/async-storage, never localStorage or sessionStorage. Always import AsyncStorage like this: import AsyncStorage from '@react-native-async-storage/async-storage' — never use destructured { AsyncStorage }. Always import React like this: import React, { useState, useEffect } from 'react' at the top of every file. Never use localStorage, sessionStorage, document, window, or ReactDOM in React Native code. Keep dependencies minimal and compatible with Expo.";

    let modalPrompt;
    if (existingFiles && Array.isArray(existingFiles) && existingFiles.length > 0) {
      const filesContext = existingFiles
        .map((f) => `--- ${f.path} ---\n${(f.content ?? "").slice(0, 50000)}`)
        .join("\n\n");
      modalPrompt =
        type === "web"
          ? `${webInstruction}\n\nHere are the existing files:\n\n${filesContext}\n\nThe user wants to: ${trimmedPrompt}\n\nReturn the complete updated files.`
          : `${nativeInstruction}\n\nHere are the existing files:\n\n${filesContext}\n\nThe user wants to: ${trimmedPrompt}\n\nReturn the complete updated files.`;
    } else {
      modalPrompt =
        type === "web"
          ? `${webInstruction}\n\nUser request: ${trimmedPrompt}`
          : `${nativeInstruction}\n\nUser request: ${trimmedPrompt}`;
    }

    let responseData = null;
    let usedProvider = null;

    // Try Modal first
    try {
      log.info("Trying Modal API");
      const modalResponse = await callModal(modalPrompt);
      const { success, data } = modalResponse.data;
      if (success && data && Array.isArray(data.files)) {
        responseData = { success, data };
        usedProvider = "modal";
        log.info("Modal API succeeded");
      } else {
        throw new Error("Invalid Modal response structure");
      }
    } catch (modalErr) {
      log.warn("Modal API failed — trying OpenAI fallback", {
        err: modalErr.message,
      });

      try {
        const openAIPrompt = existingFiles && existingFiles.length > 0
          ? `${trimmedPrompt}\n\nExisting files context:\n${existingFiles.map(f => `--- ${f.path} ---\n${(f.content ?? "").slice(0, 30000)}`).join("\n\n")}`
          : trimmedPrompt;

        responseData = await generateWithOpenAI(openAIPrompt, type);
        usedProvider = "openai";
        log.info("OpenAI fallback succeeded");
      } catch (openAIErr) {
        log.error("OpenAI fallback also failed", { err: openAIErr.message });
        return res.status(502).json({
          error: "Generation failed",
          details: `Modal: ${modalErr.message} | OpenAI: ${openAIErr.message}`,
        });
      }
    }

    let files = Array.isArray(responseData.data.files) ? responseData.data.files : [];

    if (type === "native") {
      files = sanitizeMobileFiles(files);

      if (hasForbiddenNativeCode(files) && usedProvider === "openai") {
        log.warn("Banned mobile patterns found — requesting OpenAI correction");
        try {
          const correctionPrompt =
            `Fix this React Native app so it runs in Expo Go. Remove all browser APIs (localStorage, window, document, ReactDOM). Use @react-native-async-storage/async-storage for storage.\n\nUser request: ${trimmedPrompt}\n\nCurrent broken files:\n${files.map(f => `--- ${f.path} ---\n${String(f.content ?? "").slice(0, 30000)}`).join("\n\n")}`;
          const fixResp = await generateWithOpenAI(correctionPrompt, type);
          if (Array.isArray(fixResp.data.files)) {
            files = sanitizeMobileFiles(fixResp.data.files);
          }
        } catch (e) {
          log.error("OpenAI correction retry failed", { err: e.message });
        }
      }
    }

    const project_name = deriveProjectNameFromPrompt(trimmedPrompt);
    res.json({ success: true, project_name, files, provider: usedProvider });
  } catch (error) {
    log.error("Unexpected error", { err: error.message });
    res.status(500).json({ error: "Failed to generate app", details: error.message });
  }
});

export default router;
