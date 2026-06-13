import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import { networkInterfaces } from "os";

const BASE_DIR = process.env.EXPO_BASE_DIR || "/tmp/expo-projects";
const BASE_PROJECT = path.join(BASE_DIR, "base");
const RUNNING_PROCESSES = new Map();
const EXPO_STATE = new Map();
const START_TIMEOUT_MS = 180000;

/** Expo SDK 54 (matches Expo Go store / client ~54.x); see expo@54 bundledNativeModules.json */
const SDK_54 = {
  expo: "~54.0.0",
  "expo-status-bar": "~2.0.1",
  react: "18.3.2",
  "react-native": "0.76.9",
  "@react-native-async-storage/async-storage": "1.23.1",
  "react-native-safe-area-context": "4.12.0",
  "react-native-screens": "~4.4.0",
  "react-native-gesture-handler": "~2.20.2",
  "@react-navigation/native": "^6.1.18",
  "@react-navigation/native-stack": "^6.11.0",
};

/** 1x1 transparent PNG so Metro / icon paths resolve (replace with real art in app). */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKsjgQAAAABJRU5ErkJggg==",
  "base64"
);

const SPAWN_ENV = {
  ...process.env,
  EXPO_NO_PROMPTS: "1",
  // Non-interactive CLIs (Expo / npm prompts)
  CI: "false",
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
  return candidates[0] || "localhost";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Ensures `assets/` exists with files referenced by app.json (avoids Metro ENOENT on scandir). */
function ensureProjectAssets(rootDir) {
  const assets = path.join(rootDir, "assets");
  ensureDir(assets);
  const writeIfMissing = (name) => {
    const p = path.join(assets, name);
    if (!fs.existsSync(p)) fs.writeFileSync(p, TINY_PNG);
  };
  writeIfMissing("icon.png");
  writeIfMissing("splash-icon.png");
}

function hasPkg(dir, relPath) {
  return fs.existsSync(path.join(dir, relPath));
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

function npmInstall(cwd, label) {
  console.log(`[expo] npm install (${label})...`);
  execSync("npm install --legacy-peer-deps", {
    cwd,
    stdio: "inherit",
    timeout: 300000,
    env: SPAWN_ENV,
  });
}

/**
 * Base template: used as source for each generated project.
 * Includes @expo/ngrok in devDependencies so `expo start --tunnel` does not
 * prompt to install it globally (non-interactive on Render/CI).
 */
function ensureBaseProject() {
  ensureDir(BASE_PROJECT);

  const pkgPath = path.join(BASE_PROJECT, "package.json");
  let needsBaseNpmForSdk = false;

  const writeBasePackage = () => {
    const pkg = {
      name: "ropeli-base",
      version: "1.0.0",
      main: "node_modules/expo/AppEntry.js",
      scripts: {
        start: "expo start",
        android: "expo start --android",
        ios: "expo start --ios",
      },
      dependencies: { ...SDK_54 },
      devDependencies: {
        "@babel/core": "^7.20.0",
        "@expo/ngrok": "^4.1.0",
      },
    };
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf8");
  };

  if (!fs.existsSync(pkgPath)) {
    console.log("[expo] Creating base Expo project...");
    writeBasePackage();

    fs.writeFileSync(
      path.join(BASE_PROJECT, "app.json"),
      JSON.stringify(
        {
          expo: {
            name: "RopeliApp",
            slug: "ropeli-app",
            version: "1.0.0",
            orientation: "portrait",
            icon: "./assets/icon.png",
            splash: {
              image: "./assets/splash-icon.png",
              resizeMode: "contain",
              backgroundColor: "#ffffff",
            },
            platforms: ["ios", "android"],
            sdkVersion: "54.0.0",
          },
        },
        null,
        2
      ),
      "utf8"
    );
    ensureProjectAssets(BASE_PROJECT);

    fs.writeFileSync(path.join(BASE_PROJECT, "App.js"),
      `import React from 'react';\nimport { View, Text } from 'react-native';\nexport default function App() {\n  return <View><Text>Loading...</Text></View>;\n}\n`,
      "utf8"
    );

    fs.writeFileSync(path.join(BASE_PROJECT, "babel.config.js"),
      `module.exports = function(api) {\n  api.cache(true);\n  return { presets: ['babel-preset-expo'] };\n};\n`,
      "utf8"
    );
  } else {
    const firstVer = (s) => {
      const m = String(s).match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    };
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      let changed = false;
      if (!pkg.dependencies) pkg.dependencies = {};
      const expoDep = String(pkg.dependencies.expo || "");
      if (firstVer(expoDep) !== 54) {
        console.log("[expo] Aligning base template to Expo SDK 54 (Expo Go compatible)...");
        Object.assign(pkg.dependencies, SDK_54);
        needsBaseNpmForSdk = true;
        changed = true;
      }
      if (pkg?.dependencies?.react === "18.3.2") {
        console.log("[expo] Repairing invalid react version in base package...");
        pkg.dependencies.react = "19.1.0";
        changed = true;
      }
      if (!pkg.devDependencies) pkg.devDependencies = {};
      if (!pkg.devDependencies["@expo/ngrok"]) {
        console.log("[expo] Adding @expo/ngrok to base devDependencies (tunnel)...");
        pkg.devDependencies["@expo/ngrok"] = "^4.1.0";
        changed = true;
      }
      if (changed) {
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf8");
      }
    } catch (e) {
      console.warn("[expo] Could not patch base package.json:", e.message);
    }
    const appPath = path.join(BASE_PROJECT, "app.json");
    try {
      if (fs.existsSync(appPath)) {
        const app = JSON.parse(fs.readFileSync(appPath, "utf8"));
        const ex = app.expo || (app.expo = {});
        const sv = String(ex.sdkVersion || "");
        if (firstVer(sv) !== 54) {
          console.log("[expo] Setting app.json sdkVersion to 54.0.0...");
          ex.sdkVersion = "54.0.0";
        }
        if (!ex.icon) ex.icon = "./assets/icon.png";
        if (!ex.splash) {
          ex.splash = {
            image: "./assets/splash-icon.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff",
          };
        }
        fs.writeFileSync(appPath, JSON.stringify(app, null, 2), "utf8");
      }
    } catch (e) {
      console.warn("[expo] Could not patch base app.json:", e.message);
    }
  }

  ensureProjectAssets(BASE_PROJECT);

  if (needsBaseNpmForSdk) {
    npmInstall(BASE_PROJECT, "base template (Expo SDK 54 align)");
  }

  const reactNativeInBase = hasPkg(BASE_PROJECT, path.join("node_modules", "react-native", "package.json"));
  const ngrokInBase = hasPkg(BASE_PROJECT, path.join("node_modules", "@expo", "ngrok", "package.json"));
  if (!reactNativeInBase || !ngrokInBase) {
    npmInstall(BASE_PROJECT, "base template");
  }

  if (!hasPkg(BASE_PROJECT, path.join("node_modules", "react-native", "package.json"))) {
    throw new Error(
      "[expo] Base preflight failed: react-native is missing after npm install. Check network, npm registry, and disk space."
    );
  }
}

/**
 * Ensure projectDir has resolvable node_modules (symlink to base, or npm install).
 */
function ensureProjectNodeModules(projectDir) {
  const baseModules = path.join(BASE_PROJECT, "node_modules");
  const projModules = path.join(projectDir, "node_modules");
  const rn = path.join(projModules, "react-native", "package.json");
  const expoPkg = path.join(projModules, "expo", "package.json");

  function coreDepsOk() {
    return fs.existsSync(rn) && fs.existsSync(expoPkg);
  }

  if (coreDepsOk()) {
    console.log("[expo] Preflight: node_modules OK in project.");
    return;
  }

  if (!fs.existsSync(baseModules)) {
    throw new Error(
      "[expo] Preflight: base node_modules missing. ensureBaseProject() should run first."
    );
  }

  if (!fs.existsSync(projModules)) {
    try {
      fs.symlinkSync(baseModules, projModules, "dir");
      console.log("[expo] Preflight: node_modules symlinked from base -> project");
    } catch (e) {
      console.warn(
        "[expo] Preflight: symlink node_modules failed:",
        e.message,
        "— will run npm install in project"
      );
    }
  }

  if (!coreDepsOk()) {
    if (fs.existsSync(projModules) && isSymlink(projModules)) {
      try {
        fs.unlinkSync(projModules);
        console.log("[expo] Preflight: removed broken/incomplete node_modules symlink");
      } catch (e) {
        console.warn("[expo] Preflight: could not remove symlink:", e.message);
      }
    }
    npmInstall(projectDir, "project (deps required for Metro)");
  }

  if (!coreDepsOk()) {
    throw new Error(
      "[expo] Preflight failed: react-native and/or expo missing after install. " +
        `Project: ${projectDir}. Check npm registry, disk space, and that BASE_PROJECT has a successful npm install.`
    );
  }
  console.log("[expo] Preflight: react-native + expo resolved.");
}

function isSymlink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

export async function startExpo(projectId, files) {
  const safeId = projectId.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 64) || "expo-app";
  const projectDir = path.join(BASE_DIR, safeId);

  console.log(`\n=== Starting Expo for ${safeId} ===`);
  // Kill any lingering ngrok processes before starting fresh
  try {
    if (process.platform === "win32") {
      execSync("taskkill /F /IM ngrok.exe", { stdio: "ignore" });
    } else {
      execSync("pkill -f ngrok || true", { stdio: "ignore" });
    }
  } catch {}
  stopExpo(safeId);

  if (fs.existsSync(projectDir)) {
    await safeDelete(projectDir);
  }

  ensureBaseProject();
  copyDirRecursive(BASE_PROJECT, projectDir);
  console.log("[expo] Base project copied");

  ensureProjectNodeModules(projectDir);

  writeFiles(projectDir, files || []);
  ensureProjectAssets(projectDir);
  writeManifest(projectDir, safeId, files || []);

  const localIP = getLocalIP();
  const port = 8081;

  console.log(`[expo] Starting Expo tunnel... (this takes 30-60 seconds)`);

  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["--yes", "expo@54.0.17", "start", "--tunnel", "--max-workers", "2", "--non-interactive"],
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
      reject(new Error("Expo tunnel timed out — try again or use web preview instead"));
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

      if (text.includes("Tunnel ready") && !settled) {
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
        const hint =
          /non-interactive|ngrok|Could not resolve react-native/i.test(fullOutput)
            ? " If you see ngrok or react-native errors, clear EXPO_BASE_DIR cache or let preflight re-run npm install; ensure Render has outbound network for tunnels."
            : "";
        finish(() =>
          reject(
            new Error(
              `Expo exited with code ${code}. Last output:\n${fullOutput.slice(-2000)}${hint}`
            )
          )
        );
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
    try { child.kill("SIGTERM"); } catch {}
    RUNNING_PROCESSES.delete(safeId);
    console.log(`[expo] Stopped Expo for ${safeId}`);
  }
  const state = EXPO_STATE.get(safeId);
  if (state) state.running = false;
}
