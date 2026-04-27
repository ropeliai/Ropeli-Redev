import BaseNode from './BaseNode.js';

class WorkflowRunner {
  constructor(workflowConfig) {
    this.nodes = {}; // Map of id -> Node instance
    this.edges = workflowConfig.edges || []; // Array of { source, target }
    this.context = {}; // Shared context to store node outputs
  }

  registerNode(nodeInstance) {
    this.nodes[nodeInstance.id] = nodeInstance;
  }

  /**
   * Determine the execution order based on the edges (topological sort).
   */
  getExecutionPlan() {
    const inDegree = {};
    const adjList = {};
    const plan = [];

    // Initialize
    for (const id in this.nodes) {
      inDegree[id] = 0;
      adjList[id] = [];
    }

    // Build graph
    for (const edge of this.edges) {
      const { source, target } = edge;
      adjList[source].push(target);
      inDegree[target]++;
    }

    // Find sources (nodes with 0 in-degree)
    const queue = [];
    for (const id in inDegree) {
      if (inDegree[id] === 0) {
        queue.push(id);
      }
    }

    // Sort
    while (queue.length > 0) {
      const current = queue.shift();
      plan.push(current);

      for (const neighbor of adjList[current]) {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (plan.length !== Object.keys(this.nodes).length) {
      throw new Error("Cycle detected or disconnected nodes in the workflow graph.");
    }

    return plan;
  }

  /**
   * Run the workflow end-to-end
   */
  async run() {
    console.log("Starting workflow execution...");
    const plan = this.getExecutionPlan();

    for (const nodeId of plan) {
      const node = this.nodes[nodeId];
      console.log(`Executing node [${node.name}] (${nodeId})...`);
      
      try {
        const output = await node.execute(this.context);
        this.context[nodeId] = { data: output };
        console.log(`Node [${node.name}] output:`, output);
      } catch (error) {
        console.error(`Error executing node [${node.name}]:`, error);
        throw error; // Stop execution on error
      }
    }

    console.log("Workflow execution completed.");
    return this.context;
  }
}

export default WorkflowRunner;
