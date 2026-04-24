/**
 * Server-side prompt enhancement: expands short user intents into a richer
 * spec for the code generator. Not exposed to the client.
 *
 * PROMPT_ENHANCER_ENABLED=0 disables (passes through raw prompt only).
 */

function parseBoolEnv(name, defaultTrue = true) {
  const v = process.env[name];
  if (v === undefined || v === "") return defaultTrue;
  return !["0", "false", "no", "off"].includes(String(v).trim().toLowerCase());
}

function normalizeWhitespace(s) {
  return String(s || "").trim().replace(/\s+/g, " ");
}

function bullet(lines) {
  return lines.map((t, i) => `${i + 1}. ${t}`).join("\n");
}

/**
 * @param {object} opts
 * @param {string} opts.rawPrompt
 * @param {"web"|"native"} opts.type
 * @param {boolean} opts.hasExistingFiles
 * @returns {{ enhancedIntent: string, usedEnhancer: boolean }}
 */
export function enhancePromptForGeneration({
  rawPrompt,
  type,
  hasExistingFiles,
}) {
  if (!parseBoolEnv("PROMPT_ENHANCER_ENABLED", true)) {
    return { enhancedIntent: normalizeWhitespace(rawPrompt), usedEnhancer: false };
  }

  const base = normalizeWhitespace(rawPrompt);
  if (!base) {
    return { enhancedIntent: base, usedEnhancer: false };
  }

  const lower = base.toLowerCase();
  const additions = [];

  if (hasExistingFiles) {
    additions.push(
      "Apply the request consistently across the provided files; avoid unrelated refactors."
    );
  } else {
    additions.push(
      "Ship a complete minimal runnable app with a clear entry in App.js and sensible defaults."
    );
  }

  if (type === "web") {
    additions.push(
      "Use semantic HTML, visible focus states, and keyboard-friendly controls where applicable."
    );
    if (/(todo|task list|checklist)/i.test(lower)) {
      additions.push(
        "Todo behavior: add items, mark complete/incomplete, delete items; keep state in React unless the user explicitly asked for persistence."
      );
    }
    if (/(auth|login|sign\s*up|sign\s*in)/i.test(lower)) {
      additions.push(
        "If authentication is implied, use a simple client-side mock (no real secrets) unless the user specified a backend."
      );
    }
  } else {
    additions.push(
      "Target Expo Go: no browser-only APIs; use React Native primitives; AsyncStorage only if persistence is explicitly requested."
    );
    if (/(todo|task list|checklist)/i.test(lower)) {
      additions.push(
        "Todo behavior: add items, toggle done, delete items; use useState by default; AsyncStorage only if the user asked to persist data."
      );
    }
    if (/(auth|login|sign\s*up|sign\s*in)/i.test(lower)) {
      additions.push(
        "If authentication is implied, implement a minimal mock flow (no hardcoded secrets)."
      );
    }
  }

  additions.push(
    "Prefer readable component structure; extract reusable pieces when it reduces complexity."
  );
  additions.push(
    "Include basic empty/loading/error UI where it materially improves UX for the described app."
  );

  const enhancedIntent = `${base}

--- Expanded product spec (internal; follow strictly) ---
${bullet(additions)}`;

  return { enhancedIntent, usedEnhancer: true };
}
