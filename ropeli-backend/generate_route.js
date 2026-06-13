import express from "express";
import axios from "axios";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { enhancePromptForGeneration } from "./prompt_enhancer.js";
import { gradeAndImprove } from "./gradeAndImprove.js";
import {
  postProcessWebFiles,
  getGroqModelForType,
  sanitizeWebFiles,
} from "./webPostProcess.js";
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
const GROQ_TIMEOUT_MS = 85000;

/**
 * Typed error used to short-circuit the generate handler and map the failure
 * to a client-safe HTTP status without leaking SDK internals.
 *   kind: "timeout" | "rate_limited" | "upstream"
 */
class GroqCallError extends Error {
  constructor(kind, message, { retryAfter = null } = {}) {
    super(message);
    this.name = "GroqCallError";
    this.kind = kind;
    this.retryAfter = retryAfter;
  }
}

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

const WEB_SYSTEM_PROMPT = `You are a code generator. Generate a complete, working React WEB app only.

TECH RULES:
- Use ONLY standard HTML elements: div, button, input, textarea, select, h1–h6, p, ul, li, span, img, form, label
- Use React hooks: useState, useEffect, useCallback, useMemo
- Use inline styles or a single styles object with standard CSS properties (camelCase)
- Use localStorage for persistence if the user's app needs it
- NEVER use: View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, react-native, expo, AsyncStorage, NavigationContainer, or any mobile library
- NEVER import CSS files — no import of App.css or any .css file. Use inline styles or a styles object only
- Prefer a single App.js file with all UI and logic; add at most 2 extra .js files only if the app truly needs them (max 3 files total)
- App.js is required and is the main component Sandpack loads
- Every file must be valid JavaScript/JSX: balanced quotes, brackets, and parentheses — no stray apostrophes in arrays or after semicolons
- Every component must have a default export
- The app must run in a browser with only React as a dependency — no npm imports beyond React

UI QUALITY RULES — mandatory for every component:
- Every app must have a visible header with a title
- Buttons must have visible background colour, padding (at least 8px 16px), border-radius (at least 6px), and a text label
- Every list must handle the empty state — show a message like "No items yet" when the list is empty
- Every input must have a visible placeholder or label
- Use a clean, minimal colour palette — white/light background, one accent colour for buttons
- NEVER leave an onClick handler empty: onClick={() => {}} is FORBIDDEN — every button must do something

LOGIC INVARIANTS — copy these patterns exactly:

Add item pattern:
const handleAdd = () => {
  if (!inputText.trim()) return;
  const newItem = { id: Date.now().toString(), text: inputText.trim(), done: false };
  setItems(prev => [...prev, newItem]);
  setInputText('');
};

Delete item pattern:
const handleDelete = (id) => {
  setItems(prev => prev.filter(item => item.id !== id));
};

Toggle item pattern:
const handleToggle = (id) => {
  setItems(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
};

RULES:
- Every Add action MUST use setItems(prev => [...prev, newItem]) — never setItems([...items, newItem])
- Every Delete MUST filter by id — never by index
- Never mutate state directly`;

const PWA_SYSTEM_PROMPT = `You are a code generator. Generate a complete, working, single-file PWA (Progressive Web App) as one self-contained index.html file.

CRITICAL RULES:
- Output MUST be a single index.html file with all CSS in a <style> tag and all JS in a <script> tag
- NEVER output multiple files
- NEVER use React, Vue, Angular, or any JS framework
- NEVER use import or require statements
- NEVER reference external files — everything must be inline
- Use CDN links only for libraries (Chart.js, etc.) if genuinely needed
- The app must work by opening index.html directly in a browser with no build step

MOBILE-FIRST DESIGN — mandatory:
- viewport meta tag: <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
- All touch targets minimum 44px height
- Font size minimum 15px for body text
- No hover-only interactions — everything must work on touch
- Safe area padding for phones: padding-bottom: env(safe-area-inset-bottom)
- Max content width 480px centered on larger screens

UI QUALITY — mandatory:
- Every app must have a visible header with the app name
- Primary action buttons: background #4361EE, color white, border-radius 12px, padding 14px 24px, font-weight 600, width 100%
- Secondary buttons: border 1.5px solid #4361EE, color #4361EE, same padding, transparent background
- Inputs: border 1px solid #E2E8F0, border-radius 10px, padding 12px 14px, font-size 15px, width 100%
- Cards/list items: background white, border-radius 10px, padding 16px, margin-bottom 8px, box-shadow 0 1px 3px rgba(0,0,0,0.08)
- Page background: #F8F9FA
- Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- Every list must show "No items yet" when empty
- Every button must do something — no empty onclick handlers

PWA REQUIREMENTS — include in every output:
- <link rel="manifest" href="manifest.json"> in the head
- <meta name="theme-color" content="#4361EE"> in the head
- Register service worker at bottom of script: if('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js'); }

DATA PERSISTENCE:
- Use localStorage for all data persistence
- Load from localStorage on page load
- Save to localStorage on every change
- Pattern: const data = JSON.parse(localStorage.getItem('key') || '[]');

LOGIC INVARIANTS — copy these patterns exactly:

Add item:
function handleAdd() {
  const text = inputEl.value.trim();
  if (!text) return;
  const item = { id: Date.now().toString(), text };
  items.push(item);
  save();
  render();
  inputEl.value = '';
}

Delete item:
function handleDelete(id) {
  items = items.filter(i => i.id !== id);
  save();
  render();
}

Save to localStorage:
function save() {
  localStorage.setItem('items', JSON.stringify(items));
}

Load from localStorage:
let items = JSON.parse(localStorage.getItem('items') || '[]');

Render pattern:
function render() {
  const list = document.getElementById('list');
  if (items.length === 0) {
    list.innerHTML = '<p class="empty">No items yet</p>';
    return;
  }
  list.innerHTML = items.map(item => \`
    <div class="card">
      <span>\${item.text}</span>
      <button onclick="handleDelete('\${item.id}')">Delete</button>
    </div>
  \`).join('');
}

NAVIGATION (for multi-screen apps):
- Use show/hide divs for screen navigation — no router needed
- Each screen is a div with id="screen-name"
- Show/hide with: el.style.display = 'flex' / 'none'
- Keep a currentScreen variable to track state

OUTPUT FORMAT:
Return ONLY a valid JSON object:
{
  "files": [
    {
      "path": "index.html",
      "content": "<!DOCTYPE html>..."
    },
    {
      "path": "manifest.json", 
      "content": "{...}"
    },
    {
      "path": "sw.js",
      "content": "..."
    }
  ],
  "project_name": "descriptive-app-name"
}

The index.html must be complete and fully functional. Do not truncate. Do not add placeholders.`;

const NATIVE_SYSTEM_PROMPT = `You are a code generator. Generate an Expo React Native MOBILE app only. Use React Native components (View, Text, TextInput, Button, TouchableOpacity, FlatList, ScrollView) and Expo-compatible libraries only. Do NOT use localStorage, sessionStorage, window, document, ReactDOM, react-router-dom, HTML tags (div/button/input), or any browser-only API. The app must run in Expo Go. For data persistence use AsyncStorage from @react-native-async-storage/async-storage, never localStorage or sessionStorage. Always import AsyncStorage like this: import AsyncStorage from '@react-native-async-storage/async-storage' — never use destructured { AsyncStorage }. Always import React like this: import React, { useState, useEffect } from 'react' at the top of every file. Keep dependencies minimal and compatible with Expo.

UI QUALITY RULES — mandatory for every screen file:
- Use StyleSheet.create() for ALL styles. Never put style objects directly on JSX elements.
- Every screen must have: a header (title Text or navigation header), a body area (ScrollView or FlatList), and at least one primary action button.
- Buttons must have: backgroundColor, borderRadius (minimum 8), paddingVertical (minimum 12), paddingHorizontal (minimum 20), and visible text.
- Every FlatList must include: keyExtractor={(item) => item.id}, renderItem, and ListEmptyComponent that shows a non-empty message.
- Every onPress must call a state setter, navigate to a screen, or call an async function. Empty onPress={() => {}} is FORBIDDEN.
- NEVER nest a FlatList or ScrollView inside a plain ScrollView with the same orientation.

LOGIC INVARIANTS — copy these patterns exactly:

Add item pattern:
const handleAdd = () => {
  if (!inputText.trim()) return;
  const newItem = { id: Date.now().toString(), text: inputText.trim() };
  setItems(prev => [...prev, newItem]);
  setInputText('');
  AsyncStorage.setItem('items', JSON.stringify([...items, newItem]));
};

Delete item pattern:
const handleDelete = (id) => {
  setItems(prev => prev.filter(item => item.id !== id));
  AsyncStorage.getItem('items').then(stored => {
    const updated = (JSON.parse(stored || '[]')).filter(item => item.id !== id);
    AsyncStorage.setItem('items', JSON.stringify(updated));
  });
};

RULES:
- Every Add button MUST use setItems(prev => [...prev, newItem]) — never setItems([...items, newItem])
- Every Delete MUST filter by id — never by index
- Every AsyncStorage.setItem call MUST also update local state`;

function buildJsonGenerationMessages(userContent, type) {
  const systemPrompt = type === "pwa" ? PWA_SYSTEM_PROMPT : type === "web" ? WEB_SYSTEM_PROMPT : NATIVE_SYSTEM_PROMPT;

  const userMessage = `${userContent}

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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  let response;
  try {
    response = await client.chat.completions.create(
      {
        model: getGroqModelForType(type),
        max_tokens: 8192,
        messages,
        response_format: { type: "json_object" },
      },
      { signal: controller.signal }
    );
  } catch (err) {
    if (err?.name === "AbortError" || controller.signal.aborted) {
      throw new GroqCallError("timeout", `Groq call exceeded ${GROQ_TIMEOUT_MS}ms`);
    }
    const status = err?.status ?? err?.response?.status;
    if (status === 429) {
      throw new GroqCallError("rate_limited", "Groq rate limited", { retryAfter: 60 });
    }
    if (typeof status === "number" && status >= 500) {
      throw new GroqCallError("upstream", `Groq ${status}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

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

    // Build the user-turn content only — instructions live in the system role
    // inside buildJsonGenerationMessages (WEB_SYSTEM_PROMPT / NATIVE_SYSTEM_PROMPT).
    let userContent;
    if (existingFiles && Array.isArray(existingFiles) && existingFiles.length > 0) {
      const filesContext = existingFiles
        .map((f) => `--- ${f.path} ---\n${(f.content ?? "").slice(0, 50000)}`)
        .join("\n\n");
      userContent = `Here are the existing files:\n\n${filesContext}\n\nThe user wants to:\n${enhancedIntent}\n\nReturn the complete updated files.`;
    } else {
      userContent = `User request:\n${enhancedIntent}`;
    }

    // Modal receives a single raw string — prepend the system prompt for it.
    const modalPrompt = `${type === "pwa" ? PWA_SYSTEM_PROMPT : type === "web" ? WEB_SYSTEM_PROMPT : NATIVE_SYSTEM_PROMPT}\n\n${userContent}`;    
    let responseData = null;
    let usedProvider = null;

    try {
      console.log("[generate] Trying Groq...");
      responseData = await generateWithGroq(userContent, type);
      usedProvider = "groq";
      console.log("[generate] Groq succeeded");
    } catch (groqErr) {
      // Surface typed Groq errors with the right HTTP code BEFORE falling back
      // to Modal — a timeout or rate-limit should not silently switch providers.
      if (groqErr instanceof GroqCallError) {
        if (groqErr.kind === "timeout") {
          return res.status(504).json({
            error: "GENERATION_TIMEOUT",
            message: "Generation took too long. Please try again.",
          });
        }
        if (groqErr.kind === "rate_limited") {
          return res.status(503).json({
            error: "PROVIDER_RATE_LIMITED",
            message: "AI provider is busy. Please try again in 60 seconds.",
            retry_after: groqErr.retryAfter ?? 60,
          });
        }
        if (groqErr.kind === "upstream") {
          return res.status(503).json({
            error: "PROVIDER_UNAVAILABLE",
            message: "AI provider is temporarily unavailable.",
          });
        }
      }

      console.warn(
        "[generate] Groq failed:",
        groqErr.message,
        "— trying Modal fallback..."
      );

      try {
        const modalResponse = await callModal(modalPrompt);
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
        // axios timeout shows up as ECONNABORTED / "timeout of Xms exceeded".
        const isTimeout =
          modalErr?.code === "ECONNABORTED" ||
          /timeout/i.test(modalErr?.message || "");
        if (isTimeout) {
          return res.status(504).json({
            error: "GENERATION_TIMEOUT",
            message: "Generation took too long. Please try again.",
          });
        }
        const status = modalErr?.response?.status;
        if (typeof status === "number" && status >= 500) {
          return res.status(503).json({
            error: "PROVIDER_UNAVAILABLE",
            message: "AI provider is temporarily unavailable.",
          });
        }
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

    // Web-only quality pipeline: strip bad imports, validate JSX, optional syntax repair.
    // Native/mobile path is unchanged above.
    if (type === "web") {
      const groq = getGroq();
      try {
        files = await postProcessWebFiles(files, groq);
      } catch (webPostErr) {
        console.warn(
          "[generate] web post-process failed — returning sanitized files:",
          webPostErr?.message || webPostErr
        );
        files = sanitizeWebFiles(files);
      }
    }

    // Optional grader pass — opt-in via ENABLE_GRADER=true.
    // Off by default because past iterations regressed working button handlers.
    if (process.env.ENABLE_GRADER === "true" && usedProvider === "groq") {
      const groq = getGroq();
      if (groq) {
        try {
          files = await gradeAndImprove(files, groq);
        } catch (gradeErr) {
          console.warn("[generate] grader threw — keeping original files:", gradeErr?.message);
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
