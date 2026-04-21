/**
 * Fail-fast when explicitly strict.
 *
 * Exits with code 1 when:
 *   REQUIRE_FULL_ENV=1 or STRICT_STARTUP_ENV=1
 * and neither OpenAI integration nor ALLOW_MODAL_ONLY=1 is set.
 *
 * When NODE_ENV=production only (no strict flags), logs a warning instead of exiting.
 */

import { createLogger } from "./logger.js";

const log = createLogger("app");

function openaiConfigured() {
  return Boolean(
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.trim() &&
      process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim()
  );
}

function generationEnvOk() {
  return openaiConfigured() || process.env.ALLOW_MODAL_ONLY === "1";
}

export function validateStartupEnv() {
  const strictExit =
    process.env.REQUIRE_FULL_ENV === "1" ||
    process.env.STRICT_STARTUP_ENV === "1";
  const prod = process.env.NODE_ENV === "production";

  if (!strictExit && !prod) return;

  if (generationEnvOk()) {
    if (strictExit) log.info("startup env validation passed", {});
    return;
  }

  const hint =
    "Set AI_INTEGRATIONS_OPENAI_BASE_URL + AI_INTEGRATIONS_OPENAI_API_KEY, or ALLOW_MODAL_ONLY=1 for Modal-only.";

  if (strictExit) {
    log.error(`startup aborted: ${hint}`, {});
    process.exit(1);
  }

  if (prod) {
    log.warn(`production without OpenAI fallback: ${hint}`, {});
  }
}
