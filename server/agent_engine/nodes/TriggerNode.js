import BaseNode from '../BaseNode.js';

class TriggerNode extends BaseNode {
  constructor(id, name, data = {}) {
    super(id, 'trigger', name, data);
  }

  async execute(context) {
    const params = this.resolveParameters(context);
    // If a normalized trigger event was injected by the runtime, propagate it directly.
    // Otherwise fall back to the node configuration parameters.
    return context.triggerEvent || params;
  }
}

export default TriggerNode;
