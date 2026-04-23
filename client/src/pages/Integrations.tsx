




import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/integrations.css";

const integrations = [
  {
    name: "Stripe",
    desc: "Accept payments",
    info: "Handle subscriptions and one-time payments securely.",
    icon: "https://cdn.simpleicons.org/stripe",
    docsUrl: "https://docs.stripe.com/api",
  },
  {
    name: "Razorpay",
    desc: "Payments in India",
    info: "Collect UPI, cards, and net-banking payments.",
    icon: "https://cdn.simpleicons.org/razorpay",
    docsUrl: "https://razorpay.com/docs/api/",
  },
  {
    name: "Supabase",
    desc: "Backend platform",
    info: "Authentication, database, and storage services.",
    icon: "https://cdn.simpleicons.org/supabase",
    docsUrl: "https://supabase.com/docs/guides/api",
  },
  {
    name: "Firebase",
    desc: "Realtime DB & auth",
    info: "Build real-time apps with auth and hosting.",
    icon: "https://cdn.simpleicons.org/firebase",
    docsUrl: "https://firebase.google.com/docs/reference/rest",
  },
  {
    name: "Slack",
    desc: "Team communication",
    info: "Send alerts and updates directly to Slack.",
    icon: "https://cdn.simpleicons.org/slack",
    docsUrl: "https://api.slack.com/docs",
  },
  {
    name: "Twilio",
    desc: "Messaging & Voice",
    info: "Send SMS, WhatsApp messages, and calls.",
    icon: "https://img.icons8.com/external-tal-revivo-bold-tal-revivo/1200/external-twilio-is-a-cloud-communications-platform-as-a-service-company-logo-bold-tal-revivo.jpg",
    docsUrl: "https://www.twilio.com/docs",
  },
  {
    name: "Resend",
    desc: "Email API",
    info: "Send transactional emails at scale.",
    icon: "https://cdn.simpleicons.org/resend",
    docsUrl: "https://resend.com/docs/api-reference",
  },
  {
    name: "GPT",
    desc: "AI models",
    info: "Generate text, code, and reasoning using GPT.",
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Tabler-icons_brand-openai.svg/640px-Tabler-icons_brand-openai.svg.png",
    docsUrl: "https://platform.openai.com/docs/api-reference",
  },
  {
    name: "Anthropic",
    desc: "Claude models",
    info: "Advanced reasoning and long-context AI models.",
    icon: "https://cdn.simpleicons.org/anthropic",
    docsUrl: "https://docs.anthropic.com/en/api",
  },
  {
    name: "Gemini",
    desc: "Google AI",
    info: "Multimodal AI models by Google.",
    icon: "https://cdn.simpleicons.org/google",
    docsUrl: "https://ai.google.dev/api",
  },
  {
    name: "Perplexity",
    desc: "AI search",
    info: "Answer questions with real-time web context.",
    icon: "https://cdn.simpleicons.org/perplexity",
    docsUrl: "https://docs.perplexity.ai/docs/api-reference",
  },
  {
    name: "Gmail",
    desc: "Email service",
    info: "Send and receive emails via Gmail integration.",
    icon: "https://cdn.simpleicons.org/gmail",
    docsUrl: "https://developers.google.com/gmail/api",
  },
  {
    name: "Calendar",
    desc: "Scheduling",
    info: "Sync and manage calendar events.",
    icon: "https://cdn.simpleicons.org/google",
    docsUrl: "https://developers.google.com/calendar/api",
  },
  {
    name: "Git / GitHub",
    desc: "Repository sync",
    info: "Connect repositories to sync code changes.",
    icon: "https://cdn.simpleicons.org/github",
    docsUrl: "https://docs.github.com/en/rest",
  },
  {
    name: "Airtable",
    desc: "Database sheets",
    info: "Sync structured data using Airtable bases.",
    icon: "https://cdn.simpleicons.org/airtable",
    docsUrl: "https://airtable.com/developers/web/api",
  },
  {
    name: "AdSense",
    desc: "Monetization",
    info: "Earn revenue by displaying ads in your apps.",
    icon: "https://cdn.simpleicons.org/google",
    docsUrl: "https://developers.google.com/adsense/api",
  },
];

export default function Integrations() {
  const openDocs = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <Navbar />

      <section className="integrations">
        <div className="integrations-header">
          <h1>Integrations</h1>
          <p>Connect your favorite tools and services</p>
        </div>

        <div className="integrations-grid">
          {integrations.map((item) => (
            <div
              className="integration-card"
              key={item.name}
              onClick={() => openDocs(item.docsUrl)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") openDocs(item.docsUrl);
              }}
            >
              <div className="integration-info">
                <img
                  src={item.icon}
                  alt={item.name}
                  className="integration-icon"
                />
                <div>
                  <h3>{item.name}</h3>
                  <p className="integration-desc">{item.desc}</p>
                </div>
              </div>

              <p className="integration-info-text">{item.info}</p>

              {/*<button
                className="integration-btn primary"
                onClick={(e) => {
                  e.stopPropagation();
                  openDocs(item.docsUrl);
                }}
              >
                Learn more
              </button>*/}
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
