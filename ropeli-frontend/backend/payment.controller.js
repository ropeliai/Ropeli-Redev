import razorpay from "./razorpay.js";
import crypto from "crypto";

export const createOrder = async(req, res) => {
    const { amount, planName, billing, tokens } = req.body;

    const order = await razorpay.orders.create({
        amount: amount * 100,
        currency: "INR",
        receipt: `ropeli_${Date.now()}`,
        notes: { planName, billing, tokens },
    });

    res.json(order);
};

export const verifyPayment = (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
    } = req.body;

    const sign =
        razorpay_order_id + "|" + razorpay_payment_id;

    const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(sign)
        .digest("hex");

    res.json({ success: expected === razorpay_signature });
};