import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/pricing.css";

type Billing = "weekly" | "monthly" | "yearly";

const PRICING = {
  Breeze: {
    weekly: { "1M": 7, "2M": 0, "5M": 0 },
    monthly: { "1M": 24, "2M": 0, "5M": 0 },
    yearly: { "1M": 228, "2M": 0, "5M": 0 },
  },
  Peak: {
    weekly: { "1M": 15, "3M": 0, "10M": 0 },
    monthly: { "1M": 39, "3M": 0, "10M": 0 },
    yearly: { "1M": 372, "3M": 0, "10M": 0 },
  },
};

const Pricing = () => {
  const [billing, setBilling] = useState<Billing>("weekly");
  const [breezeTokens, setBreezeTokens] = useState("1M");
  const [peakTokens, setPeakTokens] = useState("1M");

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
          <div className="pricing-card">
            <span className="badge">Pro</span>
            <h3>Breeze</h3>
            <h2>
              ${PRICING.Breeze[billing][breezeTokens]}
              <span>/{billing}</span>
            </h2>

            <select
              className="token-select"
              value={breezeTokens}
              onChange={(e) => setBreezeTokens(e.target.value)}
            >
              <option value="1M">1M tokens</option>
              <option value="2M">2M tokens</option>
              <option value="5M">5M tokens</option>
            </select>

            <ul>
              <li>Supabase, Razorpay, Stripe</li>
              <li>AI-powered data tools</li>
              <li>No Ropeli branding</li>
              <li>Unused tokens roll over</li>
              <li>Custom domains</li>
              <li>Expanded database</li>
            </ul>

            <button className="secondary-btn">Get Started</button>
          </div>

          {/* Peak */}
          <div className="pricing-card">
            <span className="badge">Premium</span>
            <h3>Peak</h3>
            <h2>
              ${PRICING.Peak[billing][peakTokens]}
              {/* ${PRICING.Peak[billing][peakTokens as keyof typeof PRICING.Peak.weekly]} */}
              <span>/{billing}</span>
            </h2>

            <select
              className="token-select"
              value={peakTokens}
              onChange={(e) => setPeakTokens(e.target.value)}
            >
              <option value="1M">1M tokens</option>
              <option value="3M">3M tokens</option>
              <option value="10M">10M tokens</option>
            </select>

            <ul>
              <li>Multiple locals & regions</li>
              <li>Free domain (1 year)</li>
              <li>Priority support</li>
              <li>Unlimited storage</li>
              <li>Advanced marketing tools</li>
              <li>Dedicated onboarding</li>
              <li>SSO, SEO, SLAs</li>
            </ul>

            <button className="primary-btn">Get Started</button>
          </div>

          {/* Sail */}
          <div className="pricing-card">
            <span className="badge">Custom</span>
            <h3>Sail</h3>
            <h2>Contact Sales</h2>
            <p className="custom-text">
              Tailored solutions, custom integrations, and enterprise-grade support.
            </p>
            <button className="primary-btn">Contact Sales</button>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default Pricing;
