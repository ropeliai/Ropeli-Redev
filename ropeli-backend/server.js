import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import paymentRoutes from "./payment.routes.js";
import generateRoutes from "./generate_route.js";
import ollamaRoutes from "./ollama_route.js";
import expoRoutes from "./expo_route.js";
import opsRoutes from "./ops_route.js";
import {
  getLivenessPayload,
  getReadinessResult,
} from "./health_readiness.js";
import { log, requestLogger } from "./logger.js";
import {
  errorHandlerMiddleware,
  installProcessErrorHandlers,
  notFoundHandler,
} from "./error_monitor.js";
import { validateStartupEnv } from "./env_validate.js";
import { requestTimeoutMiddleware } from "./request_timeout.middleware.js";
import { getAppEnv } from "./app_env.js";

dotenv.config();

validateStartupEnv();
installProcessErrorHandlers();

const app = express();

app.set("trust proxy", true);

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Supabase-Auth", "X-Ops-Token"],
  })
);

app.use(express.json());

app.use(requestTimeoutMiddleware());

app.use(requestLogger);

function livenessHandler(_req, res) {
  res.status(200).json({
    ...getLivenessPayload(),
  });
}

app.get("/health", livenessHandler);
app.get("/api/health", livenessHandler);

async function readinessHandler(_req, res) {
  const result = await getReadinessResult();
  const code = result.ok ? 200 : 503;
  res.status(code).json({
    status: result.status,
    checks: result.checks,
    timestamp: new Date().toISOString(),
  });
}

app.get("/ready", readinessHandler);
app.get("/api/ready", readinessHandler);

app.use("/api/payment", paymentRoutes);
app.use("/api/ollama", ollamaRoutes);
app.use("/api/generate", generateRoutes);
app.use("/api/expo", expoRoutes);
app.use("/api/ops", opsRoutes);

app.use(notFoundHandler);
app.use(errorHandlerMiddleware);

const PORT = process.env.PORT || 5000;

function shouldRunModalWakePing() {
  if (process.env.DISABLE_MODAL_WAKE_PING === "1") return false;
  if (process.env.ENABLE_MODAL_WAKE_PING === "1") return true;
  return getAppEnv() !== "development";
}

app.listen(PORT, () => {
  log.info("server listening", {
    port: PORT,
    url: `http://localhost:${PORT}`,
    appEnv: getAppEnv(),
  });

  if (shouldRunModalWakePing()) {
    const modalUrl =
      process.env.MODAL_API_URL ||
      "https://coutinhoandrew0--my-coder-model-generate.modal.run";
    setInterval(() => {
      fetch(modalUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "ping", type: "native" }),
      }).catch(() => {});
    }, 4 * 60 * 1000);
  }
});
