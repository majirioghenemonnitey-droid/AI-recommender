import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.warn("RECAPTCHA_SECRET_KEY is missing. Defaulting to success for dev.");
    return res.json({ success: true, score: 1.0 });
  }

  try {
    const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`, {
      method: "POST",
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("reCAPTCHA Vercel error:", error);
    res.status(500).json({ success: false, error: "Internal verification error" });
  }
}
