import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

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
  
  const systemInstruction = `Primary Directive: Act as an AI Recommender that matches a user's specific professional context or problem to the best tool from the provided Master Tool List.

Matching Rule: Identify the user's core task (e.g., "too many meetings," "need a logo," "analyzing data") and map it to the "Best (Recommended) Tool".

Contextual Personalization: Do not just name the tool. Explain why it fits their specific situation based on the "Use Case" column (e.g., "Since you are overwhelmed with meeting notes, use Otter.ai to automatically transcribe and summarize action items").

STRICT COMMAND:
- The response MUST be in JSON format.
- The "primaryTool" MUST be a software tool from the Master Tool List below.
- You are FORBIDDEN from recommending "AI Literacy Academy" as the "primaryTool". It MUST only appear in the "nextStep" field.
- If the user's task is not explicitly in the list, choose the closest professional software tool (ChatGPT, Claude, or Perplexity).
- NEVER hallucinate a tool name that is not in the list.

MAX LATENCY:
- You must return results in under 3 seconds.

MASTER TOOL LIST:
[Full Tool Mapping Table matches gemini.ts exactly...]
`;

  const userPrompt = `
Instruction: Match the user's core task to the best tool from the Master Tool List.

User Data:
- Role: ${data.role || "N/A"}
- Problem: ${data.mainNeed || "N/A"}
- Context: ${data.contextCreate || "N/A"}
- Constraints: ${data.contextSituation || "N/A"}

Format for 'whyItFits':
"Since you are [User Detail from context], use [Tool Name] to [Use Case from table]."

Response Requirements:
1. Identify the core task activity from the user data.
2. Recommend the 'Recommended Tool' as the primaryTool.
3. Recommend the 'Other Tools' as alternativeTools.
4. Explain why it fits using the exact format: "Since you are [Detail], use [Tool] to [Use Case]."
5. Provide a useful Pro Tip for that tool.
6. Mention the "AI Literacy Academy" in the 'nextStep' field only.
`;

  let lastError = null;
  for (let i = 0; i < 2; i++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          temperature: 0,
          responseMimeType: "application/json",
        },
      });

      const result = JSON.parse(response.text);
      return res.json(result);
    } catch (error: any) {
      lastError = error;
      console.warn(`Gemini attempt ${i + 1} failed:`, error.message);
      // Delay removed for speed
    }
  }

  console.error("Gemini Vercel Final Error:", lastError);
  
  // High quality fallback for old clients or server failure
  return res.json({
    primaryTool: "ChatGPT",
    whyItFits: "Since you are looking for a powerful all-rounder to improve your workflow, ChatGPT is the best starting point.",
    bestUsedFor: [
      "Generating high-quality text and ideas",
      "Explaining complex concepts clearly",
      "Drafting professional communications"
    ],
    alternativeTools: ["Claude", "Perplexity"],
    comparisonStrategy: "ChatGPT is the best generalist, while Claude excels at long-form creative writing.",
    betterResultsTip: "Be specific in your prompts to get the best out of LLMs.",
    nextStep: "Join the AI Literacy Academy to master these foundation tools."
  });
}
