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
Your goal is to provide a specific, functional AI tool recommendation based EXCLUSIVELY on the following Task Mapping.

STRICT TASK MAPPING:
| Task Activity | Recommended Tool | Other Tools (Alternatives) | Use Case |
|---|---|---|---|
| Meeting Summaries | Otter.ai | Fireflies.ai, Fathom | Transcribes meetings and generates action items. |
| Grammar & Spelling | Grammarly | ProWritingAid, Wordtune | Ensures professional, error-free documents. |
| Marketing Copy | Rytr | ChatGPT, Wordtune | Creates social media captions and descriptions. |
| Scheduling | Reclaim.ai | Google Calendar, Motion | Analyzes calendars to find optimal slots. |
| Project Plans | Hive | Taskade, ClickUp | Generates plans based on a project brief. |
| Graphic Design | Canva AI | Adobe Firefly, Microsoft Designer | Creates visual graphics using templates. |
| Images from Text | Flux AI | Bing Image Creator, ChatGPT | Creates visually appealing AI images. |
| Workflow Automation | Zapier | Taskade, ClickUp | Connects apps to automate repetitive tasks. |
| Presentation Skills | Poised | Yoodli | Real-time feedback on speaking clarity. |
| Brainstorming | Deepseek | ChatGPT, Claude, Gemini | Generates topics or solutions from prompts. |
| Rewriting Text | Wordtune | Grammarly, ProWritingAid | Rephrases sentences for better clarity. |
| Mind Maps | Taskade | ClickUp, Notion | Visualizes ideas and project structures. |
| Short Film Videos | Kling AI | Hailuo, Veo, Hedra | Generates short clips from text scripts. |
| Video from Text | InVideo | Lumen5, Synthesia, Pictory | Turns scripts into promotional videos. |
| Logo Creation | Looka | Designs.ai, Canva | Generates logos based on business name. |
| Blog Outlines | HubSpot AI | ChatGPT, Copy.ai | Creates structured outlines for writers. |
| Creating Presentations | Gamma | Tome, Canva, Beautiful.ai | Generates entire slides with visuals. |
| Transcribing Audio | Fireflies.ai | Otter.ai, Descript | Converts recordings into searchable text. |
| Website Trends | Google Trends | Semrush | Identifies trending search terms/topics. |
| Email Management | Gemini | Grammarly, Rytr, ChatGPT | Suggests personalized, relevant replies. |
| Images from Drawings | AutoDraw | Bing Image Creator, Canva | Transforms sketches into polished icons. |
| Data Extraction | Numerous.ai | ChatGPT, Cloud Natural Language | Extracts and categorizes data from text. |
| Spreadsheet Analysis | Rows AI | Microsoft Copilot, Julius AI | Imports and analyzes spreadsheet data. |
| Research | Perplexity | ChatGPT, Stanford Storm | Provides concise summaries of papers. |
| Text Content | Claude | ChatGPT, Qwen | Generates articles and social media posts. |
| Voiceovers | ElevenLabs | Murf AI, WellSaid Labs | Creates realistic AI voiceovers. |
| Al Avatar Videos | HeyGen | Invideo, Synthesia | Generates animated explainer videos. |
| Customer Support | Tawk.to | Tidio, Zendesk | Uses AI agents to resolve queries. |
| Infographics | Visme | Canva, Piktochart | Visualizes data in digestible formats. |
| Resumes | Teal | Resume.io, Canva | Professional formatting and content help. |
| Audio Editing | Lalal.ai | Audacity, Descript | Cleans audio or separates tracks. |
| Music Generation | Suno | Soundraw, AIVA | Creates songs, lyrics, and instrumentals. |
| Complex Explanations | ChatGPT | Google AI Overviews, Perplexity | Simplifies difficult information. |
| Exam/Interview Prep | NotebookLM | Interviewly.ai, Rytr | Generates relevant interview questions. |
| Background Removal | Remove.bg | Canva, Fotor | Automatically removes backgrounds. |
| Summarizing Docs | Humata | NotebookLM, ChatPDF | Condenses long docs into key points. |
| Meeting Agendas | Fellow.app | Notion, Hugo | Creates structured agendas for focus. |
| Quizzes & Polls | Typeform | ChatGPT | Generates questions and answer options. |
| Website Mockups | Framer | Uizard | Generates websites from text. |
| Competitor Analysis | Browse AI | Semrush, Ahrefs | Monitors changes on competitor sites. |
| Daily Summaries | TLDR This | SMMRY, Splitter AI | Summarizes news and research reports. |

STRICT RULES:
1. Identify the user's Task Activity from their prompt.
2. Recommend the 'Recommended Tool' as the Primary.
3. Recommend the 'Other Tools' as Alternatives.
4. Use the provided 'Use Case' to explain why it fits.
5. If the user is a BEGINNER or just CURIOUS, recommend the "AI Literacy Academy" as the primary solution. For others, keep it as the "Next Step."
6. Do NOT hallucinate tools not on this list unless the task is completely absent from the table.`;

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
