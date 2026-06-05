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
import { logSuspicious } from "./middleware/logSuspicious.js";

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

function buildContextBlock(existingFiles) {
  if (!existingFiles || !Array.isArray(existingFiles) || existingFiles.length === 0) {
    return "";
  }
  return `
EXISTING APP CONTEXT:
The user already has a working app. You are MODIFYING or EXTENDING it, not replacing it.
Existing files:
${existingFiles.map((f) => `--- ${f.path} ---\n${(f.content ?? "").slice(0, 50000)}`).join("\n\n")}

RULES for modification:
- Keep all working functionality that exists
- Only change what the new prompt explicitly asks to change
- If adding a new screen, wire it into the existing navigation
- If adding a feature, integrate it with existing state
- Do NOT rename existing components or change file structure unless asked
- Return ALL files (modified and unmodified) in the response
`;
}

async function persistGeneratedProject({
  userId,
  existingProjectId,
  project_name,
  prompt,
  files,
  provider,
  type,
}) {
  const sb = getSupabaseServiceClient();
  if (!sb || !userId) return null;

  const sessionState = {
    files,
    project_name,
    prompt,
    provider,
    template_used: type,
    last_updated: new Date().toISOString(),
  };

  const build_type = type === "web" ? "web" : "mobile";
  const row = {
    user_id: userId,
    project_name,
    files,
    prompt,
    session_state: sessionState,
    build_type,
    updated_at: new Date().toISOString(),
  };

  if (existingProjectId) {
    row.id = existingProjectId;
  }

  try {
    const { data, error } = await sb
      .from("generated_projects")
      .upsert(row, { onConflict: "id" })
      .select("id")
      .single();

    if (error) {
      console.warn("[generate] generated_projects upsert failed:", error.message);
      return existingProjectId || null;
    }
    return data?.id ?? existingProjectId ?? null;
  } catch (err) {
    console.warn("[generate] generated_projects upsert error:", err?.message || err);
    return existingProjectId || null;
  }
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

const MAX_PROMPT_LENGTH = 500;
const BLOCKED_PROMPT_PATTERNS = [
  /ignore (all |previous |above |prior )?instructions/i,
  /system prompt/i,
  /jailbreak/i,
  /you are now/i,
  /pretend (you are|to be)/i,
  /disregard/i,
  /forget (everything|all|your)/i,
];

function validateAndSanitisePrompt(prompt, userId) {
  if (!prompt || typeof prompt !== "string") {
    return { ok: false, status: 400, error: "INVALID_PROMPT", message: "Prompt is required." };
  }

  if (prompt.trim().length < 3) {
    return {
      ok: false,
      status: 400,
      error: "PROMPT_TOO_SHORT",
      message: "Please describe the app you want to build.",
    };
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: "PROMPT_TOO_LONG",
      message: `Prompt must be under ${MAX_PROMPT_LENGTH} characters.`,
    };
  }

  const isBlocked = BLOCKED_PROMPT_PATTERNS.some((pattern) => pattern.test(prompt));
  if (isBlocked) {
    console.warn(`[security] Blocked prompt injection attempt from user ${userId}`);
    return {
      ok: false,
      status: 400,
      error: "INVALID_PROMPT",
      message: "That prompt cannot be processed. Please describe an app you want to build.",
    };
  }

  const sanitised = prompt.replace(/<[^>]*>/g, "").replace(/\0/g, "").trim();
  return { ok: true, sanitised };
}

function hardenMobileOutput(files) {
  return files.map((file) => {
    const cleaned = String(file.content ?? "")
      .replace(/require\(['"]fs['"]\)/g, "// removed")
      .replace(/require\(['"]child_process['"]\)/g, "// removed")
      .replace(/require\(['"]http['"]\)/g, "// removed")
      .replace(/import.*from\s+['"]fs['"]/g, "// removed")
      .replace(/import.*from\s+['"]child_process['"]/g, "// removed");
    return { ...file, content: cleaned };
  });
}

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

const WEB_LAYOUT_REQUIREMENTS = `WEB LAYOUT REQUIREMENTS:
- Use CSS variables for all colors matching the mobile palette above
- Max-width 480px centered (mobile-first web preview)
- Font: system-ui, -apple-system, sans-serif
- All interactive elements must have hover and focus states
- No layout should overflow horizontally

`;

const WEB_SYSTEM_PROMPT = `You are a code generator. Generate a complete, working React WEB app only.

${WEB_LAYOUT_REQUIREMENTS}TECH RULES:
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

const NATIVE_DESIGN_REQUIREMENTS = `DESIGN REQUIREMENTS — mandatory for every screen:

LAYOUT:
- Every screen must use a SafeAreaView as the root container
- Use a ScrollView or FlatList as the main body — never let content overflow off screen
- Maintain consistent padding: 16px horizontal, 12px vertical on all screens
- Header: full-width, backgroundColor matches theme, paddingTop 48 (accounts for status bar), paddingHorizontal 20, paddingBottom 16
- Body: flex 1, backgroundColor '#F8F9FA'
- Bottom actions: always pinned with paddingBottom 32 to avoid home indicator overlap

TYPOGRAPHY:
- Screen title: fontSize 24, fontWeight '700', color '#1A1A2E'
- Section headers: fontSize 18, fontWeight '600', color '#16213E'
- Body text: fontSize 15, fontWeight '400', color '#4A4A68', lineHeight 22
- Labels: fontSize 13, fontWeight '500', color '#6C757D'

BUTTONS:
- Primary: backgroundColor '#4361EE', borderRadius 12, paddingVertical 14, paddingHorizontal 24, full-width
- Secondary: backgroundColor 'transparent', borderWidth 1.5, borderColor '#4361EE', borderRadius 12, same padding
- Destructive (delete): backgroundColor '#EF4444', borderRadius 8, paddingVertical 10, paddingHorizontal 16
- All button text: color white (primary/destructive), color '#4361EE' (secondary), fontWeight '600', fontSize 15
- All buttons must have activeOpacity={0.8} — never use plain View for tappable items

INPUTS:
- backgroundColor 'white', borderWidth 1, borderColor '#E2E8F0', borderRadius 10
- paddingHorizontal 14, paddingVertical 12, fontSize 15, color '#1A1A2E'
- On focus: borderColor '#4361EE'
- Always include placeholder text that describes what to type

LIST ITEMS:
- backgroundColor 'white', borderRadius 10, marginHorizontal 16, marginVertical 4
- paddingHorizontal 16, paddingVertical 14
- Subtle shadow: shadowColor '#000', shadowOffset {width:0, height:1}, shadowOpacity 0.05, shadowRadius 3, elevation 2
- Separator: thin line, color '#F0F0F0'

COLORS (use these consistently):
- Primary: #4361EE
- Background: #F8F9FA
- Surface (cards): #FFFFFF
- Text primary: #1A1A2E
- Text secondary: #4A4A68
- Text muted: #9CA3AF
- Border: #E2E8F0
- Success: #10B981
- Error: #EF4444
- Warning: #F59E0B

EMPTY STATES:
- Every list screen must have a ListEmptyComponent
- Show an icon (use Text with an emoji), a title, and a subtitle encouraging the first action
- Example: 🗒️ "No items yet" / "Tap the + button to add your first item"

These design rules apply to EVERY screen. Do not deviate from them.

`;

const NATIVE_SYSTEM_PROMPT = `${NATIVE_DESIGN_REQUIREMENTS}You are a code generator. Generate an Expo React Native MOBILE app only. Use React Native components (View, Text, TextInput, Button, TouchableOpacity, FlatList, ScrollView) and Expo-compatible libraries only. Do NOT use localStorage, sessionStorage, window, document, ReactDOM, react-router-dom, HTML tags (div/button/input), or any browser-only API. The app must run in Expo Go. For data persistence use AsyncStorage from @react-native-async-storage/async-storage, never localStorage or sessionStorage. Always import AsyncStorage like this: import AsyncStorage from '@react-native-async-storage/async-storage' — never use destructured { AsyncStorage }. Always import React like this: import React, { useState, useEffect } from 'react' at the top of every file. Keep dependencies minimal and compatible with Expo.

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
  const systemPrompt = type === "web" ? WEB_SYSTEM_PROMPT : NATIVE_SYSTEM_PROMPT;

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

router.post("/", requireAuth, logSuspicious, checkRateLimit, async (req, res) => {
  try {
    const { prompt, type: rawType, existingFiles, existingProjectId } = req.body;

    const promptCheck = validateAndSanitisePrompt(prompt, req.user?.id);
    if (!promptCheck.ok) {
      return res.status(promptCheck.status).json({
        error: promptCheck.error,
        message: promptCheck.message,
      });
    }

    const type = rawType === "web" ? "web" : "native";
    const trimmedPrompt = promptCheck.sanitised;

    const { enhancedIntent } = enhancePromptForGeneration({
      rawPrompt: trimmedPrompt,
      type,
      hasExistingFiles: Boolean(
        existingFiles && Array.isArray(existingFiles) && existingFiles.length > 0
      ),
    });

    // Build the user-turn content only — instructions live in the system role
    // inside buildJsonGenerationMessages (WEB_SYSTEM_PROMPT / NATIVE_SYSTEM_PROMPT).
    const contextBlock = buildContextBlock(existingFiles);
    const userContent = contextBlock
      ? `${contextBlock}\n\nThe user wants to:\n${enhancedIntent}`
      : `User request:\n${enhancedIntent}`;

    // Modal receives a single raw string — prepend the system prompt for it.
    const modalPrompt = `${type === "web" ? WEB_SYSTEM_PROMPT : NATIVE_SYSTEM_PROMPT}\n\n${userContent}`;

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
      files = hardenMobileOutput(files);

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

    const savedProjectId = await persistGeneratedProject({
      userId: req.user?.id,
      existingProjectId: existingProjectId || null,
      project_name,
      prompt: trimmedPrompt,
      files,
      provider: usedProvider,
      type,
    });

    res.json({
      success: true,
      project_name,
      files,
      provider: usedProvider,
      generated_project_id: savedProjectId,
    });
  } catch (error) {
    console.error("[generate] Unexpected error:", error.message);
    res.status(500).json({ error: "Failed to generate app", details: error.message });
  }
});

export default router;
