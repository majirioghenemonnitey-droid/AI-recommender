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
- PRIORITY 1: If the user's "Problem" (${data.mainNeed}) matches any string in the "Task Activity (User Selection)" column of the Hardened Mapping below, you MUST recommend that exact tool. This is a NON-NEGOTIABLE command.
- PRIORITY 2: If no exact string match exists, use Deep Reasoning to find the best tool.
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

## **AI Workplace Tools (Hardened Mapping - EXACT STRINGS)**
| Task Activity (User Selection) | Recommended Tool | Other Tools | Use Case |
|---|---|---|---|
| **I'm overwhelmed by customer DMs and repetitive support questions** | Tawk.to | Tidio, Zendesk | Uses Al agents to resolve queries and handle support. |
| **Manual operations and admin tasks are eating up my entire day** | Zapier | Taskade, ClickUp | Connects apps to automate repetitive business tasks. |
| **I need a system to automatically generate and follow up with leads** | Serlzo | Zapier, HubSpot AI | AI-powered sales and marketing automation for WhatsApp and Email. |
| **I struggle to consistently create marketing content that actually sells** | Rytr | ChatGPT, Wordtune | Creates social media captions and descriptions. |
| **I need to analyze my business data but don't have the time or skills** | Rows AI | Numerous.ai, Julius AI | Imports and analyzes business spreadsheet data. |
| **I spend half my day in meetings and writing follow-up notes** | Otter.ai | Fireflies.ai, Fathom | Transcribes meetings and generates action items. |
| **My inbox is overflowing and drafting professional emails takes too long** | Gemini | Grammarly, Rytr, ChatGPT | Suggests personalized, relevant replies. |
| **I waste hours building slide decks and formatting reports** | Gamma | Tome, Canva, Beautiful.ai | Generates entire slides with visuals. |
| **I'm stuck doing manual data entry and spreadsheet analysis** | Rows AI | Microsoft Copilot, Julius AI | Imports and analyzes spreadsheet data. |
| **I have to read massive documents and need to summarize them instantly** | Humata | NotebookLM, ChatPDF | Condenses long documents into key points. |
| **Writing custom proposals and pitching clients takes up my billable hours** | Claude | ChatGPT, Qwen | Generates high-quality articles and creative writing. |
| **Managing client communication and project updates is exhausting** | Fellow.app | Hive, Taskade | automates structured project updates and streamlines client communication. |
| **I'm bogged down by contracts, invoicing, and back-office admin** | Hive | Taskade, ClickUp | Generates plans and manages business overhead. |
| **I need to speed up my actual client work without dropping quality** | ChatGPT | Claude, Deepseek | Uses advanced reasoning to accelerate production workflows. |
| **I don't have time to market myself to get a steady stream of new clients** | Serlzo | HubSpot AI, Copy.ai | Automates lead outreach and marketing updates. |
| **I constantly run out of fresh ideas and scripts for my content** | Deepseek | ChatGPT, Gemini | Generates topics or solutions from prompts. |
| **Editing videos, audio, or photos takes me way too long** | InVideo | HeyGen, Murf AI | Turns scripts into promotional videos. |
| **Writing engaging captions, blogs, or product descriptions is a struggle** | Rytr | Copy.ai, Jasper | Creates social media captions and descriptions. |
| **I need to turn one piece of content into dozens of posts automatically** | Zapier | Repurpose.io | Connects apps to automate content distribution. |
| **I can't keep up with replying to comments and engaging with my audience** | Tawk.to | Tidio, Reply.io | Uses Al agents to automate relationship building. |
| **I want to save 2+ hours every day by automating my manual tasks** | Zapier | Reclaim.ai | Connects apps to automate repetitive business tasks. |
| **Brainstorming** | Deepseek | ChatGPT, Claude | Generates topics or solutions from prompts. |
| **Research** | Perplexity | ChatGPT, Stanford Storm | Provides concise summaries of papers. |
| **Meeting Agendas** | Fellow.app | Notion, Hugo | Creates structured agendas for focus. |
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
