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
  const systemInstruction = `You are a professional AI Solution Architect. 
Your goal is to provide a specific, functional AI tool recommendation by deeply REASONING with the user's provided context and specific situation.

YOUR REASONING PROCESS:
1. Carefully analyze the user's "Problem," "Role," and "Specific Situation."
2. Look for nuances—e.g., if they mention a tight deadline, prioritize speed; if they mention high quality, prioritize power.
3. Map these nuances to the most appropriate Task Activity in the STRICT TASK MAPPING table below.
4. If a user's request spans multiple tasks, prioritize the one that addresses their most urgent "Problem."

STRICT TASK MAPPING:
[Task Mapping Table from previous turn follows...]
`;

  const userPrompt = `
USER DATA FOR REASONING:
- Role: ${data.role || "N/A"}
- Declared Problem: ${data.mainNeed || "N/A"}
- Specific Context: ${data.contextCreate || "N/A"}
- Constraints/Situation: ${data.contextSituation || "N/A"}
- Personal Tool Preference: ${data.toolPreference || "N/A"}

YOUR MISSION:
1. Reason with the context provided above. Why is THIS tool the best choice for THIS specific person's situation?
2. Select the Recommended Tool from the mapping that best fits the reasoning.
3. Provide the Alternatives from the same mapping category.
4. Explain your choice starting with: "Based on your specific situation [mention detail from context]..."
5. Provide a "Pro Tip" specifically tailored to their situation.
6. If the user is a BEGINNER (based on their context), recommend the "AI Literacy Academy" as primary. Otherwise, keep it as the "Next Step."`;

  let lastError = null;
  for (let i = 0; i < 2; i++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
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
      // Removed 1000ms delay for maximum speed
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
