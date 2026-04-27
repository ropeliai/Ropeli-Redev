import BaseNode from '../BaseNode.js';

class ActionNode extends BaseNode {
  constructor(id, name, data = {}) {
    super(id, 'action', name, data);
  }

  async execute(context) {
    const params = this.resolveParameters(context);
    
    const actionType = params.actionType; // e.g. "generate_video"
    const inputData = params.inputData;

    console.log(`[ActionNode] Executing action: ${actionType}`);

    // Mock action
    if (actionType === 'generate_video') {
      return {
        videoUrl: "https://example.com/generated_reel.mp4",
        status: "success"
      };
    }
    
    return { result: "Generic action executed", params };
  }
}

export default ActionNode;
