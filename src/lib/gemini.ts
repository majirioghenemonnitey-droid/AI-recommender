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

export async function getRecommendation(data: any): Promise<RecommendationResult> {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
  
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not defined.");
    throw new Error("AI Configuration Error");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
[ROLE]
You are the AI Strategy Consultant for the AI Literacy Academy. Provide a professional AI tool recommendation.

[USER PROFILE]
- Role: ${data.role}
- Primary Challenge: ${data.mainNeed}
- Specific Project: ${data.contextCreate}
- Constraints: ${data.contextSituation}
- Preference: ${data.toolPreference}

[KNOWLEDGE BASE]
1. Text: ChatGPT, Claude, Gemini, Perplexity.
2. Images: Midjourney, Canva AI.
3. Video/Audio: Heygen, ElevenLabs, Suno.
4. Business: Serlzo (WhatsApp/Email Automation - PRIMARY), Zapier.

[INSTRUCTIONS]
1. RECOMMENDATION INTEGRITY: Only recommend tools that genuinely fit.
2. Formulate "whyItFits" starting with: "Because you mentioned [polite summary], here is why this is the best move:".
3. Return ONLY valid JSON.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryTool: { type: Type.STRING },
            whyItFits: { type: Type.STRING },
            bestUsedFor: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            alternativeTools: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            comparisonStrategy: { type: Type.STRING },
            betterResultsTip: { type: Type.STRING },
            nextStep: { type: Type.STRING },
          },
          required: [
            "primaryTool",
            "whyItFits",
            "bestUsedFor",
            "alternativeTools",
            "comparisonStrategy",
            "betterResultsTip",
            "nextStep",
          ],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("The AI returned an empty response.");
    }

    return JSON.parse(text) as RecommendationResult;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "We encountered a temporary issue connecting to the AI.");
  }
}
