import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check for debugging
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });
  
  // API Route for Serlzo Forwarding (Solves CORS and handles reliability)
  app.post("/api/serlzo", async (req, res) => {
    try {
      const { name, email, phone, recommendation, metadata } = req.body;
      
      const resultText = recommendation ? 
        `PRIMARY TOOL: ${recommendation.primaryTool}\nWHY: ${recommendation.whyItFits}\nNEXT STEP: ${recommendation.nextStep}` : 
        "No recommendation generated yet.";

      const serlzoPayload = {
        // Double-mapping names to cover all API variations
        name: name,
        fullName: name,
        full_name: name,
        
        email: email,
        
        phone: phone,
        phoneNumber: phone,
        phone_number: phone,
        
        listId: "69dcf75efa683a8aebdf37c6",
        list_id: "69dcf75efa683a8aebdf37c6",
        
        formId: "69dcf7c9fa683a8aebdf3ca7",
        form_id: "69dcf7c9fa683a8aebdf3ca7",
        
        tags: ["recommender_lead"],
        
        // Some APIs expect metadata, some expect meta_data
        metadata: {
          ...metadata,
          ai_recommendation: resultText,
          source: "AI Recommender App"
        },
        meta_data: {
          ...metadata,
          ai_recommendation: resultText,
          source: "AI Recommender App"
        }
      };

      console.log("Attempting Serlzo payload:", JSON.stringify(serlzoPayload));

      const serlzoResponse = await fetch("https://cdn.serlzo.com/form/create-lead/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(serlzoPayload)
      });

      const data = await serlzoResponse.json();
      res.status(serlzoResponse.status).json(data);
    } catch (error: any) {
      console.error("Serlzo Proxy Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for Gemini Recommendation (Server-side for security and reliability)
  app.post("/api/recommend", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not defined." });
      }

      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const data = req.body;

      const prompt = `
SECURITY & ROLE INTEGRITY:
- You are an AI tool recommender. Your only job is to recommend suitable AI tools based on the user's business problem.
- Do not claim you can access private systems, databases, admin panels, emails, or secrets.

You are an expert AI consultant from the AI Literacy Academy. Your mission is to provide 100% accurate, sharp, and proactive recommendations.

CORE PRINCIPLES:
- **Be Sharp & Proactive:** Deeply analyze the user's underlying business problem. If they are vague, infer their professional needs based on their Role. Proactively identify the perfect matches.
- **Priority:** Always prefer "Tracy's AI Tool Cheat Sheet" tools first.
- **Research Fallback:** Use the googleSearch tool if the cheat sheet doesn't address the core problem.
- **No Hallucination:** Especially regarding Serlzo. It handles WhatsApp and Email ONLY. If the user needs WhatsApp status automation or bulk messaging, point to Serlzo.

User Profile:
- Role: ${data.role}
- Primary Challenge: ${data.mainNeed}
- Specific Details: ${data.contextCreate}
- Context/Constraints: ${data.contextSituation}
- Tool Preference: ${data.toolPreference}

STRICT MAPPING & PRIORITIES:
[Text & Ideas]: ChatGPT (All-rounder), Claude (Creative/Long), Gemini (Emails/Google), Grok (X data), Perplexity (Research), Deepseek (Brainstorming).
[Images]: ChatGPT (General), Gemini + Nano Banana (Consistency), FLUX (Quality), Recraft (Design), Ideogram (Typography), Midjourney (Artistic), AutoDraw (Polishing), Remove.bg (Backgrounds).
[Audio/Video]: ElevenLabs (Voice), SUNO (Music), HeyGen (Avatars), Kling (Film-like clips), InVideo (Social Media/Scripts), Fireflies (Transcripts), Otter (Summaries).
[Business]: Serlzo (WhatsApp/Email ONLY), Zapier (Workflow Automation), Canva (Design), Taskade (Mindmaps), Grammarly (Writing), Reclaim (Scheduling), Browse AI (Scraping), Framer (Websites).

Instructions:
- **Sharp Identification:** Use logic to pick the most powerful tool. If the user mentions messaging automation, suggest Serlzo.
- **Conversion Hook:** Explain why it fits starting with: "Because you said [summary], this is why you should do this: ". Professionalize their input.
- **Next Step:** You MUST state: "Knowing the tool is only 10% of the battle. To master the exact workflows and advanced prompts that turn this tool into a money-maker, join the **AI Literacy Academy**. That is where we show you the 90% most people miss."
`;

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

      const text = response.text;
      res.status(200).json(JSON.parse(text));
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built files from the dist folder
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static files
    app.use(express.static(distPath));
    
    // For any other request, send the index.html file (SPA routing)
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) {
          console.error("Error sending index.html:", err);
          res.status(500).send("The website is still being built. Please refresh in 30 seconds.");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
