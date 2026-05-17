import fs from 'node:fs';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Updated node types based on structured schema
const ALLOWED_NODE_TYPES = new Set([
  'trigger', 'llm', 'api', 'condition', 'transform', 'output', 'tool',
  // For backwards compatibility with service integrations:
  'webhook', 'schedule', 'manual', 'error', 'http', 'set', 'if', 'switch', 'merge', 'split', 'loop', 'execute', 'read', 'write',
  'openai', 'claude', 'gemini', 'ollama', 'huggingface', 'mistral', 'cohere', 'pinecone', 'qdrant', 'milvus', 'elevenlabs', 'midjourney', 'dalle', 'stablediffusion', 'replicate', 'aws_textract', 'google_vision',
  'instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'pinterest', 'youtube', 'reddit', 'discord', 'snapchat', 'telegram', 'whatsapp', 'slack', 'twitch',
  'gmail', 'outlook', 'sendgrid', 'mailchimp', 'twilio', 'postmark', 'activecampaign', 'customerio', 'klaviyo', 'intercom', 'zendesk', 'freshdesk',
  'mysql', 'postgresql', 'mongodb', 'redis', 'supabase', 'firebase', 'snowflake', 'bigquery', 'aws_s3', 'airtable', 'notion', 'google_sheets', 'excel', 'dynamodb', 'elasticsearch',
  'salesforce', 'hubspot', 'pipedrive', 'zoho', 'monday', 'clickup', 'asana', 'trello', 'jira', 'linear', 'stripe', 'paypal', 'square', 'shopify', 'woocommerce',
  'google_analytics', 'mixpanel', 'amplitude', 'segment', 'facebook_ads', 'google_ads', 'linkedin_ads', 'tiktok_ads', 'hotjar', 'mailgun', 'typeform', 'typebot',
  'github', 'gitlab', 'bitbucket', 'docker', 'aws_ec2', 'vercel', 'netlify', 'cloudflare', 'datadog', 'sentry', 'pagerduty', 'grafana',
  'action',
]);

const WORKFLOW_BLUEPRINTS = JSON.parse(
  fs.readFileSync(new URL('./workflow-blueprints.json', import.meta.url), 'utf8')
);

function buildBlueprintPrompt() {
  return WORKFLOW_BLUEPRINTS.blueprints
    .map((blueprint) => {
      const nodeTypes = blueprint.nodes.map((node) => node.type).join(' -> ');
      return `- ${blueprint.name}: ${blueprint.keywords.join(', ')} | ${nodeTypes}`;
    })
    .join('\n');
}

function buildSystemPrompt() {
  return `${SYSTEM_PROMPT}\n\nWORKFLOW BLUEPRINT CATALOG (JSON source):\n${buildBlueprintPrompt()}\n\nRules for Gemini:\n- Return only valid JSON with nodes and edges.\n- Use only node types from the catalog.\n- Keep the graph connected and trigger-first.\n- Prefer one of the blueprint structures above when relevant.`;
}

const SYSTEM_PROMPT = `You are an expert Workflow Architect and JSON schema generator. Your task is to convert user natural language requests into a complete, executable workflow represented as structured JSON compatible with React Flow visualization.

### CRITICAL OUTPUT REQUIREMENTS:
- Respond with **ONLY valid JSON**. No text, no markdown, no explanations, no code blocks.
- EVERY node MUST have position { x, y } coordinates (x: 0-600, y: 0-400 range, left-to-right layout).
- EVERY edge MUST reference existing node IDs that are in the nodes array.
- EVERY non-trigger node MUST have at least one incoming edge.
- The workflow must be fully connected from start to finish. Do not leave isolated nodes.
- If the workflow branches, create multiple edges from the branching node and use sourceHandle/targetHandle values like "yes", "no", "default", or output/input names.
- Return the exact structure shown below—no deviations.

### JSON SCHEMA (STRICT):

{
  "workflow": {
    "name": "Workflow Name",
    "description": "Brief description of what this workflow does",
    "nodes": [
      {
        "id": "node_1",
        "type": "trigger",
        "label": "Start Workflow",
        "description": "Triggers the workflow",
        "position": { "x": 0, "y": 150 },
        "config": { "type": "manual" },
        "inputs": [],
        "outputs": ["data"]
      },
      {
        "id": "node_2",
        "type": "llm",
        "label": "Process with Gemini",
        "description": "Send input to Gemini for processing",
        "position": { "x": 200, "y": 150 },
        "config": {
          "model": "gemini-2.5-flash",
          "temperature": 0.7,
          "systemPrompt": "You are a helpful assistant.",
          "userPrompt": "Process this data: {{node_1.data}}"
        },
        "inputs": ["data"],
        "outputs": ["result"]
      },
      {
        "id": "node_3",
        "type": "output",
        "label": "Send Email",
        "description": "Send results via email",
        "position": { "x": 400, "y": 150 },
        "config": {
          "service": "gmail",
          "to": "user@example.com",
          "subject": "Workflow Results",
          "body": "{{node_2.result}}"
        },
        "inputs": ["result"],
        "outputs": []
      }
    ],
    "edges": [
      { "id": "e1", "source": "node_1", "target": "node_2", "sourceHandle": "data", "targetHandle": "data" },
      { "id": "e2", "source": "node_2", "target": "node_3", "sourceHandle": "result", "targetHandle": "result" }
    ]
  }
}

### SUPPORTED NODE TYPES:

1. **trigger** - Starts the workflow
   - config: { "type": "manual|webhook|schedule", "schedule": "0 9 * * *" (if schedule) }
   
2. **llm** - LLM processing (Gemini, GPT, Claude)
   - config: { "model": "gemini-2.5-flash|gpt-4o|claude-3.5", "temperature": 0.7, "systemPrompt": "...", "userPrompt": "..." }
   
3. **api** - HTTP API call
   - config: { "method": "GET|POST|PUT", "url": "https://...", "headers": {}, "body": {} }
   
4. **condition** - If-else branching
   - config: { "condition": "{{variable}} === true", "trueLabel": "Yes", "falseLabel": "No" }
   
5. **transform** - Data transformation
   - config: { "operation": "map|filter|merge|extract", "mapping": {} }
   
6. **tool** - External tool (email, search, scrape, etc)
   - config: { "toolName": "send_email|search_web|scrape_url|calculate", "parameters": {} }
   
7. **output** - End node (email, Slack, database, etc)
   - config: { "service": "gmail|slack|webhook|db", "settings": {} }

### POSITIONING RULES:
- **Trigger node**: position.x = 0-50
- **Processing nodes**: position.x = 150-400 (increment by ~150-200 for each level)
- **Output node**: position.x = 500-600
- **Y-spacing**: Use 150 for main flow, offset by 100-150 for branched paths
- Space nodes left-to-right horizontally for sequential flows, vertically for branches

### IMPORTANT RULES:
1. ALWAYS start with a trigger node (type: "trigger")
2. ALWAYS end with an output node (type: "output" or "tool" with service)
3. Include 3-7 nodes for a complete workflow (minimum 2)
4. Every node ID must be unique (node_1, node_2, node_3, etc.)
5. Every edge source/target must reference existing node IDs
6. Use double-quoted strings, no single quotes
7. Use {{nodeId.outputName}} to reference outputs from previous nodes
8. Ensure logical flow: trigger → processing → output
9. Create an edge for every logical transition between steps. If the task has sequential steps, connect them in order. If a step branches, connect both branches.
10. Do not omit edges. A workflow with nodes but no edges is invalid.

### EXAMPLE WORKFLOW (YouTube Transcript):

User request: "Create a workflow that takes a YouTube video URL, transcribes it, summarizes it, and sends the summary to my email"

Response:
{
  "workflow": {
    "name": "YouTube to Email Summary",
    "description": "Fetches YouTube video, transcribes it, summarizes with Gemini, and emails the result",
    "nodes": [
      { "id": "node_1", "type": "trigger", "label": "Get Video URL", "position": { "x": 0, "y": 150 }, "config": { "type": "manual" }, "inputs": [], "outputs": ["url"] },
      { "id": "node_2", "type": "api", "label": "Fetch Transcript", "position": { "x": 150, "y": 150 }, "config": { "method": "POST", "url": "https://api.example.com/transcript", "body": { "url": "{{node_1.url}}" } }, "inputs": ["url"], "outputs": ["transcript"] },
      { "id": "node_3", "type": "llm", "label": "Summarize", "position": { "x": 300, "y": 150 }, "config": { "model": "gemini-2.5-flash", "userPrompt": "Summarize this: {{node_2.transcript}}" }, "inputs": ["transcript"], "outputs": ["summary"] },
      { "id": "node_4", "type": "output", "label": "Send Email", "position": { "x": 450, "y": 150 }, "config": { "service": "gmail", "to": "user@email.com", "subject": "Video Summary", "body": "{{node_3.summary}}" }, "inputs": ["summary"], "outputs": [] }
    ],
    "edges": [
      { "id": "e1", "source": "node_1", "target": "node_2" },
      { "id": "e2", "source": "node_2", "target": "node_3" },
      { "id": "e3", "source": "node_3", "target": "node_4" }
    ]
  }
}

### NOW PROCESS THE USER REQUEST BELOW:
{{USER_PROMPT_HERE}}

Generate ONLY the complete JSON workflow. Start now.`;

function getHandleName(values, fallback) {
  if (Array.isArray(values) && values.length > 0) {
    const firstValue = String(values[0] || '').trim();
    return firstValue || fallback;
  }

  return fallback;
}

function inferEdgesFromNodes(nodes) {
  const inferredEdges = [];

  for (let index = 0; index < nodes.length - 1; index += 1) {
    const sourceNode = nodes[index];
    const targetNode = nodes[index + 1];

    inferredEdges.push({
      id: `e${index + 1}`,
      source: sourceNode.id,
      target: targetNode.id,
      sourceHandle: getHandleName(sourceNode.outputs, 'output'),
      targetHandle: getHandleName(targetNode.inputs, 'input'),
      type: 'smoothstep',
    });
  }

  return inferredEdges;
}

function repairEdges(nodes, edges) {
  const repairedEdges = [];
  const seenPairs = new Set();
  const addEdge = (edge) => {
    const pairKey = `${edge.source}->${edge.target}`;
    if (seenPairs.has(pairKey)) return;
    seenPairs.add(pairKey);
    repairedEdges.push(edge);
  };

  edges.forEach((edge, index) => {
    addEdge({
      id: String(edge.id || `e${index + 1}`).trim(),
      source: String(edge.source || '').trim(),
      target: String(edge.target || '').trim(),
      sourceHandle: edge.sourceHandle ? String(edge.sourceHandle).trim() : undefined,
      targetHandle: edge.targetHandle ? String(edge.targetHandle).trim() : undefined,
      type: edge.type || 'smoothstep',
    });
  });

  const incomingCount = new Map(nodes.map((node) => [node.id, 0]));
  repairedEdges.forEach((edge) => {
    if (incomingCount.has(edge.target)) {
      incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
    }
  });

  for (let index = 1; index < nodes.length; index += 1) {
    const currentNode = nodes[index];
    if ((incomingCount.get(currentNode.id) || 0) > 0) {
      continue;
    }

    const previousNode = nodes[index - 1];
    addEdge({
      id: `e_auto_${previousNode.id}_${currentNode.id}`,
      source: previousNode.id,
      target: currentNode.id,
      sourceHandle: getHandleName(previousNode.outputs, 'output'),
      targetHandle: getHandleName(currentNode.inputs, 'input'),
      type: 'smoothstep',
    });
    incomingCount.set(currentNode.id, 1);
  }

  if (repairedEdges.length === 0 && nodes.length > 1) {
    return inferEdgesFromNodes(nodes);
  }

  return repairedEdges;
}

// Ensure graph connectivity: add edges so every non-trigger node has at least one incoming
function ensureConnectedOrderedEdges(nodes, edges) {
  const existing = Array.isArray(edges) ? edges.slice() : [];
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // Normalize handles and ensure ids
  existing.forEach((e, idx) => {
    e.id = e.id || `e_${idx + 1}`;
    e.sourceHandle = e.sourceHandle || 'default';
    e.targetHandle = e.targetHandle || 'default';
  });

  // Sort nodes left-to-right by x (stable by original index)
  const sorted = nodes.slice().sort((a, b) => (a.position?.x || 0) - (b.position?.x || 0));

  // Build incoming map
  const incoming = new Map(nodes.map((n) => [n.id, 0]));
  existing.forEach((e) => {
    if (incoming.has(e.target)) incoming.set(e.target, (incoming.get(e.target) || 0) + 1);
  });

  // Ensure trigger is first in sorted order
  const trigger = sorted.find((n) => n.type === 'trigger');
  if (trigger) {
    const idx = sorted.findIndex((n) => n.id === trigger.id);
    if (idx > 0) sorted.splice(idx, 1);
    sorted.unshift(trigger);
  }

  // For each node (except first), if it has no incoming edge, connect it to the nearest previous node
  for (let i = 1; i < sorted.length; i += 1) {
    const node = sorted[i];
    if ((incoming.get(node.id) || 0) > 0) continue;

    // find previous node to connect from (prefer immediate left in sorted order)
    let prev = sorted[i - 1];
    if (!prev) prev = sorted[0];

    const newEdge = {
      id: `e_auto_${prev.id}_${node.id}`,
      source: prev.id,
      target: node.id,
      sourceHandle: getHandleName(prev.outputs, 'output'),
      targetHandle: getHandleName(node.inputs, 'input'),
      type: 'smoothstep',
    };

    existing.push(newEdge);
    incoming.set(node.id, (incoming.get(node.id) || 0) + 1);
  }

  // If still disconnected (very unlikely), fall back to linear chain
  const connectedTargets = new Set(existing.map((e) => e.target));
  if (connectedTargets.size < nodes.length - 1) {
    const chain = inferEdgesFromNodes(sorted);
    chain.forEach((c) => {
      if (!existing.find((ex) => ex.source === c.source && ex.target === c.target)) existing.push(c);
    });
  }

  // Remove self-loops and deduplicate by source->target
  const seen = new Set();
  const cleaned = [];
  for (const e of existing) {
    if (!e || !e.source || !e.target) continue;
    if (e.source === e.target) continue;
    const key = `${e.source}->${e.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // ensure id
    e.id = e.id || `e_${e.source}_${e.target}`;
    cleaned.push(e);
  }

  return cleaned;
}

/**
 * Generate workflow using Gemini API
 */
export async function generateWorkflowWithOllama(userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (apiKey) {
    try {
      console.log(`\n🚀 [AgentGenerator] Generating workflow for prompt: "${userPrompt}"`);
      const completion = await callGemini(apiKey, userPrompt);
      const parsed = normalizeWorkflow(completion);
      if (parsed) {
        console.log(`\n✅ [AgentGenerator] Successfully generated ${parsed.nodes.length} nodes, ${parsed.edges.length} edges`);
        console.log('\n[FINAL WORKFLOW JSON]');
        console.log(JSON.stringify(parsed, null, 2));
        return parsed;
      }
      throw new Error('Invalid response structure from Gemini');
    } catch (error) {
      console.error('\n❌ [AgentGenerator] Gemini generation failed, using smart fallback:', error.message);
    }
  } else {
    console.warn('\n⚠️  [AgentGenerator] No GEMINI_API_KEY found, using smart fallback.');
  }

  // Smart keyword-based fallback
  console.log('\n💡 [AgentGenerator] Using smart keyword-based fallback...');
  const fallback = generateSmartFallback(userPrompt);
  // Try to normalize fallback to the same structure as Gemini output
  const normalizedFallback = normalizeWorkflow(fallback);
  if (normalizedFallback) return normalizedFallback;
  return { nodes: fallback.nodes || [], edges: fallback.edges || [] };
}

async function callGemini(apiKey, userPrompt) {
  const timeoutMs = Number.parseInt(process.env.AI_TIMEOUT_MS || '120000', 10);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const systemPrompt = buildSystemPrompt();

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('\n[GEMINI RAW RESPONSE]');
    console.log(JSON.stringify(data, null, 2));
    
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || '')
      .join('')
      .trim();

    console.log('\n[GEMINI EXTRACTED TEXT]');
    console.log(text || '(empty)');

    if (!text) {
      throw new Error('Gemini returned an empty response');
    }

    const extracted = extractJsonObject(text);
    console.log('\n[EXTRACTED JSON OBJECT]');
    console.log(JSON.stringify(extracted, null, 2));
    
    if (!extracted) {
      throw new Error(`Gemini returned non-JSON content: ${text.slice(0, 200)}`);
    }

    return extracted;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractJsonObject(text) {
  const trimmed = String(text || '').trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const jsonText = candidate.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function cloneWorkflow(workflow) {
  return JSON.parse(JSON.stringify(workflow));
}

function applyPromptPlaceholders(value, prompt) {
  if (typeof value === 'string') {
    return value.replace(/\{\{prompt\}\}/g, prompt);
  }

  if (Array.isArray(value)) {
    return value.map((item) => applyPromptPlaceholders(item, prompt));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, applyPromptPlaceholders(item, prompt)])
    );
  }

  return value;
}

function createWorkflowFromBlueprints(prompt) {
  const normalized = String(prompt || '').toLowerCase();
  const blueprint = WORKFLOW_BLUEPRINTS.blueprints.find((entry) =>
    entry.keywords.some((keyword) => normalized.includes(keyword))
  );

  if (!blueprint) {
    return null;
  }

  const workflow = cloneWorkflow({ nodes: blueprint.nodes, edges: blueprint.edges });
  workflow.nodes = workflow.nodes.map((node) => ({
    ...node,
    data: applyPromptPlaceholders(node.data, prompt),
  }));

  return workflow;
}

function normalizeWorkflow(workflow) {
  if (!workflow || typeof workflow !== 'object') {
    console.warn('[normalizeWorkflow] Invalid workflow object');
    return null;
  }

  console.log('\n[NORMALIZING WORKFLOW]');

  // Handle both direct nodes/edges format and wrapped workflow format
  let workflowData = workflow;
  if (workflow.workflow && !workflow.nodes) {
    workflowData = workflow.workflow;
    console.log('  ✓ Found workflow wrapper, extracting workflow data');
  }

  const nodes = Array.isArray(workflowData.nodes) ? workflowData.nodes : [];
  console.log(`  Raw nodes count: ${nodes.length}`);
  
  const filteredNodes = nodes
    .filter((node) => node && typeof node === 'object')
    .map((node) => {
      // Validate node has required fields (accept 'label' or 'name')
      if (!node.id || !node.type || !(node.label || node.name)) {
        console.warn(`  ⚠️  Skipping node missing required fields: ${JSON.stringify(node).slice(0, 80)}`);
        return null;
      }
      
      // Use label if name doesn't exist
      return {
        id: String(node.id).trim(),
        type: String(node.type).trim(),
        name: String(node.label || node.name || '').trim(),
        data: node.config && typeof node.config === 'object' ? node.config : {},
        position: node.position && typeof node.position === 'object' 
          ? { x: Number(node.position.x) || 0, y: Number(node.position.y) || 0 }
          : null,
        description: String(node.description || '').trim(),
        inputs: Array.isArray(node.inputs) ? node.inputs : [],
        outputs: Array.isArray(node.outputs) ? node.outputs : [],
      };
    })
    .filter((node) => node && node.id && node.type && node.name && ALLOWED_NODE_TYPES.has(node.type));

  console.log(`  Filtered nodes count (after validation): ${filteredNodes.length}`);

  if (filteredNodes.length < 2) {
    console.warn(`  ⚠️  Not enough valid nodes (${filteredNodes.length} < 2), falling back`);
    return null;
  }

  // Ensure trigger node is first
  const triggerIndex = filteredNodes.findIndex((node) => node.type === 'trigger');
  if (triggerIndex > 0) {
    const [triggerNode] = filteredNodes.splice(triggerIndex, 1);
    filteredNodes.unshift(triggerNode);
    console.log(`  ✓ Trigger node moved to front`);
  } else if (triggerIndex === -1) {
    console.warn(`  ⚠️  No trigger node found, invalid workflow`);
    return null;
  }

  // Ensure output/tool node exists
  let hasOutput = filteredNodes.some((node) => node.type === 'output' || node.type === 'tool');
  if (!hasOutput) {
    console.warn(`  ⚠️  No output or tool node found, auto-adding a default output node`);
    const defaultOutputId = `output_${Math.floor(Math.random() * 10000)}`;
    filteredNodes.push({
      id: defaultOutputId,
      type: 'output',
      name: 'Default Output',
      data: {},
      position: { x: 600, y: 150 },
      description: 'Auto-added output node',
      inputs: [],
      outputs: [],
    });
    hasOutput = true;
  }

  const limitedNodes = filteredNodes.slice(0, 8);
  console.log(`  Limited to ${limitedNodes.length} nodes (max 8)`);
  
  const allowedIds = new Set(limitedNodes.map((node) => node.id));

  // If nodes don't have positions, generate them
  limitedNodes.forEach((node, index) => {
    if (!node.position) {
      // Auto-generate positions: left-to-right layout
      node.position = {
        x: Math.min(index * 150, 600),
        y: 150,
      };
    }
  });

  const edges = Array.isArray(workflowData.edges) ? workflowData.edges : [];
  const filteredEdges = edges
    .filter((edge) => edge && typeof edge === 'object')
    .map((edge) => ({
      id: String(edge.id || `e_${edge.source}_${edge.target}`).trim(),
      source: String(edge.source || '').trim(),
      target: String(edge.target || '').trim(),
      sourceHandle: edge.sourceHandle ? String(edge.sourceHandle).trim() : undefined,
      targetHandle: edge.targetHandle ? String(edge.targetHandle).trim() : undefined,
    }))
    .filter((edge) => {
      if (!edge.source || !edge.target || edge.source === edge.target) return false;
      if (!allowedIds.has(edge.source) || !allowedIds.has(edge.target)) return false;
      return true;
    });

  const repairedEdges = repairEdges(limitedNodes, filteredEdges);
  console.log(`  Edges: ${edges.length} total, ${filteredEdges.length} valid, ${repairedEdges.length} after repair`);

  // Ensure connectivity and ordering: fill any missing connections deterministically
  const finalEdges = ensureConnectedOrderedEdges(limitedNodes, repairedEdges);
  console.log(`  Final edges after ensureConnectedOrderedEdges: ${finalEdges.length}`);

  // Build final workflow preserving all new schema properties
  const result = {
    workflow: {
      name: workflowData.workflow?.name || workflow.workflow?.name || 'Generated Workflow',
      description: workflowData.workflow?.description || workflow.workflow?.description || '',
    },
    nodes: limitedNodes.map((node) => ({
      id: node.id,
      type: node.type,
      name: node.name,
      label: node.name,
      data: node.data,
      position: node.position,
      description: node.description,
      inputs: node.inputs,
      outputs: node.outputs,
    })),
    edges: finalEdges,
  };

  return result;
}

/**
 * Smart fallback: generates a relevant workflow based on keywords in the prompt.
 */
function generateSmartFallback(prompt) {
  const blueprintWorkflow = createWorkflowFromBlueprints(prompt);
  if (blueprintWorkflow) {
    console.log(`\n📋 [Fallback] Using blueprint workflow`);
    return blueprintWorkflow;
  }

  const p = prompt.toLowerCase();

  // --- Sales Agent ---
  if (p.includes('sales') || p.includes('lead') || p.includes('crm') || p.includes('prospect')) {
    console.log(`\n📋 [Fallback] Matched Sales Agent pattern`);
    return {
      nodes: [
        { id: 'trigger_1', type: 'trigger', name: 'New Lead Trigger', data: { initialContext: 'new_lead' } },
        { id: 'openai_qualify', type: 'openai', name: 'AI Lead Qualifier', data: { prompt: 'Analyze this lead and score them 1-10 based on fit', apiKey: 'env' } },
        { id: 'if_qualified', type: 'if', name: 'Is Lead Qualified?', data: { condition: 'score >= 7' } },
        { id: 'openai_email', type: 'openai', name: 'Generate Sales Email', data: { prompt: 'Write a personalized outreach email for this lead', apiKey: 'env' } },
        { id: 'gmail_send', type: 'gmail', name: 'Send Outreach Email', data: { to: '{{lead.email}}', subject: 'Partnership Opportunity' } },
        { id: 'hubspot_update', type: 'hubspot', name: 'Update CRM', data: { action: 'update_contact', status: 'contacted' } },
        { id: 'slack_notify', type: 'slack', name: 'Notify Sales Team', data: { channel: '#sales', message: 'New qualified lead contacted' } },
      ],
      edges: [
        { source: 'trigger_1', target: 'openai_qualify' },
        { source: 'openai_qualify', target: 'if_qualified' },
        { source: 'if_qualified', target: 'openai_email' },
        { source: 'openai_email', target: 'gmail_send' },
        { source: 'gmail_send', target: 'hubspot_update' },
        { source: 'hubspot_update', target: 'slack_notify' },
      ],
    };
  }

  // --- Social Media Agent ---
  if (p.includes('social media') || p.includes('instagram') || p.includes('post') || p.includes('content') || p.includes('marketing')) {
    console.log(`\n📋 [Fallback] Matched Social Media Agent pattern`);
    return {
      nodes: [
        { id: 'trigger_1', type: 'schedule', name: 'Daily Schedule', data: { cron: '0 9 * * *' } },
        { id: 'openai_content', type: 'openai', name: 'Generate Post Content', data: { prompt: 'Write an engaging social media post about trending topics', apiKey: 'env' } },
        { id: 'dalle_image', type: 'dalle', name: 'Generate Post Image', data: { prompt: 'Create a vibrant social media visual', apiKey: 'env' } },
        { id: 'instagram_post', type: 'instagram', name: 'Post to Instagram', data: { caption: '{{openai_content.text}}', mediaUrl: '{{dalle_image.url}}' } },
        { id: 'twitter_post', type: 'twitter', name: 'Post to X/Twitter', data: { text: '{{openai_content.text}}' } },
        { id: 'google_analytics_track', type: 'google_analytics', name: 'Track Engagement', data: { event: 'social_post_published' } },
      ],
      edges: [
        { source: 'trigger_1', target: 'openai_content' },
        { source: 'openai_content', target: 'dalle_image' },
        { source: 'dalle_image', target: 'instagram_post' },
        { source: 'dalle_image', target: 'twitter_post' },
        { source: 'instagram_post', target: 'google_analytics_track' },
        { source: 'twitter_post', target: 'google_analytics_track' },
      ],
    };
  }

  // --- Customer Support Agent ---
  if (p.includes('support') || p.includes('customer') || p.includes('ticket') || p.includes('helpdesk') || p.includes('chat')) {
    console.log(`\n📋 [Fallback] Matched Customer Support Agent pattern`);
    return {
      nodes: [
        { id: 'trigger_1', type: 'webhook', name: 'New Support Ticket', data: { event: 'ticket_created' } },
        { id: 'openai_classify', type: 'openai', name: 'Classify Issue', data: { prompt: 'Classify this support ticket by urgency and category', apiKey: 'env' } },
        { id: 'switch_priority', type: 'switch', name: 'Route by Priority', data: { field: 'urgency' } },
        { id: 'openai_response', type: 'openai', name: 'Generate AI Response', data: { prompt: 'Draft a helpful response to this customer issue', apiKey: 'env' } },
        { id: 'zendesk_update', type: 'zendesk', name: 'Update Ticket', data: { status: 'in_progress' } },
        { id: 'gmail_reply', type: 'gmail', name: 'Send Response', data: { to: '{{ticket.email}}' } },
      ],
      edges: [
        { source: 'trigger_1', target: 'openai_classify' },
        { source: 'openai_classify', target: 'switch_priority' },
        { source: 'switch_priority', target: 'openai_response' },
        { source: 'openai_response', target: 'zendesk_update' },
        { source: 'zendesk_update', target: 'gmail_reply' },
      ],
    };
  }

  // --- Email Marketing Agent ---
  if (p.includes('email') || p.includes('newsletter') || p.includes('campaign') || p.includes('mailchimp')) {
    console.log(`\n📋 [Fallback] Matched Email Marketing Agent pattern`);
    return {
      nodes: [
        { id: 'trigger_1', type: 'schedule', name: 'Weekly Schedule', data: { cron: '0 10 * * MON' } },
        { id: 'openai_newsletter', type: 'openai', name: 'Write Newsletter', data: { prompt: 'Write an engaging weekly newsletter', apiKey: 'env' } },
        { id: 'google_sheets_list', type: 'google_sheets', name: 'Get Subscriber List', data: { spreadsheetId: 'subscribers' } },
        { id: 'sendgrid_send', type: 'sendgrid', name: 'Send Email Campaign', data: { from: 'newsletter@company.com' } },
        { id: 'mixpanel_track', type: 'mixpanel', name: 'Track Campaign', data: { event: 'email_campaign_sent' } },
      ],
      edges: [
        { source: 'trigger_1', target: 'openai_newsletter' },
        { source: 'openai_newsletter', target: 'google_sheets_list' },
        { source: 'google_sheets_list', target: 'sendgrid_send' },
        { source: 'sendgrid_send', target: 'mixpanel_track' },
      ],
    };
  }

  // --- Data Pipeline Agent ---
  if (p.includes('data') || p.includes('etl') || p.includes('pipeline') || p.includes('database') || p.includes('sync')) {
    console.log(`\n📋 [Fallback] Matched Data Pipeline Agent pattern`);
    return {
      nodes: [
        { id: 'trigger_1', type: 'schedule', name: 'Hourly Sync', data: { cron: '0 * * * *' } },
        { id: 'postgresql_read', type: 'postgresql', name: 'Read Source DB', data: { query: 'SELECT * FROM records WHERE updated_at > NOW() - INTERVAL 1 HOUR' } },
        { id: 'openai_transform', type: 'openai', name: 'Transform & Enrich Data', data: { prompt: 'Clean and enrich this data batch', apiKey: 'env' } },
        { id: 'mongodb_write', type: 'mongodb', name: 'Write to MongoDB', data: { collection: 'processed_records' } },
        { id: 'slack_notify', type: 'slack', name: 'Notify Team', data: { channel: '#data-ops', message: 'Sync completed successfully' } },
      ],
      edges: [
        { source: 'trigger_1', target: 'postgresql_read' },
        { source: 'postgresql_read', target: 'openai_transform' },
        { source: 'openai_transform', target: 'mongodb_write' },
        { source: 'mongodb_write', target: 'slack_notify' },
      ],
    };
  }

  // --- E-commerce Agent ---
  if (p.includes('ecommerce') || p.includes('shop') || p.includes('order') || p.includes('product') || p.includes('store')) {
    console.log(`\n📋 [Fallback] Matched E-commerce Agent pattern`);
    return {
      nodes: [
        { id: 'trigger_1', type: 'webhook', name: 'New Order', data: { event: 'order_placed' } },
        { id: 'shopify_order', type: 'shopify', name: 'Get Order Details', data: { action: 'get_order' } },
        { id: 'openai_confirm', type: 'openai', name: 'Generate Confirmation', data: { prompt: 'Write a personalized order confirmation message', apiKey: 'env' } },
        { id: 'gmail_confirm', type: 'gmail', name: 'Send Confirmation', data: { to: '{{order.email}}' } },
        { id: 'stripe_process', type: 'stripe', name: 'Process Payment', data: { action: 'capture' } },
        { id: 'google_sheets_log', type: 'google_sheets', name: 'Log Order', data: { action: 'append_row' } },
      ],
      edges: [
        { source: 'trigger_1', target: 'shopify_order' },
        { source: 'shopify_order', target: 'openai_confirm' },
        { source: 'openai_confirm', target: 'gmail_confirm' },
        { source: 'shopify_order', target: 'stripe_process' },
        { source: 'stripe_process', target: 'google_sheets_log' },
      ],
    };
  }

  // --- Default: Generic AI Automation Agent ---
  console.log(`\n📋 [Fallback] Using Generic AI Automation Agent (no specific pattern matched)`);
  return {
    nodes: [
      { id: 'trigger_1', type: 'trigger', name: 'Start Workflow', data: { initialContext: 'start' } },
      { id: 'openai_analyze', type: 'openai', name: 'AI Analysis', data: { prompt: `Analyze and plan: ${prompt}`, apiKey: 'env' } },
      { id: 'openai_generate', type: 'openai', name: 'Generate Output', data: { prompt: 'Create detailed output based on analysis', apiKey: 'env' } },
      { id: 'action_process', type: 'action', name: 'Process Results', data: { actionType: 'process_output' } },
      { id: 'gmail_deliver', type: 'gmail', name: 'Deliver Results', data: { subject: 'AI Workflow Results' } },
      { id: 'slack_notify', type: 'slack', name: 'Send Notification', data: { channel: '#general', message: 'Workflow completed' } },
    ],
    edges: [
      { source: 'trigger_1', target: 'openai_analyze' },
      { source: 'openai_analyze', target: 'openai_generate' },
      { source: 'openai_generate', target: 'action_process' },
      { source: 'action_process', target: 'gmail_deliver' },
      { source: 'action_process', target: 'slack_notify' },
    ],
  };
}
