import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

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
  const systemInstruction = `Primary Directive: Act as an AI Recommender that matches a user's specific professional context or problem to the best tool from the provided Master Tool List.

Matching Rule: Identify the user's core task (e.g., "too many meetings," "need a logo," "analyzing data") and map it to the "Best (Recommended) Tool".

Contextual Personalization: Do not just name the tool. Explain why it fits their specific situation based on the "Use Case" column (e.g., "Since you are overwhelmed with meeting notes, use Otter.ai to automatically transcribe and summarize action items").

STRICT COMMAND:
- The "primaryTool" MUST be a software tool from the Master Tool List below.
- You are FORBIDDEN from recommending "AI Literacy Academy" as the "primaryTool". It MUST only appear in the "nextStep" field.
- If the user's task is not explicitly in the list, choose the closest professional software tool (ChatGPT, Claude, or Perplexity).
- NEVER hallucinate a tool name that is not in the list or a globally recognized major AI tool.

MAX LATENCY REQUIREMENT:
- You must reason quickly. Results must be returned in under 3 seconds.

MASTER TOOL LIST:

## **Step 3: Choose Your Tool (Overview)**
### **Text & Ideas (LLMs)**
 * **ChatGPT**: Great all-rounder.
 * **Claude**: Better for long text and creative writing.
 * **Gemini**: Better for long context.
 * **Grok**: Better for X (Twitter) sources.
 * **Perplexity**: Great for research with citations.
### **Images**
 * **ChatGPT**: Good all-rounder.
 * **Gemini (Nano Banana)**: Good for image consistency.
 * **Other options**: FLUX, Recraft, Ideogram, Midjourney, and Perplexity.
### **Presentations & Documents**
 * **Gamma**: Recommended.
 * **Tome**: Good for image consistency.
### **Audio & Video**
 * **Audio**: ElevenLabs and SUNO.
 * **Video**: Hailuo AI, HeyGen, and KlingAI.

## **AI Workplace Tools by Task**
| Task Activity | Recommended Tool | Other Tools | Use Case |
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
| Short Film Videos | Kling AI | Hailuo, Veo, Hedra | Generates short clips from text script. |
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
| Translation (Text) | Google Translate | Microsoft Translator, DeepL | Translates text between multiple languages. |
| Translation (Docs) | DeepL | Google/Microsoft Translator | Professional document translation. |
| Voiceovers | ElevenLabs | Murf AI, WellSaid Labs | Creates realistic Al voiceovers. |
| Al Avatar Videos | HeyGen | Invideo, Synthesia | Generates animated explainer videos. |
| Customer Support | Tawk.to | Tidio, Zendesk | Uses Al agents to resolve queries. |
| Infographics | Visme | Canva, Piktochart | Visualizes data in digestible formats. |
| Resumes | Teal | Resume.io, Canva | Professional formatting and content help. |
| Audio Editing | Lalal.ai | Audacity, Descript | Cleans audio or separates tracks. |
| Music Generation | Suno | Soundraw, AIVA | Creates songs, lyrics, and instrumentals. |
| Complex Explanations | ChatGPT | Google AI Overviews, Perplexity | Simplifies difficult information. |
| Exam/Interview Prep | NotebookLM | Interviewly.ai, Rytr | Generates relevant interview questions. |
| Background Removal | Remove.bg | Canva, Fotor | Automatically removes image backgrounds. |
| Summarizing Docs | Humata | NotebookLM, ChatPDF | Condenses long documents into key points. |
| Meeting Agendas | Fellow.app | Notion, Hugo | Creates structured agendas for focus. |
| Quizzes & Polls | Typeform | ChatGPT | Generates questions and answer options. |
| Website Mockups | Framer | Uizard | Generates websites from text descriptions. |
| Competitor Analysis | Browse AI | Semrush, Ahrefs | Monitors changes on competitor sites. |
| Daily Summaries | TLDR This | SMMRY, Splitter AI | Summarizes news and research reports. |
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
6. Mention the "AI Literacy Academy" in the 'nextStep' field. This field MUST be a personalized bridge.
   Format: "Now that you have [Tool] to solve [User's Problem], join the AI Literacy Academy to learn the high-income workflows that turn this tool into a [Business Outcome based on Context]."`;

  let lastError = null;
  for (let i = 0; i < 2; i++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          temperature: 0,
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
    primaryTool: "ChatGPT",
    whyItFits: "Since you are looking for a versatile way to integrate AI into your workflow, ChatGPT is the best all-around tool to start with.",
    bestUsedFor: [
      "Generating ideas and creative writing",
      "Analyzing complex problems and providing explanations",
      "Automating basic text-based tasks"
    ],
    alternativeTools: ["Claude", "Gemini", "Perplexity"],
    comparisonStrategy: "ChatGPT is the general-purpose leader, while Claude is better for longer text and creative nuances.",
    betterResultsTip: "Use clear, descriptive prompts to get the best responses from LLMs.",
    nextStep: "Join the AI Literacy Academy to master these foundation tools and learn how to turn ChatGPT into a full-scale automated business engine."
  };
}
