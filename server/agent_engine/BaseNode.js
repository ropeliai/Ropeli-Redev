class BaseNode {
  constructor(id, type, name, data = {}) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.data = data; // Configuration parameters
  }

  /**
   * Evaluate dynamic parameters mapped from previous node outputs.
   * e.g., {{node.trigger_1.data.script}} -> actual value
   */
  resolveParameters(context) {
    const resolvedData = { ...this.data };
    for (const key in resolvedData) {
      if (typeof resolvedData[key] === 'string' && resolvedData[key].startsWith('{{') && resolvedData[key].endsWith('}}')) {
        const path = resolvedData[key].slice(2, -2).trim(); // e.g. node.trigger_1.data.script
        const parts = path.split('.');
        if (parts[0] === 'node') {
          const sourceNodeId = parts[1];
          let value = context[sourceNodeId];
          for (let i = 2; i < parts.length; i++) {
            if (value && value[parts[i]] !== undefined) {
              value = value[parts[i]];
            } else {
              value = undefined;
              break;
            }
          }
          resolvedData[key] = value;
        }
      }
    }
    return resolvedData;
  }

  /**
   * Execute the node's logic. Must be implemented by subclasses.
   * @param {Object} context - The context containing outputs from previous nodes.
   * @returns {Promise<Object>} The output of this node.
   */
  async execute(context) {
    throw new Error('execute() must be implemented by subclass');
  }
}

export default BaseNode;
