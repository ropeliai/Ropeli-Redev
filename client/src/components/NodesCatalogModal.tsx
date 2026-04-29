import React, { useState } from "react";
import {
  Zap, Webhook, Clock, MousePointerClick, AlertTriangle, Globe,
  Settings2, GitBranch, Shuffle, GitMerge, GitFork, RefreshCw,
  Terminal, FileText, FilePen, Package, X, Search
} from "lucide-react";
import "../styles/navbar.css";
import { BRAND_SVGS } from "../brandIcons";
// ─── Lucide icon map for core/workflow nodes ─────────────────────────────────
const LUCIDE_ICONS: Record<string, React.FC<{ size?: number; color?: string; strokeWidth?: number }>> = {
  trigger: Zap,
  webhook: Webhook,
  schedule: Clock,
  manual: MousePointerClick,
  error: AlertTriangle,
  http: Globe,
  set: Settings2,
  if: GitBranch,
  switch: Shuffle,
  merge: GitMerge,
  split: GitFork,
  loop: RefreshCw,
  execute: Terminal,
  read: FileText,
  write: FilePen,
};

// ─── SimpleIcons slugs for brand nodes (fetched directly, no proxy) ──────────
const BRAND_ICONS: Record<string, string> = {
  // AI & ML
  openai: "openai",
  claude: "anthropic",
  gemini: "googlegemini",
  ollama: "ollama",
  huggingface: "huggingface",
  mistral: "mistral",
  cohere: "cohere",
  pinecone: "pinecone",
  qdrant: "qdrant",
  milvus: "milvus",
  elevenlabs: "elevenlabs",
  midjourney: "midjourney",
  dalle: "openai",
  stablediffusion: "stability",
  replicate: "replicate",
  aws_textract: "amazonaws",
  google_vision: "googlecloud",
  // Social Media
  instagram: "instagram",
  facebook: "facebook",
  twitter: "x",
  linkedin: "linkedin",
  tiktok: "tiktok",
  pinterest: "pinterest",
  youtube: "youtube",
  reddit: "reddit",
  discord: "discord",
  snapchat: "snapchat",
  telegram: "telegram",
  whatsapp: "whatsapp",
  slack: "slack",
  twitch: "twitch",
  // Communication & Email
  gmail: "gmail",
  outlook: "microsoftoutlook",
  sendgrid: "sendgrid",
  mailchimp: "mailchimp",
  twilio: "twilio",
  postmark: "postmark",
  activecampaign: "activecampaign",
  customerio: "customerio",
  klaviyo: "klaviyo",
  intercom: "intercom",
  zendesk: "zendesk",
  freshdesk: "freshdesk",
  // Data & Databases
  mysql: "mysql",
  postgresql: "postgresql",
  mongodb: "mongodb",
  redis: "redis",
  supabase: "supabase",
  firebase: "firebase",
  snowflake: "snowflake",
  bigquery: "googlebigquery",
  aws_s3: "amazons3",
  airtable: "airtable",
  notion: "notion",
  google_sheets: "googlesheets",
  excel: "microsoftexcel",
  dynamodb: "amazondynamodb",
  elasticsearch: "elasticsearch",
  // CRM & Sales
  salesforce: "salesforce",
  hubspot: "hubspot",
  pipedrive: "pipedrive",
  zoho: "zoho",
  monday: "monday",
  clickup: "clickup",
  asana: "asana",
  trello: "trello",
  jira: "jira",
  linear: "linear",
  stripe: "stripe",
  paypal: "paypal",
  square: "square",
  shopify: "shopify",
  woocommerce: "woocommerce",
  // Marketing & Analytics
  google_analytics: "googleanalytics",
  mixpanel: "mixpanel",
  amplitude: "amplitude",
  segment: "segment",
  facebook_ads: "facebook",
  google_ads: "googleads",
  linkedin_ads: "linkedin",
  tiktok_ads: "tiktok",
  hotjar: "hotjar",
  mailgun: "mailgun",
  typeform: "typeform",
  typebot: "typebot",
  // Developer Tools
  github: "github",
  gitlab: "gitlab",
  bitbucket: "bitbucket",
  docker: "docker",
  aws_ec2: "amazonec2",
  vercel: "vercel",
  netlify: "netlify",
  cloudflare: "cloudflare",
  datadog: "datadog",
  sentry: "sentry",
  pagerduty: "pagerduty",
  grafana: "grafana",
};

// ─── Per-category accent colors for node badges ──────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  "Core / Triggers":         "#5ef2e4",
  "AI & ML":                 "#a78bfa",
  "Social Media":            "#f472b6",
  "Communication & Email":   "#60a5fa",
  "Data & Databases":        "#34d399",
  "CRM & Sales":             "#fb923c",
  "Marketing & Analytics":   "#facc15",
  "Developer Tools":         "#94a3b8",
};

// ─── Icon renderer ────────────────────────────────────────────────────────────
const NodeIcon: React.FC<{ type: string; color: string }> = ({ type, color }) => {
  const LucideIcon = LUCIDE_ICONS[type];
  const brandSvgPath = BRAND_SVGS[type];

  const wrapStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: `${color}18`,
    border: `1px solid ${color}40`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  if (LucideIcon) {
    return (
      <div style={wrapStyle}>
        <LucideIcon size={18} color={color} strokeWidth={1.8} />
      </div>
    );
  }

  if (brandSvgPath) {
    return (
      <div style={wrapStyle}>
        <svg
          role="img"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="#ffffff"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>{type}</title>
          <path d={brandSvgPath} />
        </svg>
      </div>
    );
  }

  // fallback
  return (
    <div style={wrapStyle}>
      <Package size={18} color={color} strokeWidth={1.8} />
    </div>
  );
};

// ─── Categories ───────────────────────────────────────────────────────────────
const categories = [
  {
    name: "Core / Triggers",
    nodes: [
      { type: "trigger", label: "Trigger" }, { type: "webhook", label: "Webhook" },
      { type: "schedule", label: "Schedule" }, { type: "manual", label: "Manual Trigger" },
      { type: "error", label: "Error Trigger" }, { type: "http", label: "HTTP Request" },
      { type: "set", label: "Set" }, { type: "if", label: "IF" },
      { type: "switch", label: "Switch" }, { type: "merge", label: "Merge" },
      { type: "split", label: "Split" }, { type: "loop", label: "Loop" },
      { type: "execute", label: "Execute Command" }, { type: "read", label: "Read File" },
      { type: "write", label: "Write File" },
    ],
  },
  {
    name: "AI & ML",
    nodes: [
      { type: "openai", label: "OpenAI" }, { type: "claude", label: "Claude" },
      { type: "gemini", label: "Google Gemini" }, { type: "ollama", label: "Ollama" },
      { type: "huggingface", label: "HuggingFace" }, { type: "mistral", label: "Mistral" },
      { type: "cohere", label: "Cohere" }, { type: "pinecone", label: "Pinecone" },
      { type: "qdrant", label: "Qdrant" }, { type: "milvus", label: "Milvus" },
      { type: "elevenlabs", label: "ElevenLabs" }, { type: "midjourney", label: "Midjourney" },
      { type: "dalle", label: "DALL-E" }, { type: "stablediffusion", label: "Stable Diffusion" },
      { type: "replicate", label: "Replicate" }, { type: "aws_textract", label: "AWS Textract" },
      { type: "google_vision", label: "Google Vision" },
    ],
  },
  {
    name: "Social Media",
    nodes: [
      { type: "instagram", label: "Instagram" }, { type: "facebook", label: "Facebook" },
      { type: "twitter", label: "X (Twitter)" }, { type: "linkedin", label: "LinkedIn" },
      { type: "tiktok", label: "TikTok" }, { type: "pinterest", label: "Pinterest" },
      { type: "youtube", label: "YouTube" }, { type: "reddit", label: "Reddit" },
      { type: "discord", label: "Discord" }, { type: "snapchat", label: "Snapchat" },
      { type: "telegram", label: "Telegram" }, { type: "whatsapp", label: "WhatsApp" },
      { type: "slack", label: "Slack" }, { type: "twitch", label: "Twitch" },
    ],
  },
  {
    name: "Communication & Email",
    nodes: [
      { type: "gmail", label: "Gmail" }, { type: "outlook", label: "Outlook" },
      { type: "sendgrid", label: "SendGrid" }, { type: "mailchimp", label: "Mailchimp" },
      { type: "twilio", label: "Twilio" }, { type: "postmark", label: "Postmark" },
      { type: "activecampaign", label: "ActiveCampaign" }, { type: "customerio", label: "Customer.io" },
      { type: "klaviyo", label: "Klaviyo" }, { type: "intercom", label: "Intercom" },
      { type: "zendesk", label: "Zendesk" }, { type: "freshdesk", label: "Freshdesk" },
    ],
  },
  {
    name: "Data & Databases",
    nodes: [
      { type: "mysql", label: "MySQL" }, { type: "postgresql", label: "PostgreSQL" },
      { type: "mongodb", label: "MongoDB" }, { type: "redis", label: "Redis" },
      { type: "supabase", label: "Supabase" }, { type: "firebase", label: "Firebase" },
      { type: "snowflake", label: "Snowflake" }, { type: "bigquery", label: "BigQuery" },
      { type: "aws_s3", label: "AWS S3" }, { type: "airtable", label: "Airtable" },
      { type: "notion", label: "Notion" }, { type: "google_sheets", label: "Google Sheets" },
      { type: "excel", label: "Excel" }, { type: "dynamodb", label: "DynamoDB" },
      { type: "elasticsearch", label: "ElasticSearch" },
    ],
  },
  {
    name: "CRM & Sales",
    nodes: [
      { type: "salesforce", label: "Salesforce" }, { type: "hubspot", label: "HubSpot" },
      { type: "pipedrive", label: "Pipedrive" }, { type: "zoho", label: "Zoho CRM" },
      { type: "monday", label: "Monday.com" }, { type: "clickup", label: "ClickUp" },
      { type: "asana", label: "Asana" }, { type: "trello", label: "Trello" },
      { type: "jira", label: "Jira" }, { type: "linear", label: "Linear" },
      { type: "stripe", label: "Stripe" }, { type: "paypal", label: "PayPal" },
      { type: "square", label: "Square" }, { type: "shopify", label: "Shopify" },
      { type: "woocommerce", label: "WooCommerce" },
    ],
  },
  {
    name: "Marketing & Analytics",
    nodes: [
      { type: "google_analytics", label: "Google Analytics" }, { type: "mixpanel", label: "Mixpanel" },
      { type: "amplitude", label: "Amplitude" }, { type: "segment", label: "Segment" },
      { type: "facebook_ads", label: "Facebook Ads" }, { type: "google_ads", label: "Google Ads" },
      { type: "linkedin_ads", label: "LinkedIn Ads" }, { type: "tiktok_ads", label: "TikTok Ads" },
      { type: "hotjar", label: "Hotjar" }, { type: "mailgun", label: "Mailgun" },
      { type: "typeform", label: "Typeform" }, { type: "typebot", label: "Typebot" },
    ],
  },
  {
    name: "Developer Tools",
    nodes: [
      { type: "github", label: "GitHub" }, { type: "gitlab", label: "GitLab" },
      { type: "bitbucket", label: "Bitbucket" }, { type: "docker", label: "Docker" },
      { type: "aws_ec2", label: "AWS EC2" }, { type: "vercel", label: "Vercel" },
      { type: "netlify", label: "Netlify" }, { type: "cloudflare", label: "Cloudflare" },
      { type: "datadog", label: "Datadog" }, { type: "sentry", label: "Sentry" },
      { type: "pagerduty", label: "PagerDuty" }, { type: "grafana", label: "Grafana" },
    ],
  },
];

// ─── Modal ────────────────────────────────────────────────────────────────────
interface NodesCatalogModalProps {
  open: boolean;
  onClose: () => void;
}

const NodesCatalogModal: React.FC<NodesCatalogModalProps> = ({ open, onClose }) => {
  const [search, setSearch] = useState("");

  if (!open) return null;

  const query = search.toLowerCase();

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 820,
          width: "90%",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0f",
          border: "1px solid #1e1e2e",
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.85)",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "22px 24px 16px",
            borderBottom: "1px solid #1e1e2e",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "linear-gradient(135deg, #0d0d18 0%, #0a0a0f 100%)",
          }}
        >
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "#fff", letterSpacing: "-0.3px" }}>
              AI Agent Nodes Catalog
            </h2>
            <p style={{ margin: 0, color: "#666", fontSize: 13 }}>
              100+ nodes to build powerful automation workflows
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#1a1a2a",
              border: "1px solid #2a2a3a",
              color: "#aaa",
              width: 32,
              height: 32,
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Search ── */}
        <div style={{ padding: "14px 24px", borderBottom: "1px solid #1e1e2e", position: "relative" }}>
          <Search
            size={16}
            color="#555"
            style={{ position: "absolute", left: 40, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px 12px 42px",
              borderRadius: 10,
              border: "1px solid rgba(255, 255, 255, 0.08)",
              background: "rgba(255, 255, 255, 0.03)",
              color: "#fff",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              transition: "all 0.3s ease",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)"
            }}
            onFocus={(e) => { 
              e.currentTarget.style.borderColor = "rgba(94, 242, 228, 0.5)"; 
              e.currentTarget.style.boxShadow = "0 0 0 2px rgba(94, 242, 228, 0.1), inset 0 2px 4px rgba(0,0,0,0.2)"; 
            }}
            onBlur={(e) => { 
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)"; 
              e.currentTarget.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.2)"; 
            }}
          />
        </div>

        {/* ── Categories ── */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "grid", gap: 28 }}>
          {categories.map((category) => {
            const accent = CATEGORY_COLORS[category.name] ?? "#5ef2e4";
            const filtered = category.nodes.filter(
              (n) =>
                n.label.toLowerCase().includes(query) ||
                n.type.toLowerCase().includes(query)
            );
            if (filtered.length === 0) return null;

            return (
              <div key={category.name}>
                {/* Category heading */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 3, height: 14, borderRadius: 2, background: accent }} />
                  <h3
                    style={{
                      fontSize: 11,
                      color: accent,
                      textTransform: "uppercase",
                      letterSpacing: "1.2px",
                      fontWeight: 600,
                      margin: 0,
                    }}
                  >
                    {category.name}
                  </h3>
                  <span style={{ fontSize: 11, color: "#444", marginLeft: 4 }}>
                    {filtered.length}
                  </span>
                </div>

                {/* Node grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                    gap: 8,
                  }}
                >
                  {filtered.map((node) => (
                    <div
                      key={node.type}
                      style={{
                        background: "rgba(20, 20, 31, 0.85)",
                        border: `1px solid rgba(255, 255, 255, 0.05)`,
                        borderRadius: 12,
                        padding: "12px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        cursor: "pointer",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                        position: "relative",
                        overflow: "hidden"
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = `${accent}60`;
                        (e.currentTarget as HTMLDivElement).style.background = "linear-gradient(135deg, rgba(26,26,46,0.95) 0%, rgba(15,15,25,0.95) 100%)";
                        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 16px ${accent}20`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255, 255, 255, 0.05)";
                        (e.currentTarget as HTMLDivElement).style.background = "rgba(20, 20, 31, 0.85)";
                        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
                      }}
                    >
                      <NodeIcon type={node.type} color={accent} />
                      <span style={{ color: "#fff", fontSize: 13, fontWeight: 600, letterSpacing: "0.2px", lineHeight: 1.3 }}>
                        {node.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NodesCatalogModal;
