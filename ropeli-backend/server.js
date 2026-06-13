import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import paymentRoutes from "./payment.routes.js";
import generateRoutes from "./generate_route.js";
import ollamaRoutes from "./ollama_route.js";
import expoRoutes from "./expo_route.js";
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

app.use(cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/payment", paymentRoutes);
app.use("/api/ollama", ollamaRoutes);
app.use("/api/generate", generateRoutes);
app.use("/api/expo", expoRoutes);
app.use('/preview', express.static(join(__dirname, 'previews')));

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
