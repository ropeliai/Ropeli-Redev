import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") }); // Load from project root early

import express from "express";
import cors from "cors";
import paymentRoutes from "./payment.routes.js";
import generateRoutes from "./generate_route.js";
import ollamaRoutes from "./ollama_route.js";
import expoRoutes from "./expo_route.js";
import agentRoutes from "./agent_route.js";
import { executeWorkflow } from "./agent_engine/index.js";
import { TriggerManager } from "./src/triggers/TriggerManager.ts";
import { createTriggerRoutes } from "./src/api/routes/triggers.routes.ts";
import { createWebhookRoutes } from "./src/api/routes/webhooks.routes.ts";

const app = express();
const triggerStorePath = join(__dirname, "trigger-store.json");

class JsonTriggerStore {
    constructor(filePath) {
        this.filePath = filePath;
        this.cache = new Map();
    }

    async load() {
        try {
            const raw = await fs.readFile(this.filePath, "utf8");
            const parsed = JSON.parse(raw);
            this.cache = new Map(parsed.map((record) => [`${record.workflowId}:${record.nodeId}`, record]));
        } catch (error) {
            this.cache = new Map();
        }
    }

    async persist() {
        const records = Array.from(this.cache.values());
        await fs.writeFile(this.filePath, JSON.stringify(records, null, 2), "utf8");
    }

    async upsert(record) {
        this.cache.set(`${record.workflowId}:${record.nodeId}`, record);
        await this.persist();
        return record;
    }

    async getByWorkflowAndNode(workflowId, nodeId) {
        return this.cache.get(`${workflowId}:${nodeId}`) || null;
    }

    async listActive() {
        return Array.from(this.cache.values()).filter((record) => record.status === "active");
    }

    async markInactive(workflowId, nodeId, disabledAt, reason) {
        const key = `${workflowId}:${nodeId}`;
        const record = this.cache.get(key);
        if (!record) {
            return;
        }

        this.cache.set(key, {
            ...record,
            status: "inactive",
            disabledAt,
            updatedAt: new Date().toISOString(),
            runtimeMetadata: {
                ...(record.runtimeMetadata || {}),
                reason,
            },
        });

        await this.persist();
    }
}

const triggerStore = new JsonTriggerStore(triggerStorePath);
const logger = {
    info: (message, meta) => console.log(message, meta || {}),
    warn: (message, meta) => console.warn(message, meta || {}),
    error: (message, meta) => console.error(message, meta || {}),
    debug: (message, meta) => console.debug(message, meta || {}),
};
const triggerManager = new TriggerManager(triggerStore, {
    executeWorkflow,
}, logger);

app.use(cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/payment", paymentRoutes);
app.use("/api/ollama", ollamaRoutes);
app.use("/api/generate", generateRoutes);
app.use("/api/expo", expoRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/workflows", createTriggerRoutes({ triggerManager, logger }));
app.use("/api/webhooks", createWebhookRoutes({ logger }));

// GitHub Proxy to bypass COOP/COEP browser restrictions
app.post("/api/github/proxy", async (req, res) => {
    const { url, token, method = "GET", body } = req.body;
    try {
        const response = await fetch(url, {
            method,
            headers: { 
                Authorization: `token ${token}`,
                "Content-Type": "application/json",
                "User-Agent": "Ropeli-Builder"
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: errorText });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("GitHub Proxy Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Image proxy to bypass COEP restrictions for external images
app.get("/api/img-proxy", async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).send("Missing url param");
    try {
        const response = await fetch(decodeURIComponent(url));
        const contentType = response.headers.get("content-type") || "image/png";
        res.set("Content-Type", contentType);
        res.set("Cross-Origin-Resource-Policy", "cross-origin");
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (error) {
        res.status(500).send("Proxy error: " + error.message);
    }
});

const PORT = process.env.PORT || 5000;

async function bootstrap() {
    await triggerStore.load();
    await triggerManager.restoreActiveTriggers();

    app.listen(PORT, () => {
        console.log("✅ Backend server running on http://localhost:" + PORT);

        setInterval(() => {
            fetch(process.env.MODAL_API_URL || "https://coutinhoandrew0--my-coder-model-generate.modal.run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: "ping", type: "native" }),
            }).catch(() => {});
        }, 4 * 60 * 1000);
    });
}

bootstrap().catch((error) => {
    console.error("Failed to bootstrap backend server:", error);
    process.exit(1);
});
