import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import paymentRoutes from "./payment.routes.js";

dotenv.config();

const app = express();

app.use(
    cors({
        origin: "http://localhost:5173",
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type"],
    })
);

app.use(express.json());

app.use("/api/payment", paymentRoutes);

app.listen(process.env.PORT, () => {
    console.log("Razorpay backend running on port", process.env.PORT);
});