import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/pricing.css";
import { useAuth } from "../context/AuthContext";
import { initiatePayment } from "../lib/razorpay";
import PaymentModal from "../components/PaymentModal";
import type { PaymentStatus } from "../types/payment";

import ContactSalesModal from "../components/ContactSalesModal";



type Billing = "weekly" | "monthly" | "yearly";

const FEATURES = {
  Breeze: {
    weekly: [
      "Supabase, Razorpay, Stripe",
      "No Ropeli branding",
      "Unused tokens roll over",
    ],
    monthly: [
      "Supabase, Razorpay, Stripe",
      "AI-powered data tools",
      "No Ropeli branding",
      "Unused tokens roll over",
      "Custom domains",
      "Expanded database",
    ],
    yearly: [
      "Supabase, Razorpay, Stripe",
      "AI-powered data tools",
      "No Ropeli branding",
      "Unused tokens roll over",
      "Custom domains",
      "Expanded database",
      "Advanced analytics",
      "Team collaboration",
    ],
  },

  Peak: {
    weekly: [
      "Multiple locals & regions",
      "Priority support",
      "Unlimited storage",
    ],
    monthly: [
      "Multiple locals & regions",
      "Free domain (1 year)",
      "Priority support",
      "Unlimited storage",
      "Advanced marketing tools",
    ],
    yearly: [
      "Multiple locals & regions",
      "Free domain (1 year)",
      "Priority support",
      "Unlimited storage",
      "Advanced marketing tools",
      "Dedicated onboarding",
      "SSO, SEO, SLAs",
    ],
  },
};

const PRICING = {
  Breeze: {
    weekly: { "10M": 7, "20M": 14, "30M": 21 , "40M": 28, "50M": 35, },
    monthly: { "10M": 24, "20M": 48, "30M": 72, "40M": 96, "50M": 120, },
    yearly: { "10M": 228, "20M": 456, "30M": 684 , "40M": 912, "50M": 1140, }
  },
  Peak: {
    weekly: { "10M": 15, "20M": 30, "30M": 45, "40M": 60, "50M": 75 },
    monthly: { "10M": 39, "20M": 78, "30M": 117, "40M": 156, "50M": 195 },
    yearly: { "10M": 372, "20M": 744, "30M": 1116, "40M": 1488, "50M": 1860 },
  },
};

const getDiscountedPrice = (original: number) => {
  return Math.round(original * 0.6); // 40% off = 60% of original
};

const getSavingsAmount = (original: number) => {
  return Math.round(original * 0.4); // 40% savings
};


// Function to handle payment initiation
const Pricing = () => {
  const [billing, setBilling] = useState<Billing>("weekly");
  const [breezeTokens, setBreezeTokens] = useState("10M");
  const [peakTokens, setPeakTokens] = useState("10M");
// Payment modal state
const [paymentOpen, setPaymentOpen] = useState(false);
type PaymentStatus = "idle" | "loading" | "success" | "cancelled" | "failed";


const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");


  const { user, setAuthModalOpen } = useAuth();
  const isGuest = !user;


/*contact sales modal state*/
const [openSales, setOpenSales] = useState(false);

  return (
    <>
      <Navbar />

      <section className="pricing">
        {/* Header */}
        <div className="pricing-header">
          <p className="pricing-subtitle">Start free. Scale as you grow.</p>

          <div className="billing-toggle">
            {(["weekly", "monthly", "yearly"] as Billing[]).map((item) => (
              <button
                key={item}
                className={billing === item ? "active" : ""}
                onClick={() => setBilling(item)}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="pricing-grid">
          {/* Root */}
          <div className="pricing-card">
            <span className="badge">Basic</span>
            <h3>Root</h3>
            <h2>$0 <span>/{billing}</span></h2>
            <ul>
              <li>Build up to 2 apps per day</li>
              <li>Access 100+ templates</li>
              <li>1M tokens per month</li>
              <li>Public projects only</li>
              <li>Download code anytime</li>
              <li>Ropeli branding</li>
            </ul>
            <button className="secondary-btn">Get Started</button>
          </div>

          {/* Breeze */}
          <div className={`pricing-card ${"Breeze" === "Breeze" ? "featured" : ""}`}>
            <div className="card-inner"></div>
            <span className="badge">Pro</span>
            <h3>Breeze</h3>
            <h2>
              <span className="original-price">
                ${PRICING.Breeze[billing][breezeTokens as keyof typeof PRICING.Breeze.weekly]}
              </span>
              <span className="discounted-price">
                ${getDiscountedPrice(PRICING.Breeze[billing][breezeTokens as keyof typeof PRICING.Breeze.weekly])}
              </span>
              <span>/{billing}</span>
            </h2>

            <select
              className="token-select"
              value={breezeTokens}
              onChange={(e) => setBreezeTokens(e.target.value)}
            >
              <option value="10M">10M tokens</option>
              <option value="20M">20M tokens</option>
              <option value="30M">30M tokens</option>
              <option value="40M">40M tokens</option>
              <option value="50M">50M tokens</option>
            </select>
            <ul>
              {FEATURES.Breeze[billing].map((feature, index) => (
              <li key={index}>{feature}</li>
              ))}
            </ul>


{/*<button
  className="secondary-btn"
  onClick={() => {
  console.log("BREEZE CLICKED");
  initiatePayment({
    planName: "Breeze",
    billing,
    tokens: breezeTokens,
    amount: 1,
  });
}}>
  Get Started
</button>*/}
<button
  className={`secondary-btn ${isGuest ? "disabled-btn" : ""}`}
  onClick={() => {
    if (isGuest) {
      setAuthModalOpen(true);
      return;
    }

    const price =
      PRICING.Breeze[billing]?.[
        breezeTokens as keyof (typeof PRICING.Breeze)[typeof billing]
      ];

    if (!price) return;

    setPaymentStatus("loading");

setTimeout(() => {
  setPaymentOpen(true);
}, 200);

initiatePayment({
  planName: "Breeze",
  billing,
  tokens: breezeTokens,
  amount: getDiscountedPrice(price),

  onSuccess: () => setPaymentStatus("success"),
  onCancel: () => setPaymentStatus("cancelled"),
  onFailure: () => setPaymentStatus("failed"),
});

  }}
>
  Get Started
</button>






          </div>

          {/* Peak */}
          <div className="pricing-card">
            <span className="badge">Premium</span>
            <h3>Peak</h3>
            <h2>
            <span className="original-price">
                ${PRICING.Peak[billing][peakTokens as keyof typeof PRICING.Peak.weekly]}
              </span>
              <span className="discounted-price">
                ${getDiscountedPrice(PRICING.Peak[billing][peakTokens as keyof typeof PRICING.Peak.weekly])}
              </span>
              <span>/{billing}</span>
            </h2>

            <select
              className="token-select"
              value={peakTokens}
              onChange={(e) => setPeakTokens(e.target.value)}
            >

              <option value="10M">10M tokens</option>
              <option value="20M">20M tokens</option>
              <option value="30M">30M tokens</option>
              <option value="40M">40M tokens</option>
              <option value="50M">50M tokens</option>
            </select>
            <ul>
              {FEATURES.Peak[billing].map((feature, index) => (
                <li key={index}>{feature}</li>
             ))}
            </ul>

<button
  className={`secondary-btn ${isGuest ? "disabled-btn" : ""}`}
  onClick={() => {
    if (isGuest) {
      setAuthModalOpen(true);
      return;
    }

    const price =
      PRICING.Peak[billing]?.[
        peakTokens as keyof (typeof PRICING.Peak)[typeof billing]
      ];

    if (!price) return;

    setPaymentStatus("loading");

setTimeout(() => {
  setPaymentOpen(true);
}, 200);

initiatePayment({
  planName: "peak",
  billing,
  tokens: peakTokens,
  amount: getDiscountedPrice(price),

  onSuccess: () => setPaymentStatus("success"),
  onCancel: () => setPaymentStatus("cancelled"),
  onFailure: () => setPaymentStatus("failed"),
});

  }}
>
  Get Started
</button>




          </div>

          {/* Sail */}
          <div className="pricing-card">
            <span className="badge">Custom</span>
            <h3>Sail</h3>
            <h2>Contact Sales</h2>
            <p className="custom-text">
              Tailored solutions, custom integrations, and enterprise-grade support.
            </p>
           <button 
           className={`secondary-btn ${isGuest ? "disabled-btn" : ""}`}
           aria-disabled={isGuest}
           onClick={() => {
           if (isGuest) {
               setAuthModalOpen(true);
               return;
            }
            setOpenSales(true);
          }} >
               Contact Sales
            </button>


          </div>
        </div>
      </section>

      {/* CONTACT SALES MODAL */}
      <ContactSalesModal open={openSales} onClose={() => setOpenSales(false)}/>
      {/* PAYMENT MODAL */}
      <PaymentModal
  open={paymentOpen}
  status={paymentStatus}
  onClose={() => {
    setPaymentOpen(false);
    setPaymentStatus("idle");
  }}
  onRetry={() => {
    setPaymentOpen(false);
    setPaymentStatus("idle");
  }}
/>


      <Footer />
    </>
  );
};

export default Pricing;
