import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import { networkInterfaces } from "os";

const BASE_DIR = "D:\\ropeli-v4";
const BASE_PROJECT = path.join(BASE_DIR, "base");
const RUNNING_PROCESSES = new Map();
const EXPO_STATE = new Map();
const START_TIMEOUT_MS = 180000;

const SPAWN_ENV = {
  ...process.env,
  EXPO_NO_PROMPTS: "1",
  CI: "1",
  NODE_ENV: "development",
};

function getLocalIP() {
  const override = process.env.EXPO_LAN_HOST?.trim();
  if (override) return override;
  const nets = networkInterfaces();
  const candidates = [];
  for (const [name, addrs] of Object.entries(nets)) {
    const lname = name.toLowerCase();
    if (
      lname.includes("virtualbox") ||
      lname.includes("vmware") ||
      lname.includes("loopback")
    ) continue;
    for (const a of addrs) {
      if ((a.family === "IPv4" || a.family === 4) && !a.internal) {
        candidates.push(a.address);
      }
    }
  }
  candidates.sort((a, b) => {
    const r = (ip) =>
      ip.startsWith("192.168.") ? 300 : ip.startsWith("10.") ? 200 : 50;
    return r(b) - r(a);
  });
  const ip = candidates[0] || "localhost";
  console.log(`[expo] Detected Local IP: ${ip} (Search candidates: ${candidates.join(", ")})`);
  return ip;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeFiles(projectDir, files) {
  if (!Array.isArray(files)) return;
  for (const file of files) {
    if (!file.path || file.content == null) continue;
    const normalized = path.normalize(file.path).replace(/^(\.\.(\/|\\))+/, "");
    if (normalized === "package.json" || normalized.endsWith("/package.json")) continue;
    const safePath = path.join(projectDir, normalized);
    ensureDir(path.dirname(safePath));
    fs.writeFileSync(safePath, String(file.content), "utf8");
  }
}

function copyDirRecursive(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDirRecursive(s, d) : fs.copyFileSync(s, d);
  }
}

async function safeDelete(dir, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return true;
    } catch (e) {
      console.warn(`[expo] Delete retry ${i + 1}/${retries}:`, e.message);
      if (i < retries - 1) await sleep(1000);
    }
  }
  return false;
}

function writeManifest(projectDir, safeId, files) {
  const paths = (files || []).map((f) => f?.path).filter(Boolean);
  fs.writeFileSync(
    path.join(projectDir, "ropeli-manifest.json"),
    JSON.stringify({
      savedAt: new Date().toISOString(),
      projectId: safeId,
      projectDir,
      fileCount: paths.length,
      paths,
    }, null, 2),
    "utf8"
  );
}

function ensureBaseProject() {
  ensureDir(BASE_PROJECT);

  const pkgPath = path.join(BASE_PROJECT, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.log("[expo] Creating base Expo project...");
    const pkg = {
      name: "ropeli-base",
      version: "1.0.0",
      main: "node_modules/expo/AppEntry.js",
      scripts: { start: "expo start", android: "expo start --android", ios: "expo start --ios" },
      dependencies: {
        "expo": "~53.0.0",
        "expo-status-bar": "~2.2.3",
        "react": "19.0.0",
        "react-native": "0.79.0",
        "@react-native-async-storage/async-storage": "2.1.2",
        "react-native-safe-area-context": "5.4.0",
        "react-native-screens": "~4.10.0",
        "@react-navigation/native": "^7.0.14",
        "@react-navigation/native-stack": "^7.3.10",
      },
      devDependencies: {
        "@babel/core": "^7.20.0",
        "@expo/ngrok": "^4.1.0"
      },
    };
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf8");

    fs.writeFileSync(path.join(BASE_PROJECT, "app.json"), JSON.stringify({
      expo: {
        name: "RopeliApp",
        slug: "ropeli-app",
        version: "1.0.0",
        orientation: "portrait",
        platforms: ["ios", "android"],
        sdkVersion: "55.0.0",
      },
    }, null, 2), "utf8");

    fs.writeFileSync(path.join(BASE_PROJECT, "App.js"),
      `import React from 'react';\nimport { View, Text } from 'react-native';\nexport default function App() {\n  return <View><Text>Loading...</Text></View>;\n}\n`,
      "utf8"
    );

    fs.writeFileSync(path.join(BASE_PROJECT, "babel.config.js"),
      `module.exports = function(api) {\n  api.cache(true);\n  return { presets: ['babel-preset-expo'] };\n};\n`,
      "utf8"
    );

    console.log("[expo] Installing base Expo project dependencies (this takes a while first time)...");
    try {
      execSync("npm install --legacy-peer-deps", {
        cwd: BASE_PROJECT,
        stdio: "inherit",
        timeout: 300000,
        env: SPAWN_ENV,
      });
      console.log("[expo] Base project dependencies installed.");
    } catch (e) {
      console.error("[expo] npm install failed:", e.message);
    }
  }
}

export async function startExpo(projectId, files) {
  const safeId = projectId.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 64) || "expo-app";
  const projectDir = path.join(BASE_DIR, safeId);

  console.log(`\n=== Starting Expo for ${safeId} ===`);
  stopExpo(safeId);

  if (fs.existsSync(projectDir)) {
    await safeDelete(projectDir);
  }

  ensureBaseProject();
  if (!fs.existsSync(projectDir)) {
    copyDirRecursive(BASE_PROJECT, projectDir);
    console.log("[expo] Base project copied to " + projectDir);
  } else {
    console.log("[expo] Project directory already exists, writing new files...");
  }

  const baseModules = path.join(BASE_PROJECT, "node_modules");
  const projModules = path.join(projectDir, "node_modules");
  if (fs.existsSync(baseModules) && !fs.existsSync(projModules)) {
    try {
      const type = process.platform === "win32" ? "junction" : "dir";
      fs.symlinkSync(baseModules, projModules, type);
      console.log(`[expo] node_modules linked from base (type: ${type})`);
    } catch (err) {
      console.log("[expo] Symlink failed, attempting manual copy of node_modules... this might take time.");
      // Fallback: Copying node_modules if symlink fails (rare but happens on some Windows configs)
      // For now, we'll try to just log and hope the base install was enough
      console.error("[expo] Symlink error details:", err.message);
    }
  }

  writeFiles(projectDir, files || []);
  writeManifest(projectDir, safeId, files || []);

  const localIP = getLocalIP();
  const port = 8081;

  console.log(`[expo] Starting Expo tunnel... (this takes 30-60 seconds)`);

  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["--yes", "expo@53.0.0", "start", "--tunnel"],
      {
        cwd: projectDir,
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: SPAWN_ENV,
      }
    );

    RUNNING_PROCESSES.set(safeId, child);
    const initialQrUrl = `exp://${localIP}:${port}`;
    
    EXPO_STATE.set(safeId, {
      qrUrl: initialQrUrl,
      port,
      localIP,
      metroReachable: false,
      running: true,
    });

    // Resolve IMMEDIATELY so the frontend gets a QR code right away
    resolve({ 
      success: true, 
      qr_url: initialQrUrl, 
      metroReachable: false,
      status: "initializing" 
    });

    let settled = false; // Note: 'settled' now refers to the tunnel being found
    let fullOutput = "";

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      console.warn("[expo] Tunnel background setup timed out");
    }, START_TIMEOUT_MS);

    const finish = (fn) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (fn) fn();
    };

    const onData = (chunk) => {
      const text = chunk.toString();
      fullOutput += text;
      
      // LOG EVERYTHING for debugging
      process.stdout.write(`[EXPO-DEBUG] ${text}`);

      const tunnelMatch =
        text.match(/exp:\/\/[a-zA-Z0-9\-\.]+\.exp\.direct(:\d+)?/) ||
        text.match(/https:\/\/[a-zA-Z0-9\-\.]+\.exp\.direct/) ||
        text.match(/exp:\/\/\d+\.\d+\.\d+\.\d+:\d+/); 

      if (tunnelMatch && !settled) {
        const qrUrl = tunnelMatch[0].trim();
        console.log("[expo] Tunnel URL found in background:", qrUrl);
        const state = EXPO_STATE.get(safeId);
        if (state) { 
          state.qrUrl = qrUrl; 
          state.metroReachable = true; 
        }
        finish();
        return;
      }

      if ((text.includes("Tunnel ready") || text.includes("Project available at")) && !settled) {
        console.log("[expo] Tunnel ready — waiting 8s for URL...");
        setTimeout(() => {
          if (!settled) {
            const fullMatch =
              fullOutput.match(/exp:\/\/[a-zA-Z0-9\-\.]+\.exp\.direct(:\d+)?/) ||
              fullOutput.match(/https:\/\/[a-zA-Z0-9\-\.]+\.exp\.direct/);
            const qrUrl = fullMatch ? fullMatch[0].trim() : `exp://${localIP}:${port}`;
            console.log("[expo] Using URL:", qrUrl);
            const state = EXPO_STATE.get(safeId);
            if (state) { state.qrUrl = qrUrl; state.metroReachable = true; }
            finish(() => resolve({ success: true, qr_url: qrUrl, metroReachable: true }));
          }
        }, 8000);
      }

      if (text.includes("failed to start tunnel") && !settled) {
        console.warn("[expo] Tunnel failed — falling back to LAN mode");
        const qrUrl = `exp://${localIP}:${port}`;
        const state = EXPO_STATE.get(safeId);
        if (state) { state.qrUrl = qrUrl; state.metroReachable = true; }
        finish(() => resolve({ success: true, qr_url: qrUrl, metroReachable: true, note: "LAN fallback used" }));
        return;
      }

      if (text.includes("Logs for your project") && !settled) {
        setTimeout(() => {
          if (!settled) {
            const fullMatch =
              fullOutput.match(/exp:\/\/[a-zA-Z0-9\-\.]+\.exp\.direct(:\d+)?/) ||
              fullOutput.match(/https:\/\/[a-zA-Z0-9\-\.]+\.exp\.direct/);
            if (fullMatch) {
              const qrUrl = fullMatch[0].trim();
              console.log("[expo] Late tunnel URL found:", qrUrl);
              finish(() => resolve({ success: true, qr_url: qrUrl, metroReachable: true }));
            }
          }
        }, 15000);
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("error", (err) => finish(() => reject(err)));
    child.on("exit", (code) => {
      RUNNING_PROCESSES.delete(safeId);
      const state = EXPO_STATE.get(safeId);
      if (state) state.running = false;
      if (!settled) {
        finish(() => reject(new Error(`Expo exited with code ${code}\n${fullOutput.slice(-1500)}`)));
      }
    });
  });
}

export async function getExpoStatus(projectId) {
  const safeId = projectId.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 64) || "expo-app";
  const state = EXPO_STATE.get(safeId);
  if (!state) return { running: false, metroReachable: false };
  return {
    running: state.running,
    url: state.qrUrl,
    metroReachable: state.metroReachable,
    port: state.port,
    localIP: state.localIP,
  };
}

export function stopExpo(projectId) {
  const safeId = projectId.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 64) || "expo-app";
  const child = RUNNING_PROCESSES.get(safeId);
  if (child) {
    try { child.kill("SIGTERM"); } catch { }
    RUNNING_PROCESSES.delete(safeId);
    console.log(`[expo] Stopped Expo for ${safeId}`);
  }
  const state = EXPO_STATE.get(safeId);
  if (state) state.running = false;
}
