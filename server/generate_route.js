import express from "express";
import axios from "axios";
import OpenAI from "openai";

const router = express.Router();

const USE_OPENAI = process.env.USE_OPENAI === "true";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:3b";
// Increased timeout from 600s to 1200s (20 minutes) for large model responses
const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || "1200000", 10);

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
    let content = String(file.content || "")
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

async function callOpenAI(prompt) {
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const systemPrompt = `You are a professional code generator. 
Return a complete set of project files in JSON format.
Output ONLY a raw JSON object with this structure:
{
  "success": true,
  "data": {
    "files": [
      { "path": "filename", "content": "file content" }
    ]
  }
}
Only return the JSON. No markdown fences.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  return { data: JSON.parse(response.choices[0].message.content) };
}

async function callOllama(prompt) {
  const systemPrompt = `You are a professional code generator. 
Your goal is to return a complete set of project files in JSON format.
Output ONLY a raw JSON object with the following structure:
{
  "success": true,
  "data": {
    "files": [
      { "path": "filename", "content": "file content" }
    ]
  }
}
Do not use markdown blocks, do not add explanation. Only return pure JSON.`;

  try {
    const response = await axios.post(
      `${OLLAMA_API_URL}/api/generate`,
      {
        model: OLLAMA_MODEL,
        prompt: `${systemPrompt}\n\nTask: ${prompt}`,
        stream: false,
        format: "json"
      },
      { timeout: AI_TIMEOUT_MS }
    );

    let jsonString = response.data.response.trim();
    
    // Robust extraction: find the first { and the last }
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }

    try {
        const parsedData = JSON.parse(jsonString);
        return { data: parsedData };
    } catch (parseErr) {
        console.error("JSON Parse Error. Cleaned string:", jsonString);
        throw parseErr;
    }
  } catch (err) {
    console.error("Ollama Error:", err.message);
    throw err;
  }
}

router.post("/warmup", (_req, res) => {
  res.status(200).json({ warmed: true });
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

    let aiPrompt;
    if (existingFiles && Array.isArray(existingFiles) && existingFiles.length > 0) {
      const filesContext = existingFiles
        .map((f) => `--- ${f.path} ---\n${(f.content ?? "").slice(0, 50000)}`)
        .join("\n\n");
      aiPrompt =
        type === "web"
          ? `${webInstruction}\n\nHere are the existing files:\n\n${filesContext}\n\nThe user wants to: ${trimmedPrompt}\n\nReturn the complete updated files (include any unchanged files and all new or modified files).`
          : `${nativeInstruction}\n\nHere are the existing files:\n\n${filesContext}\n\nThe user wants to: ${trimmedPrompt}\n\nReturn the complete updated files (include any unchanged files and all new or modified files).`;
    } else {
      aiPrompt =
        type === "web"
          ? `${webInstruction}\n\nUser request: ${trimmedPrompt}`
          : `${nativeInstruction}\n\nUser request: ${trimmedPrompt}`;
    }

    let response;
    if (USE_OPENAI && OPENAI_API_KEY) {
      console.log("Calling OpenAI (gpt-4o)...");
      response = await callOpenAI(aiPrompt);
    } else {
      console.log("Calling local Ollama...");
      response = await callOllama(aiPrompt);
    }

    const { success, data } = response.data;
    if (!success || !data) {
      return res.status(502).json({
        error: "Invalid response from AI provider",
        details: "Missing success or data in JSON response",
      });
    }

    let files = Array.isArray(data.files) ? data.files : [];
    if (type === "native") {
      files = sanitizeMobileFiles(files);
      if (hasForbiddenNativeCode(files)) {
        console.warn("Banned mobile patterns remain — requesting correction");
        const badCtx = files.map((f) => `--- ${f.path} ---\n${String(f.content ?? "").slice(0, 50000)}`).join("\n\n");
        const correctionPrompt = `${nativeInstruction}\n\nCRITICAL FIX: Rewrite the app so it runs in Expo Go with React Native only. Use @react-native-async-storage/async-storage.\n\nUser request: ${trimmedPrompt}\n\nCurrent broken files:\n\n${badCtx}\n\nReturn complete fixed files in JSON format.`;

        try {
          const fixResp = USE_OPENAI ? await callOpenAI(correctionPrompt) : await callOllama(correctionPrompt);
          const fixedFiles = fixResp?.data?.data?.files;
          if (Array.isArray(fixedFiles)) files = sanitizeMobileFiles(fixedFiles);
        } catch (e) {
          console.error("Correction retry failed:", e.message);
        }
      }
    }

    const project_name = deriveProjectNameFromPrompt(trimmedPrompt);
    res.json({ success: true, project_name, files });
  } catch (error) {
    console.error("FULL ERROR STACK:", error);
    res.status(500).json({ error: "Failed to generate app", details: error.message });
  }
});

export default router;
