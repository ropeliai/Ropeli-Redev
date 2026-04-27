import BaseNode from '../BaseNode.js';

class TriggerNode extends BaseNode {
  constructor(id, name, data = {}) {
    super(id, 'trigger', name, data);
  }

  async execute(context) {
    const params = this.resolveParameters(context);
    // Triggers typically just pass along initial data or await an event.
    // Here we just return any input data as output.
    return params;
  }
}

export default TriggerNode;
