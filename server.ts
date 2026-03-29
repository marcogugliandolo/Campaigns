import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import cookieSession from "cookie-session";
import "dotenv/config";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(
    cookieSession({
      name: "session",
      keys: ["diego-meta-secret-key"],
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: true,
      sameSite: "none",
    })
  );

  // --- Meta Ads OAuth Routes ---

  app.get("/api/auth/meta/url", (req, res) => {
    const clientId = process.env.META_CLIENT_ID;
    const redirectUri = process.env.META_REDIRECT_URI || `${req.protocol}://${req.get("host")}/auth/meta/callback`;
    
    if (!clientId) {
      return res.status(500).json({ error: "META_CLIENT_ID not configured" });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "ads_read,ads_management,public_profile",
      response_type: "code",
    });

    const authUrl = `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`;
    res.json({ url: authUrl });
  });

  app.get("/auth/meta/callback", async (req, res) => {
    const { code } = req.query;
    const clientId = process.env.META_CLIENT_ID;
    const clientSecret = process.env.META_CLIENT_SECRET;
    const redirectUri = process.env.META_REDIRECT_URI || `${req.protocol}://${req.get("host")}/auth/meta/callback`;

    if (!code || !clientId || !clientSecret) {
      return res.status(400).send("Missing code or configuration");
    }

    try {
      const response = await axios.get("https://graph.facebook.com/v22.0/oauth/access_token", {
        params: {
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code,
        },
      });

      const { access_token } = response.data;
      if (req.session) {
        req.session.meta_token = access_token;
      }

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'META_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Conexión con Meta exitosa. Esta ventana se cerrará automáticamente.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Meta OAuth Error:", error.response?.data || error.message);
      res.status(500).send("Error al autenticar con Meta");
    }
  });

  app.get("/api/meta/campaigns", async (req, res) => {
    const token = req.session?.meta_token;
    if (!token) {
      return res.status(401).json({ error: "Not connected to Meta" });
    }

    try {
      // 1. Get Ad Accounts
      const accountsRes = await axios.get("https://graph.facebook.com/v22.0/me/adaccounts", {
        params: { access_token: token, fields: "name,id" },
      });

      const accounts = accountsRes.data.data;
      if (!accounts || accounts.length === 0) {
        return res.json({ campaigns: [] });
      }

      // 2. Get Campaigns for the first account (for simplicity in this demo)
      const accountId = accounts[0].id;
      const campaignsRes = await axios.get(`https://graph.facebook.com/v22.0/${accountId}/campaigns`, {
        params: {
          access_token: token,
          fields: "name,id,daily_budget,spend,insights{actions,spend}",
          limit: 10,
        },
      });

      const rawCampaigns = campaignsRes.data.data;
      const formattedCampaigns = rawCampaigns.map((c: any) => {
        const insights = c.insights?.data?.[0] || {};
        const spend = Number(c.spend) || Number(insights.spend) || 0;
        const coupons = insights.actions?.find((a: any) => a.action_type === "offsite_conversion.fb_pixel_custom_event")?.value || 0;
        const cpa = coupons > 0 ? spend / coupons : 0;

        return {
          id: c.id,
          name: c.name,
          daily_budget: Number(c.daily_budget) / 100 || 0, // Meta budgets are often in cents
          spend: spend,
          coupons: Number(coupons),
          cpa: cpa,
        };
      });

      res.json({ campaigns: formattedCampaigns });
    } catch (error: any) {
      console.error("Meta API Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Error al obtener datos de Meta" });
    }
  });

  app.post("/api/meta/analyze", async (req, res) => {
    const { campaigns, targetBudget, targetCoupons } = req.body;

    // Mock CRM Data for analysis
    const crmData = {
      conversionRateByCampaign: campaigns.map((c: any) => ({
        campaignId: c.id,
        crmConversionRate: (Math.random() * 0.15 + 0.05).toFixed(4), // 5% to 20%
        customerLifetimeValue: Math.floor(Math.random() * 500 + 100),
      })),
      topPerformingSegments: ["Hombres 25-34", "Intereses: Tecnología", "Madrid/Barcelona"],
    };

    try {
      const prompt = `
        Eres un experto en Meta Ads y CRM. Analiza los siguientes datos de campañas y CRM para generar sugerencias inteligentes.
        
        OBJETIVO DIARIO: ${targetCoupons} cupones con un presupuesto de ${targetBudget}€.
        
        CAMPAÑAS ACTUALES:
        ${JSON.stringify(campaigns, null, 2)}
        
        DATOS CRM (Conversión real a venta):
        ${JSON.stringify(crmData, null, 2)}
        
        Genera una lista de sugerencias para cada campaña. Cada sugerencia debe incluir:
        1. Nuevo presupuesto recomendado (ajustado al total de ${targetBudget}€).
        2. Ajuste de puja (ej: "Aumentar 10%", "Mantener", "Bajar 5%").
        3. Consejo de segmentación basado en los datos.
        4. Probabilidad de alcanzar el objetivo individual (0-1).
        5. Razonamiento breve.
        
        Responde estrictamente en formato JSON siguiendo este esquema:
        {
          "suggestions": [
            {
              "campaignId": "string",
              "recommendedBudget": number,
              "projectedCoupons": number,
              "bidAdjustment": "string",
              "segmentationAdvice": "string",
              "probability": number,
              "reasoning": "string"
            }
          ]
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    campaignId: { type: Type.STRING },
                    recommendedBudget: { type: Type.NUMBER },
                    projectedCoupons: { type: Type.NUMBER },
                    bidAdjustment: { type: Type.STRING },
                    segmentationAdvice: { type: Type.STRING },
                    probability: { type: Type.NUMBER },
                    reasoning: { type: Type.STRING }
                  },
                  required: ["campaignId", "recommendedBudget", "projectedCoupons", "bidAdjustment", "segmentationAdvice", "probability", "reasoning"]
                }
              }
            }
          }
        }
      });

      const result = JSON.parse(response.text);
      res.json(result);
    } catch (error: any) {
      console.error("Gemini Analysis Error:", error);
      res.status(500).json({ error: "Error al analizar con IA" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session = null;
    res.json({ success: true });
  });

  // --- Vite Middleware ---

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
