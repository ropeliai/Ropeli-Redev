import BaseNode from '../BaseNode.js';

class OpenAINode extends BaseNode {
  constructor(id, name, data = {}) {
    super(id, 'openai', name, data);
  }

  async execute(context) {
    const params = this.resolveParameters(context);
    
    const prompt = params.prompt;
    const apiKey = params.apiKey;

    if (!prompt) throw new Error("OpenAINode requires a 'prompt' parameter.");
    const keyToUse = apiKey || process.env.OPENAI_API_KEY;
    if (!keyToUse) throw new Error("OpenAINode requires an 'apiKey' parameter or OPENAI_API_KEY env var.");
    
    console.log(`[OpenAI API] Generating content for prompt: "${prompt}"`);
    
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${keyToUse}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "OpenAI API Error");
      }

      const data = await response.json();
      const generatedText = data.choices[0]?.message?.content || "";

      return {
        text: generatedText,
        status: "success"
      };
    } catch (error) {
      console.error("[OpenAI Node Error]", error);
      throw error;
    }
  }
}

export default OpenAINode;
