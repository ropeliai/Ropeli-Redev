import razorpay from "./razorpay.js";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

let cachedServiceClient = null;
function getServiceClient() {
  if (cachedServiceClient) return cachedServiceClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedServiceClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedServiceClient;
}

// Only known plan values are allowed — prevents arbitrary writes
const ALLOWED_PLANS = { pro: "pro", unlimited: "unlimited" };

export const createOrder = async (req, res) => {
  if (!razorpay) {
    return res.status(503).json({ error: "Payment service not configured" });
  }
  const { amount, planName, billing, tokens } = req.body;

  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: `ropeli_${Date.now()}`,
    notes: { planName, billing, tokens },
  });

  res.json(order);
};

export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    planName,
  } = req.body;

  // Signature verification
  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(sign)
    .digest("hex");

  if (expected !== razorpay_signature) {
    console.warn("[payment] signature mismatch for order:", razorpay_order_id);
    return res.json({ success: false });
  }

  // Map planName to a known plan value — default to "pro" if unrecognised
  const plan = ALLOWED_PLANS[String(planName || "").toLowerCase()] || "pro";

  // Upgrade the user's plan in Supabase
  const sb = getServiceClient();
  if (sb && req.user?.id) {
    const { error } = await sb
      .from("profiles")
      .upsert({ id: req.user.id, plan }, { onConflict: "id" });
    if (error) {
      console.error("[payment] profiles upsert failed:", error.message);
      // Still return success — payment went through, retry upgrade on next request
    } else {
      console.log(`[payment] user ${req.user.id} upgraded to plan: ${plan}`);
    }
  } else {
    console.warn("[payment] service client or user id unavailable — plan not written");
  }

  res.json({ success: true, plan });
};
