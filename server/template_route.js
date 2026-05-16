import express from "express";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import http from "http";
import fs from "fs";
import path from "path";

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

const IPHONE_DIR = join(__dirname, "../iphone");
const IPHONE_PORT = 5174;

let iphoneProcess = null;
let iphoneReady = false;

function waitForServer(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const req = http.get(`http://localhost:${port}`, (res) => {
        clearInterval(interval);
        resolve(true);
      });
      req.on("error", () => {
        if (Date.now() - start > timeout) {
          clearInterval(interval);
          reject(new Error("iPhone server did not start in time"));
        }
      });
      req.end();
    }, 500);
  });
}

// POST /api/templates/iphone/start
router.post("/iphone/start", async (req, res) => {
  try {
    // If already running, just return the URL
    if (iphoneProcess && iphoneReady) {
      return res.json({ success: true, url: `http://localhost:${IPHONE_PORT}` });
    }

    // Kill any stale process
    if (iphoneProcess) {
      iphoneProcess.kill("SIGTERM");
      iphoneProcess = null;
      iphoneReady = false;
    }

    console.log("▶ Starting iPhone template dev server on port", IPHONE_PORT);

    iphoneProcess = spawn(
      "npm",
      ["run", "dev", "--", "--port", String(IPHONE_PORT), "--host"],
      {
        cwd: IPHONE_DIR,
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    iphoneProcess.stdout.on("data", (data) => {
      console.log("[iPhone]", data.toString().trim());
    });

    iphoneProcess.stderr.on("data", (data) => {
      console.error("[iPhone ERR]", data.toString().trim());
    });

    iphoneProcess.on("exit", (code) => {
      console.log("[iPhone] Process exited with code", code);
      iphoneProcess = null;
      iphoneReady = false;
    });

    // Wait until server is ready
    await waitForServer(IPHONE_PORT, 40000);
    iphoneReady = true;

    console.log("✅ iPhone dev server ready at http://localhost:" + IPHONE_PORT);
    res.json({ success: true, url: `http://localhost:${IPHONE_PORT}` });
  } catch (err) {
    console.error("iPhone server start failed:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/templates/iphone/stop
router.get("/iphone/stop", (req, res) => {
  if (iphoneProcess) {
    iphoneProcess.kill("SIGTERM");
    iphoneProcess = null;
    iphoneReady = false;
    console.log("⏹ iPhone dev server stopped");
  }
  res.json({ success: true });
});

// GET /api/templates/iphone/files
router.get("/iphone/files", (req, res) => {
  try {
    const files = [];
    const exclude = ["node_modules", ".git", "dist", ".vscode"];

    function readDir(dir, base = "") {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (exclude.includes(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        const relPath = base ? `${base}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          readDir(fullPath, relPath);
        } else {
          const content = fs.readFileSync(fullPath, "utf8");
          files.push({ path: relPath, content });
        }
      }
    }

    if (fs.existsSync(IPHONE_DIR)) {
      readDir(IPHONE_DIR);
      res.json({ success: true, files });
    } else {
      res.status(404).json({ success: false, error: "iPhone directory not found" });
    }
  } catch (err) {
    console.error("Failed to read iPhone files:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
