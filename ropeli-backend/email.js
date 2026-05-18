/**
 * email.js
 *
 * Sends transactional emails via SMTP (nodemailer). If SMTP is not configured
 * (any of SMTP_HOST / SMTP_USER / SMTP_PASS missing) this module no-ops
 * silently so local dev never fails because email isn't wired up.
 *
 * Env:
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS, SMTP_FROM
 */

import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || "587", 10),
    secure: SMTP_PORT === "465",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

/**
 * Send the "your APK is ready" notification.
 * Never throws — failures are logged so a broken SMTP server can never
 * cause a 500 on the build-status polling endpoint.
 */
export async function sendBuildReadyEmail(to, apkUrl, buildId) {
  if (!to || !apkUrl) return;
  const t = getTransporter();
  if (!t) {
    console.log("[email] SMTP not configured — skipping APK-ready email");
    return;
  }

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: "Your Ropeli APK is ready to install",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1B4F8A">Your app is ready!</h2>
          <p>Your Android APK has finished building.</p>
          <a href="${apkUrl}" style="display:inline-block;background:#1B4F8A;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
            Download APK
          </a>
          <p style="color:#666;font-size:14px">
            <strong>To install on Android:</strong><br>
            1. Open Settings → Security<br>
            2. Enable "Install from unknown sources" (or "Install unknown apps")<br>
            3. Tap the download link above and open the file
          </p>
          <p style="color:#999;font-size:12px">Build ID: ${buildId}</p>
        </div>
      `,
    });
    console.log(`[email] APK-ready email sent to ${to}`);
  } catch (err) {
    console.warn("[email] send failed:", err?.message || err);
  }
}
