import BaseNode from '../BaseNode.js';

class DalleNode extends BaseNode {
  constructor(id, name, data = {}) {
    super(id, 'dalle', name, data);
  }

  async execute(context) {
    const params = this.resolveParameters(context);
    
    const prompt = params.prompt;
    const apiKey = params.apiKey || process.env.OPENAI_API_KEY;

    if (!prompt) throw new Error("DalleNode requires a 'prompt' parameter.");
    if (!apiKey) throw new Error("DalleNode requires an 'apiKey' parameter or OPENAI_API_KEY env var.");
    
    console.log(`[DALL-E API] Generating image for prompt: "${prompt}"`);
    
    try {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024"
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "DALL-E API Error");
      }

      const data = await response.json();
      const imageUrl = data.data[0]?.url || "";

      return {
        url: imageUrl,
        status: "success"
      };
    } catch (error) {
      console.error("[DALL-E Node Error]", error);
      throw error;
    }
  }
}

export default DalleNode;
