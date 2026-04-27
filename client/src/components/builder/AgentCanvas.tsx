import React, { useCallback, useEffect, useRef } from 'react';
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
import '@xyflow/react/dist/style.css';

// --- CUSTOM NODE COMPONENTS ---
const icons: Record<string, string> = {
  // Core / Triggers
  trigger: '⚡', webhook: '🪝', schedule: '⏱️', manual: '👆', error: '⚠️', http: '🌐', set: '📝', if: '⚖️', switch: '🔀', merge: '⏬', split: '⏫', loop: '🔁', execute: '💻', read: '📖', write: '✏️',
  
  // AI & ML
  openai: '🧠', claude: '🤖', gemini: '✨', ollama: '🦙', huggingface: '🤗', mistral: '🌪️', cohere: '⚛️', pinecone: '🌲', qdrant: '🎯', milvus: '🗄️', elevenlabs: '🎙️', midjourney: '🎨', dalle: '🖼️', stablediffusion: '🌌', replicate: '🧬', aws_textract: '📄', google_vision: '👁️',
  
  // Social Media
  instagram: '📸', facebook: '📘', twitter: '🐦', linkedin: '💼', tiktok: '🎵', pinterest: '📌', youtube: '▶️', reddit: '👽', discord: '👾', snapchat: '👻', telegram: '✈️', whatsapp: '💬', slack: '💬', twitch: '🎮',
  
  // Communication & Email
  gmail: '📧', outlook: '📨', sendgrid: '📮', mailchimp: '🐵', twilio: '📱', postmark: '📫', activecampaign: '🎯', customerio: '👥', klaviyo: '📈', intercom: '🎧', zendesk: '🤝', freshdesk: '🎫',
  
  // Data & Databases
  mysql: '🐬', postgresql: '🐘', mongodb: '🍃', redis: '⚡', supabase: '🟢', firebase: '🔥', snowflake: '❄️', bigquery: '🔍', aws_s3: '🪣', airtable: '📊', notion: '📓', google_sheets: '📗', excel: '📊', dynamodb: '⚡', elasticsearch: '🔎',
  
  // CRM & Sales
  salesforce: '☁️', hubspot: '🟠', pipedrive: '🚀', zoho: '🏢', monday: '📅', clickup: '✅', asana: '🎯', trello: '📋', jira: '🛠️', linear: '📈', stripe: '💳', paypal: '💰', square: '⬛', shopify: '🛍️', woocommerce: '🛒',
  
  // Marketing & Analytics
  google_analytics: '📈', mixpanel: '📊', amplitude: '📉', segment: '🧩', facebook_ads: '📢', google_ads: '🎯', linkedin_ads: '👔', tiktok_ads: '📱', hotjar: '🔥', mailgun: '🔫', typeform: '📝', typebot: '🤖',
  
  // Developer Tools
  github: '🐙', gitlab: '🦊', bitbucket: '🪣', docker: '🐳', aws_ec2: '☁️', vercel: '▲', netlify: '🌐', cloudflare: '☁️', datadog: '🐶', sentry: '🚨', pagerduty: '📟', grafana: '📊',

  action: '⚙️',
  default: '📦'
};

const CustomNode = ({ data, isConnectable }: any) => {
  const icon = icons[data.type] || icons.default;
  return (
    <div style={{
      background: '#1a192b',
      border: '1px solid #3a395b',
      borderRadius: '8px',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: '220px',
      color: '#fff',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} style={{ background: '#5ef2e4', width: '8px', height: '8px', border: 'none' }} />
      <div style={{ fontSize: '24px', background: '#2a293b', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#eaeaea' }}>{data.label}</div>
        <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginTop: '2px' }}>{data.type}</div>
      </div>
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} style={{ background: '#5ef2e4', width: '8px', height: '8px', border: 'none' }} />
    </div>
  );
};

const nodeTypes = {
  customNode: CustomNode,
};

// --- SIDEBAR COMPONENT ---
const Sidebar = () => {
  const [search, setSearch] = React.useState('');
  
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
    <aside style={{ width: '280px', background: '#111', borderRight: '1px solid #222', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
      <h3 style={{ margin: '0', fontSize: '15px', color: '#fff', fontWeight: 'bold' }}>Available Nodes</h3>
      <div style={{ fontSize: '12px', color: '#666' }}>Drag and drop nodes to the canvas</div>
      
      <input 
        type="text" 
        placeholder="Search 100+ nodes..." 
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          background: '#1a192b',
          border: '1px solid #333',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: '6px',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
          marginBottom: '8px'
        }}
      />

      {categories.map((category) => {
        const filteredNodes = category.nodes.filter(n => n.label.toLowerCase().includes(search.toLowerCase()) || n.type.toLowerCase().includes(search.toLowerCase()));
        if (filteredNodes.length === 0) return null;

        return (
          <div key={category.name} style={{ marginBottom: '12px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{category.name}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredNodes.map((nt) => (
                <div
                  key={nt.type}
                  onDragStart={(event) => onDragStart(event, nt.type, nt.label)}
                  draggable
                  style={{
                    background: '#1a192b',
                    border: '1px solid #2a2940',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#ddd',
                    fontSize: '13px',
                    transition: 'all 0.2s ease',
                    userSelect: 'none'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#25243c'; e.currentTarget.style.borderColor = '#3a395b'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#1a192b'; e.currentTarget.style.borderColor = '#2a2940'; }}
                >
                  <span style={{ fontSize: '16px' }}>{icons[nt.type] || icons.default}</span>
                  {nt.label}
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
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    if (workflow && workflow.nodes && workflow.edges) {
      // Map custom workflow config to ReactFlow format
      const rfNodes = workflow.nodes.map((n, i) => ({
        id: n.id,
        type: 'customNode',
        data: { label: n.name, type: n.type },
        position: { x: i * 350 + 50, y: window.innerHeight / 3 }, // Better auto-layout horizontal
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
    }
  }, [workflow, setNodes, setEdges]);

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

  if (!workflow) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <h2>Generating AI Agent Workflow...</h2>
      </div>
    );
  }

  const executeWorkflow = async () => {
    // Determine parent mapping based on edges
    const parentMap: Record<string, string> = {};
    edges.forEach(e => {
      parentMap[e.target] = e.source;
    });

    // Map ReactFlow to Backend Format
    const backendNodes = nodes.map(n => {
      let data: any = { ...n.data }; // preserve existing data if any

      if (n.data.type === 'openai') {
        data.prompt = "Write a short engaging 2-sentence script for a reel."; 
        data.apiKey = ""; // Will fallback to env
      } else if (n.data.type === 'instagram') {
        const parentId = parentMap[n.id];
        // Automatically wire the caption to the output of the parent node
        data.caption = parentId ? `{{node.${parentId}.data.text}}` : "Beautiful AI Generated Reel! 🤖✨";
        data.mediaUrl = ""; 
      }
      
      return {
        id: n.id,
        type: n.data.type,
        name: n.data.label,
        data
      };
    });

    const backendEdges = edges.map(e => ({
      source: e.source,
      target: e.target
    }));

    try {
      const response = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow: { nodes: backendNodes, edges: backendEdges } })
      });
      const result = await response.json();
      
      if (result.success) {
        alert("Workflow Executed Successfully!\n\n" + JSON.stringify(result.result, null, 2));
      } else {
        alert("Workflow Execution Failed:\n" + result.error);
      }
    } catch (err) {
      alert("Error executing workflow: " + String(err));
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, position: 'relative' }} ref={reactFlowWrapper}>
        
        {/* EXECUTE BUTTON */}
        <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
          <button 
            onClick={executeWorkflow}
            style={{
              background: '#5ef2e4',
              color: '#000',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(94, 242, 228, 0.4)'
            }}
          >
            ▶ Execute Workflow
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          style={{ background: '#0a0a0a' }}
        >
          <Controls style={{ background: '#222', fill: 'white', border: '1px solid #444' }} />
          <MiniMap 
            nodeColor="#3a395b"
            nodeStrokeWidth={3} 
            zoomable 
            pannable 
            style={{ background: '#1a192b', border: '1px solid #333', borderRadius: '8px' }} 
            maskColor="rgba(0,0,0, 0.4)"
          />
          <Background variant={"dots" as any} gap={16} size={1} color="#333" />
        </ReactFlow>
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
