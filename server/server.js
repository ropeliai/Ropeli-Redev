import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") }); // Load from project root early

import express from "express";
import cors from "cors";
import paymentRoutes from "./payment.routes.js";
import generateRoutes from "./generate_route.js";
import ollamaRoutes from "./ollama_route.js";
import expoRoutes from "./expo_route.js";
import agentRoutes from "./agent_route.js";
import templateRoutes from "./template_route.js";

const app = express();

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
app.use("/api/templates", templateRoutes);

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
