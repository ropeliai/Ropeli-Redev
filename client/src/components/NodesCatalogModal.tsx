import React, { useState } from "react";
import "../styles/navbar.css";

const icons: Record<string, string> = {
  trigger: '⚡', webhook: '🪝', schedule: '⏱️', manual: '👆', error: '⚠️', http: '🌐', set: '📝', if: '⚖️', switch: '🔀', merge: '⏬', split: '⏫', loop: '🔁', execute: '💻', read: '📖', write: '✏️',
  openai: '🧠', claude: '🤖', gemini: '✨', ollama: '🦙', huggingface: '🤗', mistral: '🌪️', cohere: '⚛️', pinecone: '🌲', qdrant: '🎯', milvus: '🗄️', elevenlabs: '🎙️', midjourney: '🎨', dalle: '🖼️', stablediffusion: '🌌', replicate: '🧬', aws_textract: '📄', google_vision: '👁️',
  instagram: '📸', facebook: '📘', twitter: '🐦', linkedin: '💼', tiktok: '🎵', pinterest: '📌', youtube: '▶️', reddit: '👽', discord: '👾', snapchat: '👻', telegram: '✈️', whatsapp: '💬', slack: '💬', twitch: '🎮',
  gmail: '📧', outlook: '📨', sendgrid: '📮', mailchimp: '🐵', twilio: '📱', postmark: '📫', activecampaign: '🎯', customerio: '👥', klaviyo: '📈', intercom: '🎧', zendesk: '🤝', freshdesk: '🎫',
  mysql: '🐬', postgresql: '🐘', mongodb: '🍃', redis: '⚡', supabase: '🟢', firebase: '🔥', snowflake: '❄️', bigquery: '🔍', aws_s3: '🪣', airtable: '📊', notion: '📓', google_sheets: '📗', excel: '📊', dynamodb: '⚡', elasticsearch: '🔎',
  salesforce: '☁️', hubspot: '🟠', pipedrive: '🚀', zoho: '🏢', monday: '📅', clickup: '✅', asana: '🎯', trello: '📋', jira: '🛠️', linear: '📈', stripe: '💳', paypal: '💰', square: '⬛', shopify: '🛍️', woocommerce: '🛒',
  google_analytics: '📈', mixpanel: '📊', amplitude: '📉', segment: '🧩', facebook_ads: '📢', google_ads: '🎯', linkedin_ads: '👔', tiktok_ads: '📱', hotjar: '🔥', mailgun: '🔫', typeform: '📝', typebot: '🤖',
  github: '🐙', gitlab: '🦊', bitbucket: '🪣', docker: '🐳', aws_ec2: '☁️', vercel: '▲', netlify: '🌐', cloudflare: '☁️', datadog: '🐶', sentry: '🚨', pagerduty: '📟', grafana: '📊',
  default: '📦'
};

const categories = [
  {
    name: "Core / Triggers",
    nodes: [
      { type: 'trigger', label: 'Trigger' }, { type: 'webhook', label: 'Webhook' }, { type: 'schedule', label: 'Schedule' }, { type: 'manual', label: 'Manual Trigger' },
      { type: 'error', label: 'Error Trigger' }, { type: 'http', label: 'HTTP Request' }, { type: 'set', label: 'Set' }, { type: 'if', label: 'IF' },
      { type: 'switch', label: 'Switch' }, { type: 'merge', label: 'Merge' }, { type: 'split', label: 'Split' }, { type: 'loop', label: 'Loop' },
      { type: 'execute', label: 'Execute Command' }, { type: 'read', label: 'Read File' }, { type: 'write', label: 'Write File' }
    ]
  },
  {
    name: "AI & ML",
    nodes: [
      { type: 'openai', label: 'OpenAI' }, { type: 'claude', label: 'Claude' }, { type: 'gemini', label: 'Google Gemini' }, { type: 'ollama', label: 'Ollama' },
      { type: 'huggingface', label: 'HuggingFace' }, { type: 'mistral', label: 'Mistral' }, { type: 'cohere', label: 'Cohere' }, { type: 'pinecone', label: 'Pinecone' },
      { type: 'qdrant', label: 'Qdrant' }, { type: 'milvus', label: 'Milvus' }, { type: 'elevenlabs', label: 'ElevenLabs' }, { type: 'midjourney', label: 'Midjourney' },
      { type: 'dalle', label: 'DALL-E' }, { type: 'stablediffusion', label: 'Stable Diffusion' }, { type: 'replicate', label: 'Replicate' }, { type: 'aws_textract', label: 'AWS Textract' },
      { type: 'google_vision', label: 'Google Vision' }
    ]
  },
  {
    name: "Social Media",
    nodes: [
      { type: 'instagram', label: 'Instagram' }, { type: 'facebook', label: 'Facebook' }, { type: 'twitter', label: 'X (Twitter)' }, { type: 'linkedin', label: 'LinkedIn' },
      { type: 'tiktok', label: 'TikTok' }, { type: 'pinterest', label: 'Pinterest' }, { type: 'youtube', label: 'YouTube' }, { type: 'reddit', label: 'Reddit' },
      { type: 'discord', label: 'Discord' }, { type: 'snapchat', label: 'Snapchat' }, { type: 'telegram', label: 'Telegram' }, { type: 'whatsapp', label: 'WhatsApp' },
      { type: 'slack', label: 'Slack' }, { type: 'twitch', label: 'Twitch' }
    ]
  },
  {
    name: "Communication & Email",
    nodes: [
      { type: 'gmail', label: 'Gmail' }, { type: 'outlook', label: 'Outlook' }, { type: 'sendgrid', label: 'SendGrid' }, { type: 'mailchimp', label: 'Mailchimp' },
      { type: 'twilio', label: 'Twilio' }, { type: 'postmark', label: 'Postmark' }, { type: 'activecampaign', label: 'ActiveCampaign' }, { type: 'customerio', label: 'Customer.io' },
      { type: 'klaviyo', label: 'Klaviyo' }, { type: 'intercom', label: 'Intercom' }, { type: 'zendesk', label: 'Zendesk' }, { type: 'freshdesk', label: 'Freshdesk' }
    ]
  },
  {
    name: "Data & Databases",
    nodes: [
      { type: 'mysql', label: 'MySQL' }, { type: 'postgresql', label: 'PostgreSQL' }, { type: 'mongodb', label: 'MongoDB' }, { type: 'redis', label: 'Redis' },
      { type: 'supabase', label: 'Supabase' }, { type: 'firebase', label: 'Firebase' }, { type: 'snowflake', label: 'Snowflake' }, { type: 'bigquery', label: 'BigQuery' },
      { type: 'aws_s3', label: 'AWS S3' }, { type: 'airtable', label: 'Airtable' }, { type: 'notion', label: 'Notion' }, { type: 'google_sheets', label: 'Google Sheets' },
      { type: 'excel', label: 'Excel' }, { type: 'dynamodb', label: 'DynamoDB' }, { type: 'elasticsearch', label: 'ElasticSearch' }
    ]
  },
  {
    name: "CRM & Sales",
    nodes: [
      { type: 'salesforce', label: 'Salesforce' }, { type: 'hubspot', label: 'HubSpot' }, { type: 'pipedrive', label: 'Pipedrive' }, { type: 'zoho', label: 'Zoho CRM' },
      { type: 'monday', label: 'Monday.com' }, { type: 'clickup', label: 'ClickUp' }, { type: 'asana', label: 'Asana' }, { type: 'trello', label: 'Trello' },
      { type: 'jira', label: 'Jira' }, { type: 'linear', label: 'Linear' }, { type: 'stripe', label: 'Stripe' }, { type: 'paypal', label: 'PayPal' },
      { type: 'square', label: 'Square' }, { type: 'shopify', label: 'Shopify' }, { type: 'woocommerce', label: 'WooCommerce' }
    ]
  },
  {
    name: "Marketing & Analytics",
    nodes: [
      { type: 'google_analytics', label: 'Google Analytics' }, { type: 'mixpanel', label: 'Mixpanel' }, { type: 'amplitude', label: 'Amplitude' }, { type: 'segment', label: 'Segment' },
      { type: 'facebook_ads', label: 'Facebook Ads' }, { type: 'google_ads', label: 'Google Ads' }, { type: 'linkedin_ads', label: 'LinkedIn Ads' }, { type: 'tiktok_ads', label: 'TikTok Ads' },
      { type: 'hotjar', label: 'Hotjar' }, { type: 'mailgun', label: 'Mailgun' }, { type: 'typeform', label: 'Typeform' }, { type: 'typebot', label: 'Typebot' }
    ]
  },
  {
    name: "Developer Tools",
    nodes: [
      { type: 'github', label: 'GitHub' }, { type: 'gitlab', label: 'GitLab' }, { type: 'bitbucket', label: 'Bitbucket' }, { type: 'docker', label: 'Docker' },
      { type: 'aws_ec2', label: 'AWS EC2' }, { type: 'vercel', label: 'Vercel' }, { type: 'netlify', label: 'Netlify' }, { type: 'cloudflare', label: 'Cloudflare' },
      { type: 'datadog', label: 'Datadog' }, { type: 'sentry', label: 'Sentry' }, { type: 'pagerduty', label: 'PagerDuty' }, { type: 'grafana', label: 'Grafana' }
    ]
  }
];

interface NodesCatalogModalProps {
  open: boolean;
  onClose: () => void;
}

const NodesCatalogModal: React.FC<NodesCatalogModalProps> = ({ open, onClose }) => {
  const [search, setSearch] = useState("");

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '800px', 
          width: '90%', 
          maxHeight: '85vh', 
          display: 'flex', 
          flexDirection: 'column',
          background: '#0a0a0a',
          border: '1px solid #333',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
        }}
      >
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#fff' }}>🤖 AI Agent Nodes Catalog</h2>
            <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>Browse over 100+ available nodes to build powerful workflows.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '24px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '16px 24px', borderBottom: '1px solid #222' }}>
          <input 
            type="text" 
            placeholder="Search nodes..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #333',
              background: '#141414',
              color: '#fff',
              fontSize: '16px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'grid', gap: '32px' }}>
          {categories.map(category => {
            const filteredNodes = category.nodes.filter(n => 
              n.label.toLowerCase().includes(search.toLowerCase()) || 
              n.type.toLowerCase().includes(search.toLowerCase())
            );

            if (filteredNodes.length === 0) return null;

            return (
              <div key={category.name}>
                <h3 style={{ fontSize: '14px', color: '#5ef2e4', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>{category.name}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {filteredNodes.map(node => (
                    <div key={node.type} style={{
                      background: '#1a1a2e',
                      border: '1px solid #2a2a40',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <span style={{ fontSize: '24px' }}>{icons[node.type] || icons.default}</span>
                      <span style={{ color: '#eaeaea', fontSize: '14px', fontWeight: '500' }}>{node.label}</span>
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
