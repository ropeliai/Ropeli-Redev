import WorkflowRunner from './WorkflowRunner.js';
import TriggerNode from './nodes/TriggerNode.js';
import OpenAINode from './nodes/OpenAINode.js';
import ActionNode from './nodes/ActionNode.js';
import InstagramNode from './nodes/InstagramNode.js';
import DalleNode from './nodes/DalleNode.js';
import SlackNode from './nodes/SlackNode.js';
import BaseNode from './BaseNode.js';

// Generic fallback node for any unregistered type
class GenericNode extends BaseNode {
  constructor(id, name, data = {}, type = 'generic') {
    super(id, type, name, data);
  }
  async execute(context) {
    const params = this.resolveParameters(context);
    console.log(`[GenericNode] Executing node "${this.name}" (type: ${this.type}) with params:`, params);
    // Pass through all params as output so downstream nodes can reference them
    return { ...params, status: 'success', message: `Node "${this.name}" executed (generic).` };
  }
}

const NODE_REGISTRY = {
  trigger: TriggerNode,
  openai: OpenAINode,
  action: ActionNode,
  instagram: InstagramNode,
  dalle: DalleNode,
  slack: SlackNode,
};

/**
 * Parses a workflow JSON schema and returns an executable runner.
 * @param {Object} workflowConfig 
 * @returns {WorkflowRunner}
 */
export function buildWorkflow(workflowConfig) {
  const runner = new WorkflowRunner(workflowConfig);

  for (const nodeConfig of workflowConfig.nodes) {
    const NodeClass = NODE_REGISTRY[nodeConfig.type];
    let nodeInstance;
    if (!NodeClass) {
      console.warn(`[WorkflowRunner] Unknown node type "${nodeConfig.type}" — using GenericNode fallback.`);
      nodeInstance = new GenericNode(nodeConfig.id, nodeConfig.name, nodeConfig.data, nodeConfig.type);
    } else {
      nodeInstance = new NodeClass(nodeConfig.id, nodeConfig.name, nodeConfig.data);
    }
    runner.registerNode(nodeInstance);
  }

  return runner;
}

/**
 * Runs a workflow configuration.
 * @param {Object} workflowConfig 
 */
export async function executeWorkflow(workflowConfig) {
  const runner = buildWorkflow(workflowConfig);
  return await runner.run();
}
