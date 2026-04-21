import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const data = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is missing on the server environment." });
  }

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
  for (let i = 0; i < 2; i++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
        },
      });

      const result = JSON.parse(response.text);
      return res.json(result);
    } catch (error: any) {
      lastError = error;
      console.warn(`Gemini attempt ${i + 1} failed:`, error.message);
      // Wait a bit before retry
      if (i === 0) await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.error("Gemini Vercel Final Error:", lastError);
  res.status(500).json({ error: "The AI service is currently busy. Please try again or check your email for the strategy." });
}
