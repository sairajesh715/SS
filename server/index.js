import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const isProduction = process.env.NODE_ENV === "production";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Allow all origins (same-origin in production, localhost in dev)
app.use(cors());
app.use(express.json());

// Serve static frontend files in production
if (isProduction) {
  app.use(express.static(path.join(__dirname, "../dist")));
}

const SYSTEM_PROMPT = `You are CosmosAI 🌌, an expert astronomer and planetary scientist assistant inside an interactive 3D solar system explorer. You have encyclopedic knowledge about all planets, their moons, asteroids, and phenomena in our solar system.

Personality: Enthusiastic, knowledgeable, makes complex science accessible with vivid comparisons. Use emojis occasionally to keep it engaging.

Guidelines:
- Keep responses concise (under 200 words) unless asked for detailed info
- Use real numbers and fascinating facts
- Compare to Earth when helpful
- Structure with short paragraphs, not long walls of text
- If asked about a specific planet from the app, reference its data

Key data you know:
• Mercury: nearest to Sun, exosphere only, -180°C to 430°C, 70% iron core, 88-day year
• Venus: hottest (471°C avg), 96.5% CO₂, retrograde rotation, 92x Earth pressure, sulfuric acid clouds
• Earth: only known life, 71% water, nitrogen-oxygen atmosphere, magnetic field
• Mars: red from iron oxide, Olympus Mons (21km high), Valles Marineris canyon (4,000km), 2 moons
• Jupiter: largest (1,300 Earths), Great Red Spot 350+ year storm, 95 moons, Europa has subsurface ocean
• Saturn: least dense (floats on water!), rings span 282,000km but only ~1km thick, 146 moons, Titan has thick atmosphere
• Uranus: tilted 98°, coldest atmosphere (-224°C), ice giant, rotates retrograde
• Neptune: fastest winds (2,100 km/h), 165-year orbit, discovered via math in 1846, Triton orbits backwards`;

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: messages.slice(-20),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Chat error:", error.message);
    const msg =
      error.status === 401
        ? "API key not configured. Set ANTHROPIC_API_KEY in Render environment variables."
        : "Failed to get response. Please try again.";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

// SPA fallback — use middleware (not app.get("*",...)) for Express 5 compatibility
if (isProduction) {
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 CosmosAI server running on port ${PORT}`);
});
