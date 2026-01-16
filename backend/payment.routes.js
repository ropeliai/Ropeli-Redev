import express from "express";
import { createOrder, verifyPayment } from "./payment.controller.js";

const router = express.Router();

router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);

export default router;