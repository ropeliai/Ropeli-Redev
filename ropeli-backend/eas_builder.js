/**
 * eas_builder.js
 *
 * Triggers an EAS Android APK build and returns the build UUID as soon as
 * EAS prints it in stdout (usually within 30–60s). The child process keeps
 * running in the background — we call child.unref() so Node's event loop
 * is not held by the long (5–15 min) actual build.
 *
 * Actual progress is then polled via GET /api/expo/build-status/:buildId,
 * which proxies to the EAS REST API.
 *
 * Required env:
 *   EXPO_TOKEN — non-interactive EAS auth token
 *                (https://expo.dev/accounts/[user]/settings/access-tokens)
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const BUILD_ID_TIMEOUT_MS = 60_000;

// Matches the EAS build URL fragment, e.g.
//   https://expo.dev/accounts/.../builds/8f1a3c2e-1234-5678-9abc-def012345678
const BUILD_ID_RE =
  /builds\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

function writeEasJson(projectDir) {
  const easConfig = {
    cli: { version: ">= 5.0.0" },
    build: {
      preview: {
        android: { buildType: "apk" },
        distribution: "internal",
      },
    },
  };
  fs.writeFileSync(
    path.join(projectDir, "eas.json"),
    JSON.stringify(easConfig, null, 2),
    "utf8"
  );
}

/**
 * Trigger an EAS APK build at projectDir.
 * Resolves with { build_id } once EAS prints the build UUID.
 * Rejects if EXPO_TOKEN is missing, eas CLI errors, or UUID isn't found
 * within BUILD_ID_TIMEOUT_MS.
 */
export function triggerEASBuild(projectDir) {
  return new Promise((resolve, reject) => {
    if (!process.env.EXPO_TOKEN) {
      return reject(new Error("EXPO_TOKEN not set — EAS builds unavailable"));
    }

    try {
      writeEasJson(projectDir);
    } catch (err) {
      return reject(new Error(`Failed to write eas.json: ${err.message}`));
    }

    const child = spawn(
      "eas",
      ["build", "--platform", "android", "--profile", "preview", "--non-interactive"],
      {
        cwd: projectDir,
        // shell: true is required on Windows for `eas` to be resolved through PATH.
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          EXPO_TOKEN: process.env.EXPO_TOKEN,
          CI: "1",
          EXPO_NO_PROMPTS: "1",
        },
      }
    );

    let resolved = false;

    const deadline = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { child.kill(); } catch {}
        reject(new Error("EAS did not return a build ID within 60 seconds"));
      }
    }, BUILD_ID_TIMEOUT_MS);

    const onData = (data) => {
      const line = data.toString();
      process.stdout.write(`[eas] ${line}`);
      const match = line.match(BUILD_ID_RE);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(deadline);
        // Detach — EAS keeps running on Expo's servers regardless of this
        // process. We just need to stop holding Node's event loop.
        try { child.unref(); } catch {}
        resolve({ build_id: match[1] });
      }
    };

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);

    child.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(deadline);
        reject(err);
      }
    });

    child.on("exit", (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(deadline);
        reject(new Error(`eas CLI exited with code ${code} before printing a build ID`));
      }
    });
  });
}
