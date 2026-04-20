import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import paymentRoutes from "./payment.routes.js";

dotenv.config();

const app = express();

const allowedOrigins = [
    "http://localhost:5173",
    "https://ropeliai.app",
    "https://www.ropeliai.app",
];

app.use(
    cors({
        origin: function(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("CORS not allowed"));
            }
        },
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type"],
    })
);

app.use(express.json());

app.use("/api/payment", paymentRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("Razorpay backend running on port", PORT);
});