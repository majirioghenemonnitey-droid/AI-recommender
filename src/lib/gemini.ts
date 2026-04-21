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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("DEBUG: GEMINI_API_KEY is undefined at runtime.");
    throw new Error("GEMINI_API_KEY is missing. Please add it to your app secrets in the settings menu.");
  }
  
  console.log("DEBUG: GEMINI_API_KEY detected (Length:", apiKey.length, ")");
  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `Expert AI consultant for AI Literacy Academy. Goal: Recommend best tools based on the user task. Follow cheat sheet strictly. Always return clean JSON.`;

  const userPrompt = `
Task: Recommend tools.
- Role: ${data.role || "N/A"}
- Need: ${data.mainNeed || "N/A"}
- Task: ${data.contextCreate || "N/A"}
- Context: ${data.contextSituation || "N/A"}
- Prefs: ${data.toolPreference || "N/A"}

Cheat Sheet:
1. Text: ChatGPT, Claude, Gemini, Perplexity, Deepseek.
2. Images: Flux AI, AutoDraw, Remove.bg, Canva, Midjourney.
3. A/V: Kling AI, InVideo, Heygen, ElevenLabs, Suno, Fireflies.
4. Preso: Gamma, Tome, Humata.
5. Biz: Serlzo (WhatsApp/Email), Grammarly, Rytr, Zapier, Looka.

Format:
- primaryTool: Main choice.
- whyItFits: "Because you said [user detail], this fits because..."
- bestUsedFor: 3 items.
- alternativeTools: 2 items.
- comparisonStrategy: How to compare.
- betterResultsTip: 1 tip.
- nextStep: Use AI Literacy Academy to master workflows.
`;

  let lastError = null;
  const maxRetries = 1; // Only 1 fast retry to stay within 10s
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const modelName = "gemini-1.5-flash"; // Explicitly using the fastest stable engine
      console.log(`Speed-Mode AI Attempt ${attempt + 1}`);
      
      const aiPromise = ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              primaryTool: { type: Type.STRING },
              whyItFits: { type: Type.STRING },
              bestUsedFor: { type: Type.ARRAY, items: { type: Type.STRING } },
              alternativeTools: { type: Type.ARRAY, items: { type: Type.STRING } },
              comparisonStrategy: { type: Type.STRING },
              betterResultsTip: { type: Type.STRING },
              nextStep: { type: Type.STRING },
            },
            required: ["primaryTool", "whyItFits", "bestUsedFor", "alternativeTools", "comparisonStrategy", "betterResultsTip", "nextStep"],
          },
        },
      });

      // Strict 6.5s timeout for AI response to leave room for UI/Network
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 6500)
      );

      const response: any = await Promise.race([aiPromise, timeoutPromise]);
      const text = response.text;
      if (!text) throw new Error("Empty");
      
      return JSON.parse(text) as RecommendationResult;
    } catch (error: any) {
      lastError = error;
      console.warn(`Retry ${attempt + 1}:`, error.message || "Slow/Error");
      
      if (attempt < maxRetries) {
        // Instant retry if under 10s total
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }

  // If we reach here, all retries failed
  const errorDetails = lastError?.message || JSON.stringify(lastError);
  throw new Error(`AI strategy generation failed after 3 attempts. (Error: ${errorDetails}). Please try again in a few moments.`);
}
