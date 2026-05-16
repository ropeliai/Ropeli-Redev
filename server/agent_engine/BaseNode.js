class BaseNode {
  constructor(id, type, name, data = {}) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.data = data; // Configuration parameters
  }

  /**
   * Evaluate dynamic parameters mapped from previous node outputs.
   * Supports: "Hello {{node.id.data.name}}!" or just "{{node.id.data.value}}"
   */
  resolveParameters(context) {
    const resolvedData = { ...this.data };
    
    for (const key in resolvedData) {
      const value = resolvedData[key];
      
      if (typeof value === 'string') {
        // Regex to find all {{node.id.path}} occurrences
        resolvedData[key] = value.replace(/\{\{(node\.[^}]+)\}\}/g, (match, path) => {
          const parts = path.trim().split('.');
          if (parts[0] === 'node') {
            const sourceNodeId = parts[1];
            let current = context[sourceNodeId];
            
            for (let i = 2; i < parts.length; i++) {
              if (current && current[parts[i]] !== undefined) {
                current = current[parts[i]];
              } else {
                current = undefined;
                break;
              }
            }
            
            // If the whole value was just the template, we might want to return the actual type (e.g. object/number)
            // but for replace we convert to string. If it's a perfect match, we handle it separately below.
            return current !== undefined ? current : match;
          }
          return match;
        });

        // Special case: if the string was EXACTLY "{{node.id.path}}", preserve the original data type
        const exactMatch = value.match(/^\{\{(node\.[^}]+)\}\}$/);
        if (exactMatch) {
          const path = exactMatch[1].trim();
          const parts = path.split('.');
          const sourceNodeId = parts[1];
          let current = context[sourceNodeId];
          for (let i = 2; i < parts.length; i++) {
             if (current && current[parts[i]] !== undefined) current = current[parts[i]];
             else { current = undefined; break; }
          }
          if (current !== undefined) resolvedData[key] = current;
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
