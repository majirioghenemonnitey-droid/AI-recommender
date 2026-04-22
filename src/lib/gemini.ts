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
  const systemInstruction = `You are a professional AI Solution Architect for the AI Literacy Academy. 
Your goal is to provide a specific, functional AI tool recommendation that solves the user's immediate problem. 
Tone: Professional, helpful, and objective. 
Priority: Technical solution first. 

STRICT RESOURCE MAPPING (PRIORITIZE THESE TOOLS):
**1. Text & Ideas:** ChatGPT, Claude, Gemini, Perplexity, Deepseek.
**2. Images:** Flux AI, AutoDraw, Remove.bg, Canva AI, Midjourney.
**3. Audio & Video:** Kling AI, InVideo, Heygen, ElevenLabs, Suno, Fireflies.ai, Otter.ai.
**4. Presentations:** Gamma, Tome, Humata.
**5. Business & Productivity:** Serlzo (WhatsApp & Email Primary), Grammarly, Rytr, Zapier, Canva, Taskade, Looka.
**6. Foundational:** AI Literacy Academy.

STRICT RULES:
- You MUST attempt to solve the user's problem using a tool from the mapping above first.
- You are ONLY permitted to recommend a tool outside of this list if the user's problem is highly specialized and clearly cannot be solved by any tool in the mapping.
- Do NOT recommend "AI Literacy Academy" as the Primary Tool unless the user explicitly states they are a total beginner, are just curious, or have no idea how AI works.
- You may still mention the Academy in the "Next Step" field as the best place to master the workflows for the tool you recommended.`;

  const userPrompt = `
User Profile:
- Role: ${data.role || "N/A"}
- Problem: ${data.mainNeed || "N/A"}
- Context: ${data.contextCreate || "N/A"}
- Constraints: ${data.contextSituation || "N/A"}
- Preference: ${data.toolPreference || "N/A"}

YOUR INSTRUCTIONS:
1. Provide 1 specific software tool as the Primary Recommendation.
2. Provide 2 alternatives.
3. Explain simply why the primary tool fits their specific problem.
4. Give a "Pro Tip" that is actually useful for using that tool. 
5. In "Next Steps," suggest joining the AI Literacy Academy to master the professional application of this tool.`;

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
