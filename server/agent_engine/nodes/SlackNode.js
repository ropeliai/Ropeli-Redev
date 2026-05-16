import BaseNode from '../BaseNode.js';

class SlackNode extends BaseNode {
  constructor(id, name, data = {}) {
    super(id, 'slack', name, data);
  }

  async execute(context) {
    const params = this.resolveParameters(context);
    
    const channel = params.channel;
    const message = params.message;
    const webhookUrl = params.webhookUrl;

    if (!message) throw new Error("SlackNode requires a 'message' parameter.");
    
    console.log(`[Slack API] Sending message to ${channel || 'default channel'}: "${message}"`);
    
    // Simulate Slack API call
    if (webhookUrl) {
        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: message })
            });
        } catch (e) {
            console.error("[Slack Node] Webhook delivery failed", e);
        }
    }

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      sentMessage: message,
      channel: channel || 'default'
    };
  }
}

export default SlackNode;
