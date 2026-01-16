import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/pricing.css";
import ContactSalesModal from "../components/ContactSalesModal";



type Billing = "weekly" | "monthly" | "yearly";

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

const Pricing = () => {
  const [billing, setBilling] = useState<Billing>("weekly");
  const [breezeTokens, setBreezeTokens] = useState("10M");
  const [peakTokens, setPeakTokens] = useState("10M");


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
              <li>Supabase, Razorpay, Stripe</li>
              <li>No Ropeli branding</li>
              <li>Unused tokens roll over</li>
            </ul>

            <button className="secondary-btn">Get Started</button>
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
            <button className="primary-btn" onClick={() => setOpenSales(true)}>
  Contact Sales
</button>

          </div>
        </div>
      </section>

      {/* CONTACT SALES MODAL */}
      <ContactSalesModal open={openSales} onClose={() => setOpenSales(false)}/>


      <Footer />
    </>
  );
};

export default Pricing;
