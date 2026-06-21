/**
 * webPostProcess.js
 *
 * Web-only post-generation pipeline (never imported for native/mobile).
 * 1. sanitizeWebFiles — strip CSS/RN imports
 * 2. findWebParseErrors — @babel/parser validation per .js file
 * 3. repairWebFilesSyntax — optional Groq syntax-only repair (gated by env)
 */

import { parse } from "@babel/parser";

const WEB_SYNTAX_REPAIR_ENABLED = process.env.ENABLE_WEB_SYNTAX_REPAIR !== "false";

const CSS_IMPORT_RE =
  /^\s*import\s+[^;]*['"][^'"]*\.css['"]\s*;?\s*$/gm;
const RN_IMPORT_RE =
  /^\s*import\s+[^;]*['"](react-native|expo[^'"]*|@react-navigation[^'"]*)['"]\s*;?\s*$/gm;

export function getGroqModelForType(type) {
  // Single source of truth: GROQ_MODEL in .env drives ALL generation types
  // (web, native, pwa). No per-type hardcoded overrides — if a different
  // model is ever needed for a specific type, set it explicitly via env
  // (GROQ_MODEL_WEB / GROQ_MODEL_PWA) rather than hardcoding in code.
  if (type === "pwa" && process.env.GROQ_MODEL_PWA) {
    return process.env.GROQ_MODEL_PWA;
  }
  if (type === "web" && process.env.GROQ_MODEL_WEB) {
    return process.env.GROQ_MODEL_WEB;
  }
  return process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
}

export function isWebSyntaxRepairEnabled() {
  return WEB_SYNTAX_REPAIR_ENABLED;
}

/**
 * Remove imports that break Sandpack (CSS modules, react-native, expo).
 */
export function sanitizeWebFiles(files) {
  if (!Array.isArray(files)) return files;
  return files.map((file) => {
    let content = String(file?.content ?? "");
    content = content.replace(CSS_IMPORT_RE, "// CSS import removed for web preview\n");
    content = content.replace(
      RN_IMPORT_RE,
      "// React Native / Expo import removed for web preview\n"
    );
    return { ...file, content };
  });
}

function isJsFilePath(filePath) {
  return /\.(js|jsx)$/i.test(String(filePath || ""));
}

/**
 * Returns [{ path, message }] for files that do not parse.
 */
export function findWebParseErrors(files) {
  if (!Array.isArray(files)) return [];
  const errors = [];
  for (const file of files) {
    const filePath = file?.path;
    if (!isJsFilePath(filePath)) continue;
    const content = String(file?.content ?? "");
    if (!content.trim()) {
      errors.push({ path: filePath, message: "File is empty" });
      continue;
    }
    try {
      parse(content, {
        sourceType: "module",
        plugins: ["jsx"],
        errorRecovery: false,
      });
    } catch (err) {
      errors.push({
        path: filePath,
        message: err?.message || String(err),
      });
    }
  }
  return errors;
}

const SYNTAX_REPAIR_SYSTEM = `You fix JavaScript/React syntax errors only.
Do not change app logic, handler names, or state update patterns.
Do not add or remove features.
Return ONLY valid JSON: {"files":[{"path":"...","content":"..."}]}
The content must parse as JSX module code with no syntax errors.`;

function buildRepairUserMessage(filePath, content, parseMessage) {
  return `File: ${filePath}
Parser error: ${parseMessage}

Fix ONLY syntax (quotes, brackets, semicolons). Keep the same behavior.

Current file:
${content.slice(0, 45000)}`;
}

/**
 * Attempt syntax-only repair for broken web files via Groq.
 * Returns updated files array; unchanged files are preserved on failure.
 */
export async function repairWebFilesSyntax(files, groqClient, { model, maxRepairs = 2 } = {}) {
  if (!groqClient || !WEB_SYNTAX_REPAIR_ENABLED) return files;

  let result = [...files];
  let repairsDone = 0;

  for (let round = 0; round < maxRepairs; round++) {
    const errors = findWebParseErrors(result);
    if (errors.length === 0) break;

    const target = errors[0];
    const original = result.find((f) => f.path === target.path);
    if (!original) break;

    console.warn(`[web-repair] syntax fix for ${target.path}: ${target.message}`);

    let response;
    try {
      response = await groqClient.chat.completions.create({
        model: model || process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        max_tokens: 8192,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYNTAX_REPAIR_SYSTEM },
          {
            role: "user",
            content: buildRepairUserMessage(
              target.path,
              String(original.content ?? ""),
              target.message
            ),
          },
        ],
      });
    } catch (err) {
      console.warn("[web-repair] Groq repair call failed:", err?.message || err);
      break;
    }

    const raw = response.choices?.[0]?.message?.content || "";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {
          parsed = null;
        }
      }
    }

    const repaired = parsed?.files?.find((f) => f?.path === target.path);
    if (!repaired?.content || typeof repaired.content !== "string") {
      console.warn("[web-repair] no valid repaired content for", target.path);
      break;
    }

    const sanitized = sanitizeWebFiles([
      { path: target.path, content: repaired.content },
    ])[0];

    const stillBroken = findWebParseErrors([sanitized]);
    if (stillBroken.length > 0) {
      console.warn("[web-repair] repair still has parse errors — keeping previous version");
      break;
    }

    result = result.map((f) =>
      f.path === target.path ? { ...f, content: sanitized.content } : f
    );
    repairsDone++;
  }

  if (repairsDone > 0) {
    console.log(`[web-repair] completed ${repairsDone} syntax repair(s)`);
  }

  return result;
}

/**
 * Full web post-process: sanitize → validate → optional repair.
 */
export async function postProcessWebFiles(files, groqClient) {
  let out = sanitizeWebFiles(files);
  const model = getGroqModelForType("web");

  if (WEB_SYNTAX_REPAIR_ENABLED && groqClient) {
    out = await repairWebFilesSyntax(out, groqClient, { model });
  }

  const remaining = findWebParseErrors(out);
  if (remaining.length > 0) {
    console.warn(
      "[web-post] files still have parse errors after post-process:",
      remaining.map((e) => e.path).join(", ")
    );
  }

  return out;
}
