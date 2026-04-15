import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Gemini Recommendation
  app.post("/api/recommend", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not defined on the server." });
      }

      const ai = new GoogleGenAI({ apiKey });
      const data = req.body;
      
      const prompt = `
You are an expert AI consultant representing the AI Literacy Academy. Recommend the best AI tools for this user based STRICTLY on the AI Literacy Academy curriculum and tool cheat sheet provided below. DO NOT use generic knowledge unless the user's problem is completely outside these bounds.

User Profile:
- Role: ${data.role}
- Primary Challenge: ${data.mainNeed}
- Specific Details: ${data.contextCreate}
- Context/Constraints: ${data.contextSituation}
- Tool Preference: ${data.toolPreference}

STRICT MAPPING & PRIORITIES (FROM AI LITERACY ACADEMY CHEAT SHEET & SLIDES):
You MUST use the following as your FIRST CHOICE response. Only in extreme or odd cases where the user's request is completely outside these bounds should you research using your general knowledge.

**1. Text & Ideas (LLMs):**
- ChatGPT: Great all-rounder, Explanations of Complex Topics.
- Claude: Better for long text, creative writing, and creating text content.
- Gemini: Better for long context, creating and responding to emails.
- Grok: Better for X (Twitter) sources.
- Perplexity: Great for research with citations, conducting research.
- Deepseek: Brainstorming Ideas.

**2. Images:**
- ChatGPT: Good all-rounder for images.
- Gemini + Nano Banana: Good for image consistency.
- Flux AI: Generating Images from text.
- AutoDraw: Generating Images from Drawings.
- Remove.bg: Removing Image Backgrounds.
- Other approved image tools: Recraft, Ideogram, Midjourney, Canva AI.

**3. Audio and Video:**
- Kling AI: Generating Short Film-like Videos from Text or image.
- InVideo: Creating Video Content from Text.
- Heygen: Creating Videos with an AI avatar.
- ElevenLabs: Generating Voiceovers.
- Suno: Generating Music for Videos.
- Lalal.ai: Editing Audio Tracks.
- Fireflies.ai: Transcribing Audio Files.
- Otter.ai: Generating summaries of meetings.
- Other approved audio/video tools: Hailuo AI.

**4. Presentations & Documents:**
- Gamma: Recommended for creating presentations.
- Tome: Good for image consistency in presentations.
- Humata: Summarizing Documents.

**5. Specific Business & Productivity Tasks:**
- WhatsApp Marketing & Email Automation: Serlzo (Primary)
- Grammar and Spelling: Grammarly
- Marketing Copy: Rytr
- Scheduling Meetings: Reclaim.ai
- Project Plans: Hive
- Social Media Graphic Design: Canva AI
- Automating Workflows: Zapier
- Improving Presentation Skills: Poised
- Rewriting Text for Clarity: Wordtune
- Creating Mind Maps: Taskade
- Creating Logos: Looka
- Blog Post Outlines: HubSpot AI Content Writer
- Analyzing Website Traffic Trends: Google Trends
- Extracting Data from Text: Numerous.ai
- Analyzing Data in Spreadsheets: Rows AI
- Translating Text: Google translate
- Translating Documents: DeepL
- Customer Support: Tawk.to
- Creating Infographics: Visme
- Generating Resumes: Teal
- Preparing for Exams and Job Interviews: NotebookLM
- Generating Meeting Agendas: Fellow.app
- Creating Quizzes and Polls: Typeform
- Creating Website Mockups: Framer
- Analyzing Competitor Websites: Browse AI
- Automating Daily Summaries: TLDR This

Instructions:
1. Pick 1 Primary and 1-2 Alternatives strictly from the mapping above based on their specific challenge.
2. Explain exactly why the primary tool fits their specific role and task. Start this section with a personalized phrase like "Because you said [specific detail from user input], this is why you should do this..." to make it feel tailored to them. Keep it concise. DO NOT use phrases like "according to the AI Literacy Academy curriculum". Speak directly as an expert.
3. List 3 specific use cases for their daily workflow.
4. Provide a "comparisonStrategy": Explain that they should take their best prompt, run it in both the primary tool and the alternative tools, and compare the outputs to see which one gives the best response for their specific style.
5. Give 1 pro tip.
6. For the "nextStep", explicitly state that knowing the tool is only the beginning, and they need the AI Literacy Academy to master the actual workflows and strategies.
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
        throw new Error("No response from AI");
      }

      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
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
