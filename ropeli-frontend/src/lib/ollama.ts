import { apiFetch } from "./apiClient";

export interface OllamaMessage {
  role: "user" | "assistant";
  content: string;
}

export interface OllamaResponse {
  success: boolean;
  response?: string;
  error?: string;
  details?: string;
  model?: string;
}

const OLLAMA_API_BASE = "/api/ollama"; // Routes through your backend

/**
 * Send a simple prompt to your Ollama model
 */
export async function askOllama(prompt: string): Promise<string> {
  try {
    const response = await apiFetch(`${OLLAMA_API_BASE}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get response from Ollama");
    }

    const data: OllamaResponse = await response.json();
    return data.response || "";
  } catch (error) {
    console.error("Ollama API Error:", error);
    throw error;
  }
}

/**
 * Send conversation messages to Ollama for contextual responses
 */
export async function chatWithOllama(
  messages: OllamaMessage[]
): Promise<string> {
  try {
    const response = await apiFetch(`${OLLAMA_API_BASE}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get response from Ollama");
    }

    const data: OllamaResponse = await response.json();
    return data.response || "";
  } catch (error) {
    console.error("Ollama Chat API Error:", error);
    throw error;
  }
}

/**
 * Check if Ollama service is running
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await apiFetch(`${OLLAMA_API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get available models from Ollama
 */
export async function getOllamaModels(): Promise<any[]> {
  try {
    const response = await apiFetch(`${OLLAMA_API_BASE}/models`);

    if (!response.ok) {
      throw new Error("Failed to fetch models");
    }

    const data = await response.json();
    return data.availableModels || [];
  } catch (error) {
    console.error("Failed to fetch Ollama models:", error);
    return [];
  }
}

export interface GenerateCodeResult {
  success: true;
  code: string;
}

export interface GenerateCodeError {
  success: false;
  error: string;
}

/**
 * Generate code via backend /generate-code. Returns parsed code or error.
 */
export async function generateCode(
  prompt: string,
  projectConfig?: { buildTypes?: string[]; integrations?: string[] }
): Promise<GenerateCodeResult | GenerateCodeError> {
  try {
    const response = await apiFetch(`${OLLAMA_API_BASE}/generate-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, projectConfig }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Failed to generate code",
      };
    }

    if (!data.success || data.code == null) {
      return {
        success: false,
        error: data.error || "No code in response",
      };
    }

    const code = parseGeneratedCode(data.code);
    return { success: true, code };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network or server error";
    console.error("generateCode error:", error);
    return { success: false, error: message };
  }
}

const MIN_CODE_LENGTH = 20;

/**
 * Strip markdown code fences and return inner code. Returns empty string if too short.
 */
export function parseGeneratedCode(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  let code = raw.trim();
  const fence = /^```(?:tsx?|jsx?|javascript|typescript)?\s*\n?([\s\S]*?)```\s*$/m;
  const match = code.match(fence);
  if (match) code = match[1].trim();
  return code.length >= MIN_CODE_LENGTH ? code : "";
}
