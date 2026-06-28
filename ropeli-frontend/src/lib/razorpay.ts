/// <reference types="vite/client" />
import { supabase } from "./supabase";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type PaymentParams = {
  planName: string;
  billing: string;
  tokens: string;
  amount: number;

  onSuccess: () => void;
  onCancel: () => void;
  onFailure: () => void;
};

export const initiatePayment = async ({
  planName,
  billing,
  tokens,
  amount,
  onSuccess,
  onCancel,
  onFailure,
}: PaymentParams) => {
  try {
    // 1️⃣ Create order on backend
    const payload = {
      planName,
      billing,
      tokens,
      amount,
    };

    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/payment/create-order`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      throw new Error("Order creation failed");
    }

    const order = await res.json();
    console.log("ORDER:", order);

    // 2️⃣ Safety checks
    if (!window.Razorpay) throw new Error("Razorpay SDK not loaded");
    if (!order?.id) throw new Error("Invalid order response");

    // 3️⃣ Open Razorpay checkout with order_id
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY,
      amount: order.amount,
      currency: order.currency,
      order_id: order.id,

      name: "Ropeli AI",
      description: `${planName} • ${tokens} • ${billing}`,

      handler: async function (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          const verifyRes = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/api/payment/verify-payment`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planName,
              }),
            }
          );

          const result = await verifyRes.json();
          if (result.success) {
            onSuccess();
          } else {
            onFailure();
          }
        } catch (err) {
          console.error("Verify payment failed:", err);
          onFailure();
        }
      },

      modal: {
        ondismiss: function () {
          onCancel();
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (err) {
    console.error("Payment init failed:", err);
    onFailure();
  }
};
