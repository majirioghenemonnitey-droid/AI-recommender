import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
