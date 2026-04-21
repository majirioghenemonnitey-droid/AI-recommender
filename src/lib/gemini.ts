import { GoogleGenAI, Type } from "@google/genai";

export interface RecommendationResult {
  primaryTool: string;
  whyItFits: string;
  bestUsedFor: string[];
  alternativeTools: string[];
  comparisonStrategy: string;
  betterResultsTip: string;
  nextStep: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getRecommendation(data: any): Promise<RecommendationResult> {
  const systemInstruction = `You are an expert AI consultant for the AI Literacy Academy. 
Your goal is to recommend the best AI tools and specialized training based on the user's business challenge.
The AI Literacy Academy is the foundational starting point for ALL users. 
Always return your response in clean JSON format.`;

  const userPrompt = `
User Profile:
- Role: ${data.role || "N/A"}
- Primary Challenge: ${data.mainNeed || "N/A"}
- Specific Details: ${data.contextCreate || "N/A"}
- Context/Constraints: ${data.contextSituation || "N/A"}
- Tool Preference: ${data.toolPreference || "N/A"}

STRICT MAPPING & PRIORITIES (FROM CHEAT SHEET):
**0. Foundational Knowledge & Monetization:** AI Literacy Academy (For anyone who doesn't know how to use AI or is looking to make money/grow business).
**1. Text & Ideas:** ChatGPT, Claude, Gemini, Perplexity, Deepseek.
**2. Images:** Flux AI, AutoDraw, Remove.bg, Canva AI, Midjourney.
**3. Audio & Video:** Kling AI, InVideo, Heygen, ElevenLabs, Suno, Fireflies.ai, Otter.ai.
**4. Presentations:** Gamma, Tome, Humata.
**5. Business & Productivity:** Serlzo (WhatsApp & Email Primary), Grammarly, Rytr, Zapier, Canva, Taskade, Looka.

SPECIAL RULE: 
- If the user implies they don't know how to start, don't know how to use AI, or are looking for "money", "monetization", or "business growth", the PRIMARY TOOL must be the **AI Literacy Academy**.

INSTRUCTIONS:
1. Pick 1 Primary Tool and 2 Alternatives.
2. If AI Literacy Academy is primary, explain that it is the ultimate starting guide for mastering these tools to generate income.
3. Explain why the primary tool fits. Start with: "Because you said [user detail], this is why: "
4. List 3 specific use cases.
5. Suggest a comparison strategy between the tools.
6. Give 1 Pro Tip.
7. For next steps, mention the AI Literacy Academy for mastering workflows.
`;

  let lastError = null;
  for (let i = 0; i < 2; i++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              primaryTool: { type: Type.STRING },
              whyItFits: { type: Type.STRING },
              bestUsedFor: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              alternativeTools: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              comparisonStrategy: { type: Type.STRING },
              betterResultsTip: { type: Type.STRING },
              nextStep: { type: Type.STRING }
            },
            required: ["primaryTool", "whyItFits", "bestUsedFor", "alternativeTools", "comparisonStrategy", "betterResultsTip", "nextStep"]
          }
        }
      });

      return JSON.parse(response.text || "{}");
    } catch (error: any) {
      lastError = error;
      console.warn(`Gemini attempt ${i + 1} failed:`, error.message);
      if (i === 0) await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.error("Gemini Final Error:", lastError);
  
  // FINAL FALLBACK: If AI is completely down, return a high-quality default strategy
  // This ensures the user NEVER sees an error screen.
  return {
    primaryTool: "AI Literacy Academy",
    whyItFits: "Because you are looking for a reliable way to integrate AI into your specific workflow, the Academy is your best starting point.",
    bestUsedFor: [
      "Learning the foundations of AI automation",
      "Discovering monetization strategies for your business",
      "Getting step-by-step guidance on all the tools mentioned in your profile"
    ],
    alternativeTools: ["ChatGPT", "Serlzo", "Canva AI"],
    comparisonStrategy: "While individual tools solve single problems, the Academy teaches you how to combine them into an automated money-making system.",
    betterResultsTip: "Start with the 'Foundation' module in the Academy to learn how to prompt these tools for professional-grade results.",
    nextStep: "Join the AI Literacy Academy today to master the tools that fit your role perfectly."
  };
}
