import express from "express";
import axios from "axios";

const router = express.Router();

const MODAL_API_URL =
  process.env.MODAL_API_URL ||
  "https://coutinhoandrew0--my-coder-model-generate.modal.run";

const MODAL_TIMEOUT_MS = 600000;

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

async function callModal(prompt, retryCount = 0) {
  try {
    const response = await axios.post(
      MODAL_API_URL,
      { prompt },
      { timeout: MODAL_TIMEOUT_MS }
    );
    return response;
  } catch (err) {
    const status = err.response?.status;
    if (status === 500 && retryCount < 1) {
      console.log("Modal 500 — retrying in 5s...");
      await new Promise((r) => setTimeout(r, 5000));
      return callModal(prompt, retryCount + 1);
    }
    const isTimeout =
      err.code === "ECONNABORTED" ||
      (err.message && err.message.includes("timeout"));
    if (isTimeout && retryCount < 1) {
      console.log("Modal timeout (cold start) — retrying in 5s...");
      await new Promise((r) => setTimeout(r, 5000));
      return callModal(prompt, retryCount + 1);
    }
    throw err;
  }
}

router.post("/warmup", (_req, res) => {
  res.status(200).json({ warmed: true });
  axios
    .post(
      MODAL_API_URL,
      { prompt: "Hello. Return a minimal app with one file." },
      { timeout: MODAL_TIMEOUT_MS }
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
    if (
      existingFiles &&
      Array.isArray(existingFiles) &&
      existingFiles.length > 0
    ) {
      const filesContext = existingFiles
        .map(
          (f) =>
            `--- ${f.path} ---\n${(f.content ?? "").slice(0, 50000)}`
        )
        .join("\n\n");
      modalPrompt =
        type === "web"
          ? `${webInstruction}\n\nHere are the existing files:\n\n${filesContext}\n\nThe user wants to: ${trimmedPrompt}\n\nReturn the complete updated files (include any unchanged files and all new or modified files).`
          : `${nativeInstruction}\n\nHere are the existing files:\n\n${filesContext}\n\nThe user wants to: ${trimmedPrompt}\n\nReturn the complete updated files (include any unchanged files and all new or modified files).`;
    } else {
      modalPrompt =
        type === "web"
          ? `${webInstruction}\n\nUser request: ${trimmedPrompt}`
          : `${nativeInstruction}\n\nUser request: ${trimmedPrompt}`;
    }

    const response = await callModal(modalPrompt);

    console.log(
      "Modal API raw response:",
      JSON.stringify(response.data, null, 2)
    );

    const { success, data } = response.data;

    if (!success || !data) {
      return res.status(502).json({
        error: "Invalid response from generate API",
        details: "Missing success or data in response",
      });
    }

    let files = Array.isArray(data.files) ? data.files : [];

    if (type === "native") {
      files = sanitizeMobileFiles(files);

      if (hasForbiddenNativeCode(files)) {
        console.warn(
          "Banned mobile patterns remain after sanitize — requesting correction"
        );
        const badCtx = files
          .map(
            (f) =>
              `--- ${f.path} ---\n${String(f.content ?? "").slice(0, 50000)}`
          )
          .join("\n\n");
        const correctionPrompt =
          `${nativeInstruction}\n\n` +
          "CRITICAL FIX REQUIRED: The previous output used browser-only APIs (like localStorage/window/document/ReactDOM). " +
          "Rewrite the app so it runs in Expo Go with React Native only. " +
          "Use @react-native-async-storage/async-storage instead of localStorage.\n\n" +
          `User request: ${trimmedPrompt}\n\nCurrent broken files:\n\n${badCtx}\n\nReturn complete fixed files.`;

        try {
          const fixResp = await callModal(correctionPrompt);
          const fixedFiles = fixResp?.data?.data?.files;
          if (Array.isArray(fixedFiles)) {
            files = sanitizeMobileFiles(fixedFiles);
          }
        } catch (e) {
          console.error("Correction retry failed:", e.message);
        }
      }
    }

    const project_name = deriveProjectNameFromPrompt(trimmedPrompt);
    res.json({ success: true, project_name, files });
  } catch (error) {
    console.error("Generate API Error:", error.message);

    if (error.response) {
      return res.status(error.response.status || 500).json({
        error: "Generate API request failed",
        details: error.response.data || error.message,
      });
    }
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      return res.status(503).json({
        error: "Could not reach generate service",
        details: error.message,
      });
    }
    res
      .status(500)
      .json({ error: "Failed to generate app", details: error.message });
  }
});

export default router;
