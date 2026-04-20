import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
