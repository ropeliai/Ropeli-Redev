import { spawn, execSync } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import { networkInterfaces } from "os";
import net from "net";

const BASE_DIR = "D:\\expo-projects";
const BASE_PROJECT = "D:\\expo-projects\\base";
const RUNNING_PROCESSES = new Map();
const EXPO_STATE = new Map();
const START_TIMEOUT_MS = 180000; // 3 minutes for tunnel

const SPAWN_ENV = {
  ...process.env,
  npm_config_cache: "D:\\npm-cache",
  TEMP: "D:\\temp",
  TMP: "D:\\temp",
  EXPO_NO_PROMPTS: "1",
  CI: "0",
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
      lname.includes("vethernet") ||
      lname.includes("vmware") ||
      lname.includes("hyper-v") ||
      lname.includes("wsl") ||
      lname.includes("loopback")
    ) continue;
    for (const a of addrs) {
      if ((a.family === "IPv4" || a.family === 4) && !a.internal) {
        candidates.push(a.address);
      }
    }
  }
  candidates.sort((a, b) => {
    const r = (ip) => ip.startsWith("192.168.") ? 300 : ip.startsWith("10.") ? 200 : 50;
    return r(b) - r(a);
  });
  return candidates[0] || "localhost";
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

function killProcessesInDir(dir) {
  if (process.platform !== "win32") return Promise.resolve();
  return new Promise((resolve) => {
    const escaped = dir.replace(/\\/g, "\\\\");
    spawn("wmic", ["process", "where", `ExecutablePath like '%${escaped}%'`, "call", "terminate"],
      { shell: true, stdio: "ignore" }
    ).on("close", () => resolve());
  });
}

async function safeDelete(dir, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return true;
    } catch (e) {
      console.warn(`[expo] Delete retry ${i + 1}/${retries}:`, e.message);
      if (i < retries - 1) await sleep(2000);
    }
  }
  return false;
}

function writeManifest(projectDir, safeId, files) {
  const paths = (files || []).map((f) => f?.path).filter(Boolean);
  fs.writeFileSync(
    path.join(projectDir, "ropeli-manifest.json"),
    JSON.stringify({ savedAt: new Date().toISOString(), projectId: safeId, projectDir, fileCount: paths.length, paths }, null, 2),
    "utf8"
  );
}

export async function startExpo(projectId, files) {
  const safeId = projectId.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 64) || "expo-app";
  const projectDir = path.join(BASE_DIR, safeId);

  console.log(`\n=== Starting Expo for ${safeId} ===`);
  stopExpo(safeId);

  if (fs.existsSync(projectDir)) {
    await killProcessesInDir(projectDir);
    await sleep(3000);
    await safeDelete(projectDir);
  }

  copyDirRecursive(BASE_PROJECT, projectDir);
  console.log("Base project copied");

  const baseModules = path.join(BASE_PROJECT, "node_modules");
  const projModules = path.join(projectDir, "node_modules");
  if (fs.existsSync(baseModules) && !fs.existsSync(projModules)) {
    try {
      fs.symlinkSync(baseModules, projModules, "junction");
      console.log("[expo] node_modules symlinked from base");
    } catch {
      copyDirRecursive(baseModules, projModules);
    }
  }

  writeFiles(projectDir, files || []);
  writeManifest(projectDir, safeId, files || []);

  const localIP = getLocalIP();
  const port = 8081;

  console.log(`Starting Expo tunnel... (this takes 30-60 seconds)`);

  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["expo", "start", "--tunnel"],
      {
        cwd: projectDir,
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: SPAWN_ENV,
      }
    );

    RUNNING_PROCESSES.set(safeId, child);
    EXPO_STATE.set(safeId, {
      qrUrl: null,
      port,
      localIP,
      metroReachable: false,
      running: true,
    });

    let settled = false;
    let fullOutput = "";

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      console.error("[expo] Tunnel timed out after 3 minutes");
      stopExpo(safeId);
      reject(new Error("Expo tunnel timed out"));
    }, START_TIMEOUT_MS);

    const finish = (fn) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      fn();
    };

    const onData = (chunk) => {
      const text = chunk.toString();
      fullOutput += text;
      console.log("[expo]", text.trim());

      // Match tunnel URL — exp://xxx.exp.direct or https://xxx.exp.direct
      const tunnelMatch =
        text.match(/exp:\/\/[a-zA-Z0-9\-\.]+\.exp\.direct(:\d+)?/) ||
        text.match(/https:\/\/[a-zA-Z0-9\-\.]+\.exp\.direct/);

      if (tunnelMatch && !settled) {
        const qrUrl = tunnelMatch[0].trim();
        console.log("[expo] Tunnel URL found:", qrUrl);
        const state = EXPO_STATE.get(safeId);
        if (state) { state.qrUrl = qrUrl; state.metroReachable = true; }
        finish(() => resolve({ success: true, qr_url: qrUrl, metroReachable: true }));
        return;
      }

      // Fallback — tunnel ready but URL not printed yet
      if (text.includes("Tunnel ready") && !settled) {
        console.log("[expo] Tunnel ready — waiting 8s for URL...");
        setTimeout(() => {
          if (!settled) {
            // Try to extract from full output
            const fullMatch =
              fullOutput.match(/exp:\/\/[a-zA-Z0-9\-\.]+\.exp\.direct(:\d+)?/) ||
              fullOutput.match(/https:\/\/[a-zA-Z0-9\-\.]+\.exp\.direct/);
            const qrUrl = fullMatch ? fullMatch[0].trim() : `exp://${localIP}:${port}`;
            console.log("[expo] Using URL:", qrUrl);
            const state = EXPO_STATE.get(safeId);
            if (state) { state.qrUrl = qrUrl; state.metroReachable =  true; }
            finish(() => resolve({ success: true, qr_url: qrUrl, metroReachable: true }));
          }
        }, 8000);
      }

      // Fallback — logs line appears, wait longer for tunnel URL
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
        finish(() => reject(new Error(`Expo exited ${code}\n${fullOutput.slice(-1500)}`)));
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
    child.kill("SIGTERM");
    RUNNING_PROCESSES.delete(safeId);
    console.log(`Stopped Expo for ${safeId}`);
  }
  const state = EXPO_STATE.get(safeId);
  if (state) state.running = false;
}