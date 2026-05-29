import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  useReactFlow,
} from '@xyflow/react';
import {
  Zap,
  Webhook,
  Clock,
  MousePointerClick,
  AlertTriangle,
  Globe,
  Settings2,
  GitBranch,
  Shuffle,
  GitMerge,
  GitFork,
  RefreshCw,
  Terminal,
  FileText,
  FilePen,
  Package,
  Search,
  Play,
} from 'lucide-react';
import '@xyflow/react/dist/style.css';
import { BRAND_SVGS } from '../../brandIcons';
import {
  activateTrigger,
  deactivateTrigger,
  getTriggerStatus,
  manualExecuteTrigger,
} from '../../services/triggerService';

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

type TriggerSettings = {
  triggerMode: 'schedule' | 'webhook' | 'polling';
  credentials: {
    authMethod: string;
    apiKey: string;
    oauthProvider: string;
    username: string;
    password: string;
    token: string;
  };
  core: {
    eventType: string;
    schedule: string;
    webhookPath: string;
    pollingInterval: number;
    filters: {
      folder: string;
      keyword: string;
      status: string;
    };
  };
  output: {
    simplifyOutput: boolean;
    maxItems: number;
    includeRawData: boolean;
    outputSchema: {
      type: string;
      description: string;
      properties: Record<string, any>;
      required: string[];
      example: Record<string, any>;
    };
  };
  advanced: {
    timeout: number;
    retries: number;
    errorHandling: string;
    testMode: boolean;
    customHeaders: string;
    queryParameters: string;
    body: string;
  };
};

type TriggerFieldOption = {
  label: string;
  value: string;
  description?: string;
};

type TriggerFieldVisibility = {
  triggerMode?: Array<'schedule' | 'webhook' | 'polling'>;
};

type TriggerFieldDefinition = {
  key: string;
  label: string;
  type: 'select' | 'text' | 'number' | 'boolean' | 'textarea' | 'json';
  section: 'Credentials' | 'Core Configuration' | 'Output' | 'Advanced';
  placeholder?: string;
  options?: TriggerFieldOption[];
  description?: string;
  min?: number;
  step?: number;
  rows?: number;
  displayOptions?: {
    show?: TriggerFieldVisibility;
  };
};

type WorkflowNode = {
  id: string;
  type: string;
  label?: string;
  name?: string;
  description?: string;
  position?: { x: number; y: number };
  inputs?: string[];
  outputs?: string[];
  data?: any;
};

type WorkflowEdge = {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
};

const defaultTriggerSettings = (): TriggerSettings => ({
  triggerMode: 'schedule',
  credentials: {
    authMethod: 'none',
    apiKey: '',
    oauthProvider: 'google',
    username: '',
    password: '',
    token: '',
  },
  core: {
    eventType: 'weekly_report',
    schedule: '0 9 * * 1',
    webhookPath: '/webhook/custom-trigger',
    pollingInterval: 15,
    filters: {
      folder: '',
      keyword: '',
      status: '',
    },
  },
  output: {
    simplifyOutput: true,
    maxItems: 100,
    includeRawData: false,
    outputSchema: {
      type: 'object',
      description: 'Data emitted by the trigger when it fires.',
      properties: {
        eventId: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        triggerMode: { type: 'string' },
        payload: { type: 'object' },
      },
      required: ['eventId', 'timestamp'],
      example: {
        eventId: 'evt_123',
        timestamp: '2026-05-21T09:00:00.000Z',
        triggerMode: 'schedule',
        payload: {},
      },
    },
  },
  advanced: {
    timeout: 30,
    retries: 3,
    errorHandling: 'stop',
    testMode: true,
    customHeaders: '',
    queryParameters: '',
    body: '',
  },
});

const mergeTriggerSettings = (settings?: Partial<TriggerSettings>): TriggerSettings => ({
  ...defaultTriggerSettings(),
  ...settings,
  credentials: {
    ...defaultTriggerSettings().credentials,
    ...settings?.credentials,
  },
  core: {
    ...defaultTriggerSettings().core,
    ...settings?.core,
    filters: {
      ...defaultTriggerSettings().core.filters,
      ...settings?.core?.filters,
    },
  },
  output: {
    ...defaultTriggerSettings().output,
    ...settings?.output,
    outputSchema: {
      ...defaultTriggerSettings().output.outputSchema,
      ...settings?.output?.outputSchema,
      properties: {
        ...defaultTriggerSettings().output.outputSchema.properties,
        ...settings?.output?.outputSchema?.properties,
      },
      required: settings?.output?.outputSchema?.required || defaultTriggerSettings().output.outputSchema.required,
      example: {
        ...defaultTriggerSettings().output.outputSchema.example,
        ...settings?.output?.outputSchema?.example,
      },
    },
  },
  advanced: {
    ...defaultTriggerSettings().advanced,
    ...settings?.advanced,
  },
});

const updateNestedValue = (value: any, path: string, nextValue: any) => {
  const clone = JSON.parse(JSON.stringify(value));
  const parts = path.split('.');
  let cursor = clone;

  for (let index = 0; index < parts.length - 1; index += 1) {
    cursor = cursor[parts[index]];
  }

  cursor[parts[parts.length - 1]] = nextValue;
  return clone;
};

const isTriggerFieldVisible = (field: TriggerFieldDefinition, settings: TriggerSettings) => {
  const modes = field.displayOptions?.show?.triggerMode;
  if (!modes) return true;
  return modes.includes(settings.triggerMode);
};

const renderTriggerFieldValue = (
  field: TriggerFieldDefinition,
  settings: TriggerSettings,
  onChange: (path: string, value: string | number | boolean) => void,
  panelInputStyle: React.CSSProperties,
) => {
  const value = field.key.split('.').reduce<any>((accumulator, part) => accumulator?.[part], settings);

  switch (field.type) {
    case 'select':
      return (
        <select
          value={String(value ?? '')}
          onChange={(event) => onChange(field.key, event.target.value)}
          style={panelInputStyle}
        >
          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case 'number':
      return (
        <input
          type="number"
          min={field.min}
          step={field.step}
          value={Number(value ?? 0)}
          onChange={(event) => onChange(field.key, Number(event.target.value) || 0)}
          style={panelInputStyle}
          placeholder={field.placeholder}
        />
      );
    case 'boolean':
      return (
        <select
          value={String(Boolean(value))}
          onChange={(event) => onChange(field.key, event.target.value === 'true')}
          style={panelInputStyle}
        >
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>
      );
    case 'textarea':
      return (
        <textarea
          value={String(value ?? '')}
          onChange={(event) => onChange(field.key, event.target.value)}
          style={{ ...panelInputStyle, minHeight: (field.rows || 4) * 20, resize: 'vertical' }}
          placeholder={field.placeholder}
        />
      );
    case 'json':
      return (
        <textarea
          value={JSON.stringify(value ?? {}, null, 2)}
          onChange={(event) => {
            try {
              onChange(field.key, JSON.parse(event.target.value));
            } catch {
              // keep last valid JSON until the user finishes typing
            }
          }}
          style={{ ...panelInputStyle, minHeight: (field.rows || 8) * 20, resize: 'vertical', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace' }}
          placeholder={field.placeholder}
        />
      );
    case 'text':
    default:
      return (
        <input
          value={String(value ?? '')}
          onChange={(event) => onChange(field.key, event.target.value)}
          style={panelInputStyle}
          placeholder={field.placeholder}
        />
      );
  }
};

const triggerModeEventDefaults: Record<'schedule' | 'webhook' | 'polling', string> = {
  schedule: 'weekly_report',
  webhook: 'webhook_received',
  polling: 'poll_cycle',
};

const TRIGGER_FIELD_DEFINITIONS: TriggerFieldDefinition[] = [
  {
    key: 'triggerMode',
    label: 'Trigger Mode',
    type: 'select',
    section: 'Core Configuration',
    options: [
      { label: 'Schedule', value: 'schedule' },
      { label: 'Webhook', value: 'webhook' },
      { label: 'Polling', value: 'polling' },
    ],
  },
  {
    key: 'credentials.authMethod',
    label: 'Auth Method',
    type: 'select',
    section: 'Credentials',
    options: [
      { label: 'None', value: 'none' },
      { label: 'API Key', value: 'apiKey' },
      { label: 'OAuth', value: 'oauth' },
      { label: 'Basic Auth', value: 'basic' },
      { label: 'Bearer Token', value: 'token' },
    ],
  },
  { key: 'credentials.apiKey', label: 'API Key', type: 'text', section: 'Credentials', placeholder: 'Enter API key' },
  { key: 'credentials.oauthProvider', label: 'OAuth Provider', type: 'text', section: 'Credentials', placeholder: 'google, slack, github...' },
  { key: 'credentials.username', label: 'Username', type: 'text', section: 'Credentials', placeholder: 'Username' },
  { key: 'credentials.password', label: 'Password', type: 'text', section: 'Credentials', placeholder: 'Password' },
  { key: 'credentials.token', label: 'Token', type: 'text', section: 'Credentials', placeholder: 'Bearer token' },
  {
    key: 'core.schedule',
    label: 'Schedule (Cron Expression)',
    type: 'text',
    section: 'Core Configuration',
    placeholder: '0 9 * * 1',
    displayOptions: { show: { triggerMode: ['schedule'] } },
  },
  {
    key: 'core.webhookPath',
    label: 'Webhook Path',
    type: 'text',
    section: 'Core Configuration',
    placeholder: '/webhook/custom-trigger',
    displayOptions: { show: { triggerMode: ['webhook'] } },
  },
  {
    key: 'core.pollingInterval',
    label: 'Polling Interval (seconds)',
    type: 'number',
    section: 'Core Configuration',
    min: 1,
    displayOptions: { show: { triggerMode: ['polling'] } },
  },
  { key: 'core.filters.folder', label: 'Folder Filter', type: 'text', section: 'Core Configuration', placeholder: 'Optional folder name' },
  { key: 'core.filters.keyword', label: 'Keyword Filter', type: 'text', section: 'Core Configuration', placeholder: 'Optional keyword' },
  { key: 'core.filters.status', label: 'Status Filter', type: 'text', section: 'Core Configuration', placeholder: 'Optional status' },
  { key: 'output.simplifyOutput', label: 'Simplify Output', type: 'boolean', section: 'Output' },
  { key: 'output.maxItems', label: 'Max Items Per Execution', type: 'number', section: 'Output', min: 1 },
  { key: 'output.includeRawData', label: 'Include Raw Data', type: 'boolean', section: 'Output' },
  { key: 'output.outputSchema', label: 'Output Schema', type: 'json', section: 'Output', rows: 10, description: 'Schema describing the data emitted by this trigger.' },
  { key: 'advanced.timeout', label: 'Timeout (seconds)', type: 'number', section: 'Advanced', min: 1 },
  { key: 'advanced.retries', label: 'Retry Count', type: 'number', section: 'Advanced', min: 0 },
  {
    key: 'advanced.errorHandling',
    label: 'Error Handling',
    type: 'select',
    section: 'Advanced',
    options: [
      { label: 'Stop Workflow', value: 'stop' },
      { label: 'Continue', value: 'continue' },
    ],
  },
  { key: 'advanced.testMode', label: 'Test Mode', type: 'boolean', section: 'Advanced' },
  { key: 'advanced.customHeaders', label: 'Custom Headers', type: 'textarea', section: 'Advanced', rows: 4, placeholder: 'JSON or key/value headers' },
  { key: 'advanced.queryParameters', label: 'Query Parameters', type: 'textarea', section: 'Advanced', rows: 4, placeholder: 'Query string or JSON' },
  { key: 'advanced.body', label: 'Body', type: 'textarea', section: 'Advanced', rows: 5, placeholder: 'Request body or payload template' },
];

const NodeIcon = ({ type, size = 20, color = '#5ef2e4' }: { type: string; size?: number; color?: string }) => {
  const LucideIcon = LUCIDE_ICONS[type];
  const brandSvgPath = BRAND_SVGS[type];

  if (LucideIcon) {
    return <LucideIcon size={size} color={color} strokeWidth={2} />;
  }

  if (brandSvgPath) {
    return (
      <svg role="img" viewBox="0 0 24 24" width={size} height={size} fill="#ffffff" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
        <title>{type}</title>
        <path d={brandSvgPath} />
      </svg>
    );
  }

  return <Package size={size} color={color} strokeWidth={2} />;
};

const CustomNode = ({ data, isConnectable }: any) => {
  const accent = '#5ef2e4';
  const isTrigger = data.type === 'trigger';

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        minWidth: 260,
        padding: '16px 20px',
        color: '#fff',
        borderRadius: 16,
        border: `1px solid ${isTrigger ? 'rgba(94, 242, 228, 0.45)' : 'rgba(94, 242, 228, 0.2)'}`,
        background: isTrigger
          ? 'linear-gradient(135deg, rgba(18, 36, 40, 0.96) 0%, rgba(20, 20, 31, 0.9) 100%)'
          : 'rgba(20, 20, 31, 0.88)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <Handle type="target" id="default" position={Position.Left} isConnectable={isConnectable} style={{ background: accent, width: 12, height: 12, border: '3px solid #14141f', left: -6 }} />

      <div style={{ background: 'linear-gradient(135deg, rgba(26,26,46,0.9) 0%, rgba(15,15,25,0.9) 100%)', padding: 12, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
        <NodeIcon type={data.type} size={26} color={accent} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px' }}>{data.label}</div>
        <div style={{ fontSize: 11, color: accent, textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.9, fontWeight: 500 }}>{data.type}</div>
      </div>

      {isTrigger && (
        <div style={{ position: 'absolute', top: -10, left: 16, background: accent, color: '#041114', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, letterSpacing: '0.8px' }}>
          TRIGGER
        </div>
      )}

      <Handle type="source" id="default" position={Position.Right} isConnectable={isConnectable} style={{ background: accent, width: 12, height: 12, border: '3px solid #14141f', right: -6 }} />

      {Array.isArray(data.inputs) && data.inputs.map((input: string, index: number) => (
        <Handle key={`in-${input}-${index}`} type="target" id={String(input)} position={Position.Left} isConnectable={isConnectable} style={{ background: accent, width: 8, height: 8, border: '2px solid #14141f', left: -6, top: `${18 + index * 14}px`, position: 'absolute' }} />
      ))}

      {Array.isArray(data.outputs) && data.outputs.map((output: string, index: number) => (
        <Handle key={`out-${output}-${index}`} type="source" id={String(output)} position={Position.Right} isConnectable={isConnectable} style={{ background: accent, width: 8, height: 8, border: '2px solid #14141f', right: -6, top: `${18 + index * 14}px`, position: 'absolute' }} />
      ))}
    </div>
  );
};

const nodeTypes = {
  customNode: CustomNode,
};

const Sidebar = () => {
  const [search, setSearch] = useState('');

  const categories = [
    {
      name: 'Core / Triggers',
      nodes: [
        { type: 'trigger', label: 'Custom Trigger' }, { type: 'webhook', label: 'Webhook' }, { type: 'schedule', label: 'Schedule' }, { type: 'manual', label: 'Manual Trigger' },
        { type: 'error', label: 'Error Trigger' }, { type: 'http', label: 'HTTP Request' }, { type: 'set', label: 'Set' }, { type: 'if', label: 'IF' },
        { type: 'switch', label: 'Switch' }, { type: 'merge', label: 'Merge' }, { type: 'split', label: 'Split' }, { type: 'loop', label: 'Loop' },
        { type: 'execute', label: 'Execute Command' }, { type: 'read', label: 'Read File' }, { type: 'write', label: 'Write File' },
      ],
    },
    {
      name: 'AI & ML',
      nodes: [
        { type: 'openai', label: 'OpenAI' }, { type: 'claude', label: 'Claude' }, { type: 'gemini', label: 'Google Gemini' }, { type: 'ollama', label: 'Ollama' },
        { type: 'huggingface', label: 'HuggingFace' }, { type: 'mistral', label: 'Mistral' }, { type: 'cohere', label: 'Cohere' }, { type: 'pinecone', label: 'Pinecone' },
        { type: 'qdrant', label: 'Qdrant' }, { type: 'milvus', label: 'Milvus' }, { type: 'elevenlabs', label: 'ElevenLabs' }, { type: 'midjourney', label: 'Midjourney' },
        { type: 'dalle', label: 'DALL-E' }, { type: 'stablediffusion', label: 'Stable Diffusion' }, { type: 'replicate', label: 'Replicate' }, { type: 'aws_textract', label: 'AWS Textract' },
        { type: 'google_vision', label: 'Google Vision' },
      ],
    },
    {
      name: 'Social Media',
      nodes: [
        { type: 'instagram', label: 'Instagram' }, { type: 'facebook', label: 'Facebook' }, { type: 'twitter', label: 'X (Twitter)' }, { type: 'linkedin', label: 'LinkedIn' },
        { type: 'tiktok', label: 'TikTok' }, { type: 'pinterest', label: 'Pinterest' }, { type: 'youtube', label: 'YouTube' }, { type: 'reddit', label: 'Reddit' },
        { type: 'discord', label: 'Discord' }, { type: 'snapchat', label: 'Snapchat' }, { type: 'telegram', label: 'Telegram' }, { type: 'whatsapp', label: 'WhatsApp' },
        { type: 'slack', label: 'Slack' }, { type: 'twitch', label: 'Twitch' },
      ],
    },
    {
      name: 'Communication & Email',
      nodes: [
        { type: 'gmail', label: 'Gmail' }, { type: 'outlook', label: 'Outlook' }, { type: 'sendgrid', label: 'SendGrid' }, { type: 'mailchimp', label: 'Mailchimp' },
        { type: 'twilio', label: 'Twilio' }, { type: 'postmark', label: 'Postmark' }, { type: 'activecampaign', label: 'ActiveCampaign' }, { type: 'customerio', label: 'Customer.io' },
        { type: 'klaviyo', label: 'Klaviyo' }, { type: 'intercom', label: 'Intercom' }, { type: 'zendesk', label: 'Zendesk' }, { type: 'freshdesk', label: 'Freshdesk' },
      ],
    },
    {
      name: 'Data & Databases',
      nodes: [
        { type: 'mysql', label: 'MySQL' }, { type: 'postgresql', label: 'PostgreSQL' }, { type: 'mongodb', label: 'MongoDB' }, { type: 'redis', label: 'Redis' },
        { type: 'supabase', label: 'Supabase' }, { type: 'firebase', label: 'Firebase' }, { type: 'snowflake', label: 'Snowflake' }, { type: 'bigquery', label: 'BigQuery' },
        { type: 'aws_s3', label: 'AWS S3' }, { type: 'airtable', label: 'Airtable' }, { type: 'notion', label: 'Notion' }, { type: 'google_sheets', label: 'Google Sheets' },
        { type: 'excel', label: 'Excel' }, { type: 'dynamodb', label: 'DynamoDB' }, { type: 'elasticsearch', label: 'ElasticSearch' },
      ],
    },
    {
      name: 'CRM & Sales',
      nodes: [
        { type: 'salesforce', label: 'Salesforce' }, { type: 'hubspot', label: 'HubSpot' }, { type: 'pipedrive', label: 'Pipedrive' }, { type: 'zoho', label: 'Zoho CRM' },
        { type: 'monday', label: 'Monday.com' }, { type: 'clickup', label: 'ClickUp' }, { type: 'asana', label: 'Asana' }, { type: 'trello', label: 'Trello' },
        { type: 'jira', label: 'Jira' }, { type: 'linear', label: 'Linear' }, { type: 'stripe', label: 'Stripe' }, { type: 'paypal', label: 'PayPal' },
        { type: 'square', label: 'Square' }, { type: 'shopify', label: 'Shopify' }, { type: 'woocommerce', label: 'WooCommerce' },
      ],
    },
    {
      name: 'Marketing & Analytics',
      nodes: [
        { type: 'google_analytics', label: 'Google Analytics' }, { type: 'mixpanel', label: 'Mixpanel' }, { type: 'amplitude', label: 'Amplitude' }, { type: 'segment', label: 'Segment' },
        { type: 'facebook_ads', label: 'Facebook Ads' }, { type: 'google_ads', label: 'Google Ads' }, { type: 'linkedin_ads', label: 'LinkedIn Ads' }, { type: 'tiktok_ads', label: 'TikTok Ads' },
        { type: 'hotjar', label: 'Hotjar' }, { type: 'mailgun', label: 'Mailgun' }, { type: 'typeform', label: 'Typeform' }, { type: 'typebot', label: 'Typebot' },
      ],
    },
    {
      name: 'Developer Tools',
      nodes: [
        { type: 'github', label: 'GitHub' }, { type: 'gitlab', label: 'GitLab' }, { type: 'bitbucket', label: 'Bitbucket' }, { type: 'docker', label: 'Docker' },
        { type: 'aws_ec2', label: 'AWS EC2' }, { type: 'vercel', label: 'Vercel' }, { type: 'netlify', label: 'Netlify' }, { type: 'cloudflare', label: 'Cloudflare' },
        { type: 'datadog', label: 'Datadog' }, { type: 'sentry', label: 'Sentry' }, { type: 'pagerduty', label: 'PagerDuty' }, { type: 'grafana', label: 'Grafana' },
      ],
    },
  ];

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, label }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside style={{ width: 300, background: '#0a0a0f', borderRight: '1px solid #1e1e2e', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 18, color: '#fff', fontWeight: 700 }}>Nodes Library</h3>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>Drag nodes onto the canvas</p>
      </div>

      <div style={{ position: 'relative' }}>
        <Search size={16} color="#666" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Search 100+ nodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', padding: '12px 14px 12px 40px', borderRadius: 10, outline: 'none', width: '100%', boxSizing: 'border-box', fontSize: 14 }}
        />
      </div>

      {categories.map((category) => {
        const filtered = category.nodes.filter((node) => node.label.toLowerCase().includes(search.toLowerCase()) || node.type.toLowerCase().includes(search.toLowerCase()));
        if (!filtered.length) return null;

        return (
          <div key={category.name}>
            <h4 style={{ margin: '0 0 10px', fontSize: 11, color: '#5ef2e4', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{category.name}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((node) => (
                <div key={node.type} draggable onDragStart={(event) => onDragStart(event, node.type, node.label)} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 14px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: 12, color: '#e0e0e0', fontSize: 13, userSelect: 'none' }}>
                  <NodeIcon type={node.type} size={18} color="#5ef2e4" />
                  <span style={{ fontWeight: 500 }}>{node.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </aside>
  );
};

interface AgentCanvasProps {
  workflowId?: string;
  workflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  } | null;
}

const AgentCanvasInner = ({ workflow, workflowId }: AgentCanvasProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<any>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'settings' | 'json'>('settings');
  const [triggerStatus, setTriggerStatus] = useState<any>(null);
  const [triggerStatusError, setTriggerStatusError] = useState<string | null>(null);
  const [triggerActionLoading, setTriggerActionLoading] = useState<'activate' | 'deactivate' | 'manual' | null>(null);
  const [triggerMessage, setTriggerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { screenToFlowPosition } = useReactFlow();
  const workflowRuntimeId = workflowId;

  console.log('[Trigger Status] workflowId =', workflowRuntimeId);
  console.log('[Trigger Status] Full selectedNode =', nodes.find((node) => node.id === selectedNodeId) || null);

  useEffect(() => {
    if (!workflow?.nodes?.length) return;

    const rfNodes = workflow.nodes.map((node, index) => {
      const position = node.position
        ? { x: Number(node.position.x) || 0, y: Number(node.position.y) || 0 }
        : { x: index * 170, y: 160 + (index % 2) * 90 };

      return {
        id: node.id,
        type: 'customNode',
        position,
        data: {
          ...node.data,
          label: node.label || node.name || node.id,
          type: node.type,
          description: node.description,
          inputs: node.inputs || [],
          outputs: node.outputs || [],
          triggerSettings: node.type === 'trigger' ? mergeTriggerSettings(node.data?.triggerSettings) : undefined,
        },
      };
    });

    const rfEdges = (workflow.edges || []).map((edge) => ({
      id: edge.id || `e-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || 'default',
      targetHandle: edge.targetHandle || 'default',
      type: edge.type || 'smoothstep',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#5ef2e4' },
      style: { stroke: '#5ef2e4', strokeWidth: 2 },
    }));

    setNodes(rfNodes);
    setEdges(rfEdges);
    setSelectedNodeId((current) => (current && rfNodes.some((node) => node.id === current) ? current : (rfNodes.find((node) => node.data?.type === 'trigger')?.id || rfNodes[0]?.id || null)));
  }, [workflow, setNodes, setEdges]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null;
  const triggerSettings = mergeTriggerSettings(selectedNode?.data?.triggerSettings);
  const isTriggerNode = selectedNode?.data?.type === 'trigger';
  const activeTriggerRecord = triggerStatus?.activeTrigger || triggerStatus || null;
  const derivedTriggerState = triggerStatusError ? 'error' : (activeTriggerRecord?.status === 'active' || activeTriggerRecord?.status === 'restoring' || activeTriggerRecord?.runtime?.status === 'active' ? 'active' : 'inactive');
  const isActiveTrigger = derivedTriggerState === 'active';

  const syncTriggerStatus = useCallback(async () => {
    if (!isTriggerNode || !selectedNode?.id) {
      setTriggerStatus(null);
      setTriggerStatusError(null);
      return;
    }

    console.log('[Trigger Status] workflowId =', workflowRuntimeId);
    console.log('[Trigger Status] nodeId =', selectedNode.id);
    console.log('[Trigger Status] Full selectedNode =', selectedNode);

    if (!workflowRuntimeId) {
      setTriggerStatus(null);
      setTriggerStatusError('Trigger status unavailable');
      return;
    }

    try {
      console.log('Fetching trigger status for:', { workflowId: workflowRuntimeId, nodeId: selectedNode.id });
      const result = await getTriggerStatus(workflowRuntimeId, selectedNode.id);
      setTriggerStatus(result?.data?.activeTrigger || null);
      setTriggerStatusError(null);
    } catch (error) {
      setTriggerStatus(null);
      setTriggerStatusError('Trigger status unavailable');
    }
  }, [isTriggerNode, selectedNode?.id, workflowRuntimeId]);

  useEffect(() => {
    if (!isTriggerNode) {
      setTriggerStatus(null);
      setTriggerStatusError(null);
      setTriggerMessage(null);
      setToast(null);
      return;
    }

    syncTriggerStatus();
  }, [isTriggerNode, selectedNodeId, syncTriggerStatus]);

  useEffect(() => {
    if (!isTriggerNode) {
      return;
    }

    const timer = setInterval(() => {
      syncTriggerStatus();
    }, 12000);

    return () => clearInterval(timer);
  }, [isTriggerNode, selectedNodeId, syncTriggerStatus]);

  const updateNodeData = useCallback((nodeId: string, updater: (data: any) => any) => {
    setNodes((currentNodes) => currentNodes.map((node) => (node.id === nodeId ? { ...node, data: updater(node.data) } : node)));
  }, [setNodes]);

  const updateSelectedTriggerSetting = useCallback((path: string, value: string | number | boolean) => {
    if (!selectedNode || selectedNode.data?.type !== 'trigger') return;

    if (path === 'triggerMode') {
      const mode = value as 'schedule' | 'webhook' | 'polling';
      updateNodeData(selectedNode.id, (data) => ({
        ...data,
        triggerSettings: {
          ...mergeTriggerSettings(data.triggerSettings),
          triggerMode: mode,
          core: {
            ...mergeTriggerSettings(data.triggerSettings).core,
            eventType: triggerModeEventDefaults[mode],
          },
        },
      }));
      return;
    }

    updateNodeData(selectedNode.id, (data) => ({
      ...data,
      triggerSettings: updateNestedValue(mergeTriggerSettings(data.triggerSettings), path, value),
    }));
  }, [selectedNode, updateNodeData]);

  const buildTriggerConfigPayload = useCallback(() => {
    if (!selectedNode) {
      return null;
    }

    return {
      triggerMode: triggerSettings.triggerMode,
      label: selectedNode.data?.label,
      description: selectedNode.data?.description,
      credentials: triggerSettings.credentials,
      core: triggerSettings.core,
      output: triggerSettings.output,
      advanced: triggerSettings.advanced,
      workflowDefinition: {
        workflow: {
          name: 'Generated Workflow',
          description: 'Auto-generated workflow',
        },
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.data.type,
          label: node.data.label,
          description: node.data.description || '',
          position: node.position,
          triggerMode: node.data.type === 'trigger' ? node.data.triggerSettings?.triggerMode || 'schedule' : undefined,
          config: node.data.type === 'trigger'
            ? {
                credentials: node.data.triggerSettings?.credentials,
                core: node.data.triggerSettings?.core,
                output: node.data.triggerSettings?.output,
                advanced: node.data.triggerSettings?.advanced,
              }
            : node.data,
          inputs: node.data.inputs || [],
          outputs: node.data.outputs || [],
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        })),
      },
      enabled: true,
      configVersion: 1,
    };
  }, [edges, nodes, selectedNode, triggerSettings]);

  const handleActivateTrigger = useCallback(async () => {
    if (!selectedNode?.id || !isTriggerNode || !workflowRuntimeId) return;

    const config = buildTriggerConfigPayload();
    if (!config) return;

    setTriggerActionLoading('activate');
    setTriggerMessage(null);
    setToast(null);

    try {
      await activateTrigger(workflowRuntimeId, selectedNode.id, config);
      setTriggerMessage({ type: 'success', text: 'Trigger activated successfully.' });
      setToast({ type: 'success', text: 'Trigger activated successfully.' });
      await syncTriggerStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setTriggerMessage({ type: 'error', text: message });
      setToast({ type: 'error', text: message });
    } finally {
      setTriggerActionLoading(null);
    }
  }, [buildTriggerConfigPayload, isTriggerNode, selectedNode?.id, syncTriggerStatus, workflowRuntimeId]);

  const handleDeactivateTrigger = useCallback(async () => {
    if (!selectedNode?.id || !isTriggerNode || !workflowRuntimeId) return;

    setTriggerActionLoading('deactivate');
    setTriggerMessage(null);
    setToast(null);

    try {
      await deactivateTrigger(workflowRuntimeId, selectedNode.id);
      setTriggerMessage({ type: 'success', text: 'Trigger deactivated successfully.' });
      setToast({ type: 'success', text: 'Trigger deactivated successfully.' });
      await syncTriggerStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setTriggerMessage({ type: 'error', text: message });
      setToast({ type: 'error', text: message });
    } finally {
      setTriggerActionLoading(null);
    }
  }, [isTriggerNode, selectedNode?.id, syncTriggerStatus, workflowRuntimeId]);

  const handleManualExecuteTrigger = useCallback(async () => {
    if (!selectedNode?.id || !isTriggerNode || !workflowRuntimeId) return;

    setTriggerActionLoading('manual');
    setTriggerMessage(null);
    setToast(null);

    try {
      const result = await manualExecuteTrigger(workflowRuntimeId, selectedNode.id, {
        source: 'builder',
        nodeId: selectedNode.id,
      });

      setTriggerMessage({ type: 'success', text: 'Manual execution completed successfully.' });
      setToast({ type: 'success', text: 'Manual execution completed successfully.' });
      if (result?.execution) {
        navigator.clipboard.writeText(JSON.stringify(result.execution, null, 2)).catch(() => undefined);
      }
      await syncTriggerStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setTriggerMessage({ type: 'error', text: message });
      setToast({ type: 'error', text: message });
    } finally {
      setTriggerActionLoading(null);
    }
  }, [isTriggerNode, selectedNode?.id, syncTriggerStatus, workflowRuntimeId]);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge({
    ...params,
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#5ef2e4' },
    style: { stroke: '#5ef2e4', strokeWidth: 2 },
  }, eds)), [setEdges]);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const nodeDataStr = event.dataTransfer.getData('application/reactflow');
    if (!nodeDataStr) return;

    const { type, label } = JSON.parse(nodeDataStr);
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

    const newNode = {
      id: `${type}_${Math.floor(Math.random() * 10000)}`,
      type: 'customNode',
      position,
      data: {
        label: `${label} Node`,
        type,
        inputs: [],
        outputs: [],
        triggerSettings: type === 'trigger' ? defaultTriggerSettings() : undefined,
      },
    };

    setNodes((current) => current.concat(newNode));
  }, [screenToFlowPosition, setNodes]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const workflowJson = useMemo(() => ({
    workflow: {
      name: 'Generated Workflow',
      description: 'Auto-generated workflow',
    },
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.data.type,
      label: node.data.label,
      description: node.data.description || '',
      position: node.position,
      triggerMode: node.data.type === 'trigger' ? node.data.triggerSettings?.triggerMode || 'schedule' : undefined,
      config: node.data.type === 'trigger'
        ? {
            credentials: node.data.triggerSettings?.credentials,
            core: node.data.triggerSettings?.core,
            output: node.data.triggerSettings?.output,
            advanced: node.data.triggerSettings?.advanced,
          }
        : node.data,
      inputs: node.data.inputs || [],
      outputs: node.data.outputs || [],
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    })),
  }), [edges, nodes]);

  const handleExecuteWorkflow = async () => {
    if (selectedNode?.data?.type === 'trigger' && isTriggerNode) {
      await handleManualExecuteTrigger();
      return;
    }

    const parentMap: Record<string, string> = {};
    edges.forEach((edge) => {
      parentMap[edge.target] = edge.source;
    });

    const backendNodes = nodes.map((node) => {
      const data: any = { ...node.data };

      if (node.data.type === 'openai') {
        data.prompt = 'Write a short engaging 2-sentence script for a reel.';
        data.apiKey = '';
      } else if (node.data.type === 'instagram') {
        const parentId = parentMap[node.id];
        data.caption = parentId ? `{{node.${parentId}.data.text}}` : 'Beautiful AI Generated Reel! 🤖✨';
        data.mediaUrl = '';
      }

      return {
        id: node.id,
        type: node.data.type,
        name: node.data.label,
        data,
      };
    });

    const backendEdges = edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
    }));

    try {
      const response = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow: { nodes: backendNodes, edges: backendEdges } }),
      });
      const result = await response.json();

      if (result.success) {
        setToast({ type: 'success', text: 'Workflow executed successfully.' });
      } else {
        setToast({ type: 'error', text: result.error || 'Workflow execution failed.' });
      }
    } catch (error) {
      setToast({ type: 'error', text: 'Error executing workflow: ' + String(error) });
    }
  };

  const panelInputStyle: React.CSSProperties = {
    width: '100%',
    background: '#0b0b10',
    color: '#e5e7eb',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 10,
  };

  const panelCardStyle: React.CSSProperties = {
    background: '#040405',
    border: '1px solid #101018',
    borderRadius: 12,
    padding: 12,
  };

  const panelSectionTitle: React.CSSProperties = {
    color: '#fff',
    fontWeight: 700,
    marginBottom: 10,
  };

  const panelLabel: React.CSSProperties = {
    display: 'block',
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 6,
  };

  if (!workflow || !nodes.length) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', background: '#0a0a0a', gap: 20 }}>
        <div style={{ padding: 32, borderRadius: 20, background: '#111118', border: '1px solid #1e1e2e', textAlign: 'center', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: '#5ef2e418', border: '1px solid #5ef2e433', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <RefreshCw size={32} color="#5ef2e4" className="spin-animation" />
          </div>
          <h2 style={{ color: '#fff', margin: '0 0 10px 0', fontSize: 24, fontWeight: 700 }}>Initializing Canvas</h2>
          <p style={{ color: '#666', fontSize: 15, margin: 0, lineHeight: 1.5 }}>Hang tight! We&apos;re building your agent workflow and establishing node connections.</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin-animation { animation: spin 2s linear infinite; }`}</style>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', position: 'relative' }} ref={reactFlowWrapper}>
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 10 }}>
            <button onClick={handleExecuteWorkflow} style={{ background: 'linear-gradient(135deg, #5ef2e4 0%, #3bbdb1 100%)', color: '#000', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 24px rgba(94, 242, 228, 0.3)', fontSize: 14 }}>
              <Play size={18} fill="currentColor" /> {selectedNode?.data?.type === 'trigger' && triggerActionLoading === 'manual' ? 'Running...' : 'Execute Workflow'}
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
            onInit={(instance) => { reactFlowInstance.current = instance; }}
            onNodeClick={(_, node) => {
              setSelectedNodeId(node.id);
              setActivePanel(node.data?.type === 'trigger' ? 'settings' : 'json');
            }}
            onPaneClick={() => setSelectedNodeId(null)}
            fitView
            style={{ background: '#050508' }}
          >
            <Controls style={{ background: '#111118', fill: 'white', border: '1px solid #1e1e2e', borderRadius: 8, padding: 4 }} />
            <MiniMap nodeColor="#3a395b" nodeStrokeWidth={3} zoomable pannable style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 12, margin: 16 }} maskColor="rgba(0,0,0, 0.6)" />
            <Background variant={'dots' as any} gap={20} size={1} color="#222" />
          </ReactFlow>
        </div>

        <div style={{ width: 420, background: '#07070b', borderLeft: '1px solid #1e1e2e', padding: 16, boxSizing: 'border-box', overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 700 }}>{selectedNode?.data?.type === 'trigger' ? 'Trigger Settings' : 'Generated Workflow'}</div>
              <div style={{ color: '#888', fontSize: 12 }}>{selectedNode?.data?.type === 'trigger' ? 'Configure credentials, events, schedule, webhook, and output behavior' : 'JSON Schema (n8n-style) from Gemini'}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button onClick={() => setActivePanel('settings')} style={{ background: activePanel === 'settings' ? 'rgba(94, 242, 228, 0.15)' : 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#cfeee9', padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}>Settings</button>
              <button onClick={() => setActivePanel('json')} style={{ background: activePanel === 'json' ? 'rgba(94, 242, 228, 0.15)' : 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#cfeee9', padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}>JSON</button>
              <button onClick={() => navigator.clipboard.writeText(JSON.stringify(workflowJson, null, 2)).catch(() => undefined)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#cfeee9', padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}>Copy</button>
              <button onClick={() => {
                const payload = JSON.stringify(workflowJson, null, 2);
                const blob = new Blob([payload], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `workflow-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }} style={{ background: 'linear-gradient(135deg, #5ef2e4 0%, #3bbdb1 100%)', border: 'none', color: '#000', padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}>Download</button>
            </div>
          </div>

          {activePanel === 'settings' && selectedNode?.data?.type === 'trigger' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {toast && (
                <div style={{ padding: '10px 12px', borderRadius: 10, background: toast.type === 'success' ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.14)', color: toast.type === 'success' ? '#bbf7d0' : '#fecaca', fontSize: 13, lineHeight: 1.45, border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                  {toast.text}
                </div>
              )}

              <div style={{ ...panelCardStyle, borderColor: isActiveTrigger ? 'rgba(94, 242, 228, 0.35)' : 'rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div>
                    <div style={panelSectionTitle}>Runtime Status</div>
                    <div style={{ color: '#9ca3af', fontSize: 12 }}>Activate, deactivate, or manually execute this trigger.</div>
                  </div>
                  <div style={{ padding: '6px 10px', borderRadius: 999, background: derivedTriggerState === 'error' ? 'rgba(239,68,68,0.16)' : isActiveTrigger ? 'rgba(34,197,94,0.14)' : 'rgba(107,114,128,0.16)', color: derivedTriggerState === 'error' ? '#fecaca' : isActiveTrigger ? '#86efac' : '#d1d5db', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '999px', background: derivedTriggerState === 'error' ? '#ef4444' : isActiveTrigger ? '#22c55e' : '#6b7280', display: 'inline-block' }} />
                    {derivedTriggerState === 'error' ? 'Error' : isActiveTrigger ? 'Active' : 'Inactive'}
                  </div>
                </div>

                {triggerStatusError && (
                  <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', color: '#fecaca', fontSize: 13, lineHeight: 1.45 }}>
                    Status refresh failed: {triggerStatusError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ ...panelLabel, marginBottom: 4 }}>Last Fired</div>
                    <div style={{ color: '#e5e7eb', fontSize: 13 }}>{activeTriggerRecord?.lastFiredAt || '—'}</div>
                  </div>
                  <div>
                    <div style={{ ...panelLabel, marginBottom: 4 }}>Next Run</div>
                    <div style={{ color: '#e5e7eb', fontSize: 13 }}>{activeTriggerRecord?.nextRunAt || '—'}</div>
                  </div>
                  <div>
                    <div style={{ ...panelLabel, marginBottom: 4 }}>Endpoint</div>
                    <div style={{ color: '#e5e7eb', fontSize: 13, wordBreak: 'break-word' }}>{activeTriggerRecord?.endpoint || triggerSettings.core.webhookPath || '—'}</div>
                  </div>
                  <div>
                    <div style={{ ...panelLabel, marginBottom: 4 }}>Schedule</div>
                    <div style={{ color: '#e5e7eb', fontSize: 13, wordBreak: 'break-word' }}>{triggerSettings.core.schedule || '—'}</div>
                  </div>
                </div>

                {triggerMessage && (
                  <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: triggerMessage.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: triggerMessage.type === 'success' ? '#bbf7d0' : '#fecaca', fontSize: 13, lineHeight: 1.45 }}>
                    {triggerMessage.text}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleActivateTrigger}
                    disabled={isActiveTrigger || triggerActionLoading !== null}
                    style={{
                      background: isActiveTrigger || triggerActionLoading !== null ? 'rgba(94,242,228,0.15)' : 'linear-gradient(135deg, #5ef2e4 0%, #3bbdb1 100%)',
                      color: isActiveTrigger || triggerActionLoading !== null ? '#6b7280' : '#000',
                      border: 'none',
                      padding: '10px 14px',
                      borderRadius: 10,
                      fontWeight: 700,
                      cursor: isActiveTrigger || triggerActionLoading !== null ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {triggerActionLoading === 'activate' && <RefreshCw size={14} className="spin-animation" />}
                    {triggerActionLoading === 'activate' ? 'Activating...' : 'Activate Trigger'}
                  </button>
                  <button
                    onClick={handleDeactivateTrigger}
                    disabled={!isActiveTrigger || triggerActionLoading !== null}
                    style={{
                      background: !isActiveTrigger || triggerActionLoading !== null ? 'rgba(255,255,255,0.04)' : 'rgba(239,68,68,0.16)',
                      color: !isActiveTrigger || triggerActionLoading !== null ? '#6b7280' : '#fecaca',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '10px 14px',
                      borderRadius: 10,
                      fontWeight: 700,
                      cursor: !isActiveTrigger || triggerActionLoading !== null ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {triggerActionLoading === 'deactivate' && <RefreshCw size={14} className="spin-animation" />}
                    {triggerActionLoading === 'deactivate' ? 'Deactivating...' : 'Deactivate Trigger'}
                  </button>
                  <button
                    onClick={handleManualExecuteTrigger}
                    disabled={triggerActionLoading !== null}
                    style={{
                      background: triggerActionLoading !== null ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
                      color: '#e5e7eb',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '10px 14px',
                      borderRadius: 10,
                      fontWeight: 700,
                      cursor: triggerActionLoading !== null ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {triggerActionLoading === 'manual' && <RefreshCw size={14} className="spin-animation" />}
                    {triggerActionLoading === 'manual' ? 'Running...' : 'Manual Execute'}
                  </button>
                </div>
              </div>

              {(['Credentials', 'Core Configuration', 'Output', 'Advanced'] as const).map((section) => {
                const fields = TRIGGER_FIELD_DEFINITIONS.filter((field) => field.section === section && isTriggerFieldVisible(field, triggerSettings));

                return (
                  <div key={section} style={panelCardStyle}>
                    <div style={panelSectionTitle}>{section}</div>
                    {fields.map((field) => (
                      <div key={field.key} style={{ marginBottom: 10 }}>
                        <label style={panelLabel}>{field.label}</label>
                        {field.description && <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 6, lineHeight: 1.4 }}>{field.description}</div>}
                        {renderTriggerFieldValue(field, triggerSettings, updateSelectedTriggerSetting, panelInputStyle)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background: '#040405', border: '1px solid #101018', borderRadius: 8, padding: 12, color: '#cfeee9', fontSize: 12, fontFamily: 'Inter, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace', whiteSpace: 'pre-wrap', maxHeight: 650, overflow: 'auto' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(workflowJson, null, 2)}</pre>
            </div>
          )}
        </div>
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
