import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini API Logic on Server
  app.post("/api/recommend", async (req, res) => {
    const data = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is missing on the server." });
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
      res.json(result);
    } catch (error: any) {
      console.error("Gemini Server Error:", error);
      res.status(500).json({ error: "Failed to generate recommendation. The AI service is currently busy." });
    }
  });

  // reCAPTCHA v3 verification
  app.post("/api/verify-captcha", async (req, res) => {
    const { token } = req.body;
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
      console.warn("RECAPTCHA_SECRET_KEY is missing. Skipping verification for development.");
      return res.json({ success: true, score: 1.0 });
    }

    try {
      const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`, {
        method: "POST",
      });
      const data = await response.json();
      console.log("reCAPTCHA verification response:", data);
      
      // If validation failed, pass the error codes back to the UI for debugging
      if (!data.success) {
        return res.json({ 
          success: false, 
          error_codes: data['error-codes'],
          message: "Google rejected the token. Likely a key mismatch or expired token."
        });
      }
      
      res.json(data);
    } catch (error) {
      console.error("reCAPTCHA server error:", error);
      res.status(500).json({ success: false, error: "Internal verification error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
