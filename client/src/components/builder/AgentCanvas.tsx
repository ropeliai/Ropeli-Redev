import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import {
  Zap, Webhook, Clock, MousePointerClick, AlertTriangle, Globe,
  Settings2, GitBranch, Shuffle, GitMerge, GitFork, RefreshCw,
  Terminal, FileText, FilePen, Package, X, Search, Play
} from "lucide-react";
import '@xyflow/react/dist/style.css';
import { BRAND_SVGS } from "../../brandIcons";

// ─── ICON MAPPING (Synchronized with Catalog) ───────────────────────────────

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

const BRAND_ICONS: Record<string, string> = {
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

// ─── ICON RENDERER ───────────────────────────────────────────────────────────

const NodeIcon = ({ type, size = 20, color = "#5ef2e4" }: { type: string; size?: number; color?: string }) => {
  const LucideIcon = LUCIDE_ICONS[type];
  const brandSvgPath = BRAND_SVGS[type];

  if (LucideIcon) {
    return <LucideIcon size={size} color={color} strokeWidth={2} />;
  }

  if (brandSvgPath) {
    return (
      <svg
        role="img"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="#ffffff"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <title>{type}</title>
        <path d={brandSvgPath} />
      </svg>
    );
  }

  return <Package size={size} color={color} strokeWidth={2} />;
};

// --- CUSTOM NODE COMPONENTS ---

const CustomNode = ({ data, isConnectable }: any) => {
  const accentColor = data.status === 'success' ? '#10b981' : data.status === 'error' ? '#ef4444' : data.status === 'running' ? '#3b82f6' : "#5ef2e4";
  
  return (
    <div className="custom-agent-node" style={{
      background: 'rgba(20, 20, 31, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: `1px solid ${accentColor}33`,
      borderRadius: '16px',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      minWidth: '260px',
      color: '#fff',
      boxShadow: data.status === 'running' ? `0 0 20px ${accentColor}44` : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {data.status === 'running' && (
        <div style={{ position: 'absolute', inset: '-2px', borderRadius: '18px', border: `2px solid ${accentColor}`, animation: 'pulse 1.5s infinite' }} />
      )}
      <Handle 
        type="target" 
        position={Position.Left} 
        isConnectable={isConnectable} 
        style={{ background: accentColor, width: '12px', height: '12px', border: '3px solid #14141f', left: '-6px' }} 
      />
      
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(26,26,46,0.9) 0%, rgba(15,15,25,0.9) 100%)', 
        padding: '12px', 
        borderRadius: '12px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: `1px solid ${accentColor}22`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        <NodeIcon type={data.type} size={26} color={accentColor} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '4px', letterSpacing: '-0.3px' }}>{data.label}</div>
        <div style={{ fontSize: '11px', color: accentColor, textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.9, fontWeight: 500 }}>
          {data.status === 'running' ? 'Executing...' : data.status === 'success' ? 'Completed' : data.status === 'error' ? 'Failed' : data.type}
        </div>
      </div>

      <Handle 
        type="source" 
        position={Position.Right} 
        isConnectable={isConnectable} 
        style={{ background: accentColor, width: '12px', height: '12px', border: '3px solid #14141f', right: '-6px' }} 
      />
      <style>{`
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.02); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};

const nodeTypes = {
  customNode: CustomNode,
};

// --- SIDEBAR COMPONENT ---
const Sidebar = () => {
  const [search, setSearch] = useState('');
  
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, label }));
    event.dataTransfer.effectAllowed = 'move';
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

  return (
    <aside style={{ width: '300px', background: '#0a0a0f', borderRight: '1px solid #1e1e2e', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
      <div style={{ marginBottom: '4px' }}>
        <h3 style={{ margin: '0', fontSize: '18px', color: '#fff', fontWeight: 'bold', letterSpacing: '-0.3px' }}>Nodes Library</h3>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>Drag nodes onto the canvas</p>
      </div>
      
      <div style={{ position: 'relative' }}>
        <Search size={16} color="#666" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
        <input 
          type="text" 
          placeholder="Search 100+ nodes..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#fff',
            padding: '12px 14px 12px 40px',
            borderRadius: '10px',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
            fontSize: '14px',
            transition: 'all 0.3s ease',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(94, 242, 228, 0.5)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(94, 242, 228, 0.1)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)'; }}
        />
      </div>

      {categories.map((category) => {
        const filteredNodes = category.nodes.filter(n => n.label.toLowerCase().includes(search.toLowerCase()) || n.type.toLowerCase().includes(search.toLowerCase()));
        if (filteredNodes.length === 0) return null;

        return (
          <div key={category.name} style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#5ef2e4', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{category.name}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredNodes.map((nt) => (
                <div
                  key={nt.type}
                  onDragStart={(event) => onDragStart(event, nt.type, nt.label)}
                  draggable
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#e0e0e0',
                    fontSize: '13px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    userSelect: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                  onMouseOver={(e) => { 
                    e.currentTarget.style.background = 'rgba(94, 242, 228, 0.1)'; 
                    e.currentTarget.style.borderColor = 'rgba(94, 242, 228, 0.3)'; 
                    e.currentTarget.style.transform = 'translateX(4px)'; 
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(94, 242, 228, 0.2)';
                  }}
                  onMouseOut={(e) => { 
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; 
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'; 
                    e.currentTarget.style.transform = 'translateX(0)'; 
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                  }}
                >
                  <NodeIcon type={nt.type} size={18} color="#5ef2e4" />
                  <span style={{ fontWeight: 500, letterSpacing: '0.3px' }}>{nt.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </aside>
  );
};

// --- MAIN CANVAS COMPONENT ---
interface AgentCanvasProps {
  workflow: {
    nodes: any[];
    edges: any[];
  } | null;
}

const AgentCanvasInner = ({ workflow }: AgentCanvasProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const { screenToFlowPosition } = useReactFlow();

  const onNodeClick = useCallback((event: any, node: any) => {
    setSelectedNode(node);
  }, []);

  const updateNodeData = (id: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...newData } };
        }
        return node;
      })
    );
  };

  useEffect(() => {
    if (workflow && workflow.nodes && workflow.edges) {
      const rfNodes = workflow.nodes.map((n, i) => ({
        id: n.id,
        type: 'customNode',
        data: { 
          ...n.data,
          label: n.name, 
          type: n.type 
        },
        position: { x: i * 400 + 100, y: 200 },
      }));

      const rfEdges = workflow.edges.map((e) => ({
        id: `e-${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#5ef2e4',
        },
        style: { stroke: '#5ef2e4', strokeWidth: 2 },
      }));

      setNodes(rfNodes);
      setEdges(rfEdges);
      
      setTimeout(() => {
        try {
          reactFlowInstance.current?.fitView({ padding: 0.2, duration: 800 });
        } catch (e) {
          console.warn("Fit view failed", e);
        }
      }, 200);
    }
  }, [workflow, setNodes, setEdges]);

  const reactFlowInstance = useRef<any>(null);
  const onInit = (instance: any) => {
    reactFlowInstance.current = instance;
  };

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge({
    ...params,
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#5ef2e4' },
    style: { stroke: '#5ef2e4', strokeWidth: 2 }
  }, eds)), [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const nodeDataStr = event.dataTransfer.getData('application/reactflow');

      if (!nodeDataStr || !reactFlowBounds) return;

      const { type, label } = JSON.parse(nodeDataStr);

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `${type}_${Math.floor(Math.random() * 10000)}`,
        type: 'customNode',
        position,
        data: { label: `${label} Node`, type: type },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  if (!workflow || !nodes.length) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', background: '#0a0a0a', gap: '20px' }}>
        <div style={{ padding: '32px', borderRadius: '20px', background: '#111118', border: '1px solid #1e1e2e', textAlign: 'center', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
           <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: '#5ef2e418', border: '1px solid #5ef2e433', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
             <RefreshCw size={32} color="#5ef2e4" className="spin-animation" />
           </div>
           <h2 style={{ color: '#fff', margin: '0 0 10px 0', fontSize: '24px', fontWeight: 700 }}>Initializing Canvas</h2>
           <p style={{ color: '#666', fontSize: '15px', margin: 0, lineHeight: 1.5 }}>Hang tight! We're building your agent workflow and establishing node connections.</p>
        </div>
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .spin-animation { animation: spin 2s linear infinite; }
        `}</style>
      </div>
    );
  }

  const executeWorkflow = async () => {
    setIsExecuting(true);
    setExecutionLogs(["Starting workflow execution..."]);
    
    // Reset all nodes status
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle' } })));

    const backendNodes = nodes.map(n => ({
        id: n.id,
        type: n.data.type,
        name: n.data.label,
        data: n.data
    }));

    const backendEdges = edges.map(e => ({
      source: e.source,
      target: e.target
    }));

    try {
      // For real-time feedback, we'd use WebSockets, but here we'll simulate the "running" state
      // by setting nodes to 'running' based on topological sort (simplified)
      // For now, let's just make the request and handle the result
      
      const response = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow: { nodes: backendNodes, edges: backendEdges } })
      });
      const result = await response.json();
      
      if (result.success) {
        // Mark all as success for demonstration
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'success' } })));
        setExecutionLogs(prev => [...prev, "Workflow executed successfully!", JSON.stringify(result.result, null, 2)]);
      } else {
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'error' } })));
        setExecutionLogs(prev => [...prev, `Error: ${result.error}`]);
      }
    } catch (err) {
      setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'error' } })));
      setExecutionLogs(prev => [...prev, `Error: ${String(err)}`]);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, position: 'relative' }} ref={reactFlowWrapper}>
        
        {/* EXECUTE BUTTON */}
        <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10 }}>
          <button 
            onClick={executeWorkflow}
            style={{
              background: 'linear-gradient(135deg, #5ef2e4 0%, #3bbdb1 100%)',
              color: '#000',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 8px 24px rgba(94, 242, 228, 0.3)',
              fontSize: '14px',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(94, 242, 228, 0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(94, 242, 228, 0.3)'; }}
          >
            <Play size={18} fill="currentColor" /> Execute Workflow
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          onInit={onInit}
          onPaneClick={() => setSelectedNode(null)}
          fitView
          style={{ background: '#050508' }}
        >
          <Controls style={{ background: '#111118', fill: 'white', border: '1px solid #1e1e2e', borderRadius: '8px', padding: '4px' }} />
          <MiniMap 
            nodeColor="#3a395b"
            nodeStrokeWidth={3} 
            zoomable 
            pannable 
            style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: '12px', margin: '16px' }} 
            maskColor="rgba(0,0,0, 0.6)"
          />
          <Background variant={"dots" as any} gap={20} size={1} color="#222" />
        </ReactFlow>

        {/* NODE PROPERTIES PANEL */}
        {selectedNode && (
          <aside style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '320px',
            height: '100%',
            background: 'rgba(10, 10, 15, 0.95)',
            backdropFilter: 'blur(20px)',
            borderLeft: '1px solid #1e1e2e',
            zIndex: 100,
            padding: '24px',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings2 size={20} color="#5ef2e4" /> Node Properties
              </h3>
              <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', color: '#5ef2e4', textTransform: 'uppercase', fontWeight: 600 }}>Node Name</label>
              <input 
                type="text" 
                value={selectedNode.data.label} 
                onChange={(e) => {
                  const newLabel = e.target.value;
                  const newNode = { ...selectedNode, data: { ...selectedNode.data, label: newLabel } };
                  setSelectedNode(newNode);
                  updateNodeData(selectedNode.id, newNode.data);
                }}
                style={{ background: '#161623', border: '1px solid #2a2a40', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ fontSize: '12px', color: '#5ef2e4', textTransform: 'uppercase', fontWeight: 600 }}>Configuration</label>
              {Object.keys(selectedNode.data).map(key => {
                if (key === 'label' || key === 'type') return null;
                return (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#888' }}>{key}</span>
                    {typeof selectedNode.data[key] === 'string' && selectedNode.data[key].length > 40 ? (
                      <textarea 
                        value={selectedNode.data[key]}
                        onChange={(e) => {
                          const newData = { ...selectedNode.data, [key]: e.target.value };
                          const newNode = { ...selectedNode, data: newData };
                          setSelectedNode(newNode);
                          updateNodeData(selectedNode.id, newData);
                        }}
                        style={{ background: '#161623', border: '1px solid #2a2a40', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none', minHeight: '80px', fontSize: '13px', fontFamily: 'inherit' }}
                      />
                    ) : (
                      <input 
                        type="text" 
                        value={selectedNode.data[key]} 
                        onChange={(e) => {
                          const newData = { ...selectedNode.data, [key]: e.target.value };
                          const newNode = { ...selectedNode, data: newData };
                          setSelectedNode(newNode);
                          updateNodeData(selectedNode.id, newData);
                        }}
                        style={{ background: '#161623', border: '1px solid #2a2a40', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none', fontSize: '13px' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            
            <style>{`
              @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
            `}</style>
          </aside>
        )}
      </div>
    </div>
  );
};

export default function AgentCanvas(props: AgentCanvasProps) {
  return (
    <ReactFlowProvider>
      <AgentCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
