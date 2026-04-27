
const SYSTEM_PROMPT = `You are an expert AI workflow agent architect. Your task is to generate a JSON representation of an executable workflow based on the user's prompt.
The workflow is a Directed Acyclic Graph (DAG) consisting of nodes and edges.

AVAILABLE NODE TYPES:
1. trigger: Starts the workflow. Does not require mapping from other nodes. (id typically starts with 'trigger_')
2. openai: Generates text or content. Requires 'prompt' and 'apiKey'. (id typically starts with 'openai_')
3. action: Performs an action, like 'generate_video'. Requires 'actionType' and 'inputData'. (id typically starts with 'action_')
4. instagram: Posts to Instagram. Requires 'mediaUrl', 'caption', and 'accessToken'. (id typically starts with 'instagram_')

JSON FORMAT:
You must output ONLY valid JSON in the following format, with no markdown formatting or explanation text:
{
  "nodes": [
    {
      "id": "trigger_1",
      "type": "trigger",
      "name": "Manual Trigger",
      "data": {
        "initialContext": "start"
      }
    },
    {
      "id": "openai_1",
      "type": "openai",
      "name": "Generate Script",
      "data": {
        "prompt": "Write a 30-second Reel script about AI agents.",
        "apiKey": "user-provided-or-mock"
      }
    },
    {
      "id": "action_1",
      "type": "action",
      "name": "Create Video",
      "data": {
        "actionType": "generate_video",
        "inputData": "{{node.openai_1.data.text}}"
      }
    },
    {
      "id": "instagram_1",
      "type": "instagram",
      "name": "Post to Instagram",
      "data": {
        "mediaUrl": "{{node.action_1.data.videoUrl}}",
        "caption": "{{node.openai_1.data.text}}",
        "accessToken": "mock-ig-token"
      }
    }
  ],
  "edges": [
    { "source": "trigger_1", "target": "openai_1" },
    { "source": "openai_1", "target": "action_1" },
    { "source": "action_1", "target": "instagram_1" }
  ]
}

PARAMETER MAPPING:
Use the syntax '{{node.<node_id>.data.<property>}}' to reference outputs from previous nodes.
For example, the OpenAINode outputs 'text', so to use it in another node, pass '{{node.openai_1.data.text}}'.
The ActionNode (when actionType is 'generate_video') outputs 'videoUrl'.

Your job: Read the user's request and build the nodes array and edges array. Output ONLY valid JSON.
`;

export async function generateWorkflowWithOllama(userPrompt) {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2', // Or whatever model you prefer
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        stream: false,
        format: 'json'
      })
    });

    const data = await response.json();
    if (data.response) {
      return JSON.parse(data.response);
    }
    throw new Error('Invalid response from Ollama');
  } catch (error) {
    console.error("Error generating workflow from Ollama:", error);
    // Fallback static example if Ollama fails (for demo purposes)
    return {
      nodes: [
        { id: "trigger_1", type: "trigger", name: "Manual Trigger", data: { initialContext: "start" } },
        { id: "openai_1", type: "openai", name: "Generate Script", data: { prompt: "Write a 30-second Reel script about AI agents.", apiKey: "mock" } },
        { id: "action_1", type: "action", name: "Create Video", data: { actionType: "generate_video", inputData: "{{node.openai_1.data.text}}" } },
        { id: "instagram_1", type: "instagram", name: "Post to Instagram", data: { mediaUrl: "{{node.action_1.data.videoUrl}}", caption: "{{node.openai_1.data.text}}", accessToken: "mock-ig-token" } }
      ],
      edges: [
        { source: "trigger_1", target: "openai_1" },
        { source: "openai_1", target: "action_1" },
        { source: "action_1", target: "instagram_1" }
      ]
    };
  }
}
