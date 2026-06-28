import express from "express";
import { createOrder, verifyPayment } from "./payment.controller.js";
import requireAuth from "./middleware/requireAuth.js";

const router = express.Router();

router.post("/create-order", createOrder);
router.post("/verify-payment", requireAuth, verifyPayment);

export default router;