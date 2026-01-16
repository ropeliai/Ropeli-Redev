/// <reference types="vite/client" />

export const initiatePayment = async (payload: any) => {
  // ...existing code...  alert("initiatePayment CALLED");

  if (!(window as any).Razorpay) {
    alert(" Razorpay SDK NOT loaded");
    console.error("Razorpay missing");
    return;
  }

  

  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/api/payment/create-order`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const order = await res.json();
  console.log("ORDER:", order);

  const rzp = new (window as any).Razorpay({
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: order.amount,
     currency: "USD",
    name: "RopeliAI",
    description: payload.planName,
    image: "/logo.svg",
    order_id: order.id,
    handler: () => alert(" PAYMENT SUCCESS"),
  });

  rzp.open();
};
