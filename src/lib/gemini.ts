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

SOURCE ADHERENCE:
- FOLLOW THIS SOURCE LIKE MAD.
- BE HONEST AND REAL.
- BE METICULOUS about your selection.

INTENT-TO-OUTPUT MAPPING RULE:
1. Identify the user's primary INTENT based on their exact words (e.g., "Ideas" vs "Text", "Plan" vs "Execute").
2. Match that intent to the corresponding CATEGORY in the Master Tool List.
3. IDEAS/BRAINSTORMING INTENT: If they need ideas, topics, or solutions, recommend the tools from the "Brainstorming" task row. While Deepseek is the primary recommendation, **Claude** and **ChatGPT** are also powerful for ideas. You MUST explain the tool's value in terms of "Generating Ideas" if that is what the user asked for.
4. WRITING/TEXT CONTENT INTENT: If they need articles, social media posts, or creative writing, recommend **Claude** or **Rytr**.
5. VISUALS/GRAPHICS INTENT: Select from the "Images" group.
6. Clinical Precision: Every word of the customer's request must map to your decision. If they ask for ideas, give them an idea tool. If they ask for writing, give them a writing tool.

Matching Rule: Identify the user's core task (e.g., "too many meetings," "need a logo," "analyzing data") and map it to the "Best (Recommended) Tool".

STRICT COMMAND:
- PRIORITY 1: If the user's task matches one of the "Task Activity" descriptions in the Master Tool List below, you MUST select that exact "Recommended Tool".
- PRIORITY 2 (Deep Reasoning Fallback): If the specialized list below does NOT have a perfect match for the user's context, you MUST REASON DEEPLY to identify the best possible AI tool from your global knowledge. In this case, you are allowed to recommend any high-quality, verified AI software tool that solves the problem perfectly.
- You are FORBIDDEN from recommending a general LLM (ChatGPT, Claude, Gemini) as a simple fallback if a more specialized tool exists for the task.
- Explain your reasoning meticulously, showing how you arrived at the recommendation based on every word of the user's request.
- NEVER hallucinate a tool name. Every tool must be a real, accessible software product.

MAX LATENCY REQUIREMENT:
- Results must be returned in under 3 seconds.

MASTER TOOL LIST:

## **Step 3: Choose Your Tool (Overview)**
### **Text & Ideas**
 * **Deepseek**: Best for Brainstorming & Ideas.
 * **Claude**: Best for long text and creative writing.
 * **Gemini**: Better for Google Workspace integration.
### **Images**
 * **Flux AI**: Best for high-quality images.
 * **Canva AI**: Best for graphic design.
### **Business & Productivity**
 * **Serlzo**: AI-powered WhatsApp & Email Automation.
 * **Fellow.app**: Best for Client Communication & Project Updates.
 * **Zapier**: Best for Workflow Automation.

## **AI Workplace Tools (Hardened Mapping)**
| Task Activity | Recommended Tool | Other Tools | Use Case |
|---|---|---|---|
| **Meeting Summaries** | Otter.ai | Fireflies.ai, Fathom | Transcribes meetings and generates action items. |
| **Grammar & Spelling** | Grammarly | ProWritingAid, Wordtune | Ensures professional, error-free documents. |
| **Marketing Copy** | Rytr | ChatGPT, Wordtune | Creates social media captions and descriptions. |
| **Scheduling** | Reclaim.ai | Google Calendar, Motion | Analyzes calendars to find optimal meeting slots. |
| **Project Plans** | Hive | Taskade, ClickUp | Generates plans based on a project brief. |
| **Graphic Design** | Canva AI | Adobe Firefly, Microsoft Designer | Creates visual graphics using templates. |
| **Images from Text** | Flux AI | Bing Image Creator, ChatGPT | Creates visually appealing AI images. |
| **Workflow Automation** | Zapier | Taskade, ClickUp | Connects apps to automate repetitive business tasks. |
| **Presentation Skills** | Poised | Yoodli | Real-time feedback on speaking clarity. |
| **Brainstorming** | Deepseek | ChatGPT, Claude, Gemini | Generates topics or solutions from prompts. |
| **Rewriting Text** | Wordtune | Grammarly, ProWritingAid | Rephrases sentences for better clarity. |
| **Mind Maps** | Taskade | ClickUp, Notion | Visualizes ideas and project structures. |
| **Short Film Videos** | Kling AI | Hailuo, Veo, Hedra | Generates short clips from text prompts. |
| **Video from Text** | InVideo | Lumen5, Synthesia, Pictory | Turns scripts into promotional videos. |
| **Logo Creation** | Looka | Designs.ai, Canva | Generates logos based on business name. |
| **Blog Outlines** | HubSpot AI | ChatGPT, Copy.ai | Creates structured outlines for writers. |
| **Creating Presentations** | Gamma | Tome, Canva, Beautiful.ai | Generates entire slides with visuals. |
| **Transcribing Audio** | Fireflies.ai | Otter.ai, Descript | Converts recordings into searchable text. |
| **Website Trends** | Google Trends | Semrush | Identifies trending search terms/topics. |
| **Email Management** | Gemini | Grammarly, Rytr, ChatGPT | Suggests personalized, relevant replies. |
| **WhatsApp & Email Marketing** | Serlzo | Zapier, HubSpot AI | AI-powered sales and marketing automation for WhatsApp and Email. |
| **Images from Drawings** | AutoDraw | Bing Image Creator, Canva | Transforms sketches into polished icons. |
| **Data Extraction** | Numerous.ai | ChatGPT, Cloud Natural Language | Extracts and categorizes data from text. |
| **Spreadsheet Analysis** | Rows AI | Microsoft Copilot, Julius AI | Imports and analyzes spreadsheet data. |
| **Research** | Perplexity | ChatGPT, Stanford Storm | Provides concise summaries of papers. |
| **Text Content** | Claude | ChatGPT, Qwen | Generates articles and social media posts. |
| **Translation (Text)** | Google Translate | Microsoft Translator, DeepL | Translates text between multiple languages. |
| **Translation (Docs)** | DeepL | Google/Microsoft Translator | Professional document translation. |
| **Voiceovers** | ElevenLabs | Murf AI, WellSaid Labs | Creates realistic Al voiceovers. |
| **Al Avatar Videos** | HeyGen | Invideo, Synthesia | Generates animated explainer videos. |
| **Customer Support** | Tawk.to | Tidio, Zendesk | Uses Al agents to resolve queries. |
| **Infographics** | Visme | Canva, Piktochart | Visualizes data in digestible formats. |
| **Resumes** | Teal | Resume.io, Canva | Professional formatting and content help. |
| **Audio Editing** | Lalal.ai | Audacity, Descript | Cleans audio or separates tracks. |
| **Music Generation** | Suno | Soundraw, AIVA | Creates songs, lyrics, and instrumentals. |
| **Complex Explanations** | ChatGPT | Google AI Overviews, Perplexity | Simplifies difficult information. |
| **Exam/Interview Prep** | NotebookLM | Interviewly.ai, Rytr | Generates relevant interview questions. |
| **Background Removal** | Remove.bg | Canva, Fotor | Automatically removes image backgrounds. |
| **Summarizing Docs** | Humata | NotebookLM, ChatPDF | Condenses long documents into key points. |
| **Client Updates & Comm.** | Fellow.app | Hive, Taskade | automates structured project updates and streamlines client communication. |
| **Meeting Agendas** | Fellow.app | Notion, Hugo | Creates structured agendas for focus. |
| **Quizzes & Polls** | Typeform | ChatGPT | Generates questions and answer options. |
| **Website Mockups** | Framer | Uizard | Generates websites from text descriptions. |
| **Competitor Analysis** | Browse AI | Semrush, Ahrefs | Monitors changes on competitor sites. |
| **Daily Summaries** | TLDR This | SMMRY, Splitter AI | Summarizes news and research reports. |
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
        model: "gemini-1.5-flash",
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0,
          responseMimeType: "application/json",
        },
      });

      return JSON.parse(response.text || "{}");
    } catch (error: any) {
      lastError = error;
      console.warn(`Gemini attempt ${i + 1} failed:`, error.message);
    }
  }

  console.error("Gemini Final Error:", lastError);
  
  // INTELLIGENT FALLBACK: If the AI call fails after retries, we use a reliable LLM as a safety net.
  return {
    primaryTool: "ChatGPT",
    whyItFits: "Since we encountered a technical interruption while finding your perfect match, we recommend starting with ChatGPT—the world's most versatile all-rounder—to tackle your specific challenge immediately.",
    bestUsedFor: [
      "Quick brainstorming and idea generation",
      "Drafting professional content and emails",
      "Analyzing complex problems with deep reasoning"
    ],
    alternativeTools: ["Claude", "Perplexity"],
    comparisonStrategy: "ChatGPT is the industry standard for general reasoning, while specialized tools (when available) offer more integrated professional workflows.",
    betterResultsTip: "Ask the AI to 'act as an expert' in your specific field for much higher quality results.",
    nextStep: "Join the AI Literacy Academy to master foundational LLMs and discover the deep reasoning workflows that turn these tools into business engines."
  };
}
