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
  const maxRetries = 3; // Increased retries
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Using the recommended stable model for text tasks
      const modelName = "gemini-3-flash-preview"; 
      console.log(`AI Attempt ${attempt + 1} with model: ${modelName}`);
      
      // Adding a timeout signal to prevent long hangs (30 seconds per attempt)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const response = await ai.models.generateContent({
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

      clearTimeout(timeoutId);
      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      
      return JSON.parse(text) as RecommendationResult;
    } catch (error: any) {
      lastError = error;
      const isTransient = error.message?.includes("503") || 
                          error.message?.includes("500") || 
                          error.code === 503 || 
                          error.code === 500 || 
                          String(error).includes("high demand") ||
                          String(error).includes("Internal Server Error");
      
      console.error(`Gemini API Error (Attempt ${attempt + 1}):`, error);
      
      if (error.message?.includes("leaked") || String(error).includes("leaked")) {
        throw new Error("SECURITY_ALERT: Your Gemini API Key has been reported as leaked by Google. Please generate a NEW key and update your Secrets.");
      }
      
      if (attempt < maxRetries) {
        // Shorter wait for server-side errors to keep it snappy
        const delay = isTransient ? 2000 * (attempt + 1) : 1000 * (attempt + 1);
        console.log(`Server error or busy. Waiting ${delay}ms before retry ${attempt + 2}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If we reach here, all retries failed
  const errorDetails = lastError?.message || JSON.stringify(lastError);
  throw new Error(`AI strategy generation failed after 3 attempts. (Error: ${errorDetails}). Please try again in a few moments.`);
}
