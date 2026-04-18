import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import paymentRoutes from "./payment.routes.js";
import generateRoutes from "./generate_route.js";
import ollamaRoutes from "./ollama_route.js";
import expoRoutes from "./expo_route.js";
import adminRoutes from "./admin_route.js";
import { attachUser, isAuthConfigured } from "./auth.middleware.js";

dotenv.config();

const app = express();

app.set("trust proxy", true);

app.use(cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Supabase-Auth"],
}));

app.use(express.json());

app.use(attachUser);

app.get("/api/health", (req, res) =>
    res.json({ status: "ok", authConfigured: isAuthConfigured() })
);

app.use("/api/payment", paymentRoutes);
app.use("/api/ollama", ollamaRoutes);
app.use("/api/generate", generateRoutes);
app.use("/api/expo", expoRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("✅ Backend server running on http://localhost:" + PORT);
    if (!isAuthConfigured()) {
        console.warn(
            "⚠️  SUPABASE_URL / SUPABASE_ANON_KEY not set — authenticated endpoints will reject all tokens."
        );
    }

    setInterval(() => {
        fetch(process.env.MODAL_API_URL || "https://coutinhoandrew0--my-coder-model-generate.modal.run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: "ping", type: "native" }),
        }).catch(() => {});
    }, 4 * 60 * 1000);
});
