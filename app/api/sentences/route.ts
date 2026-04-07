import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(req: NextRequest) {
  const lang = new URL(req.url).searchParams.get("lang") ?? "hindi";
  const langLabel = lang === "tamil" ? "Tamil" : "Hindi";

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Generate exactly 8 unique, useful everyday English phrases for a beginner learning ${langLabel}.
Make them varied — mix of needs, questions, emotions, directions, greetings, and social phrases.
Keep each phrase short (2–6 words). Pick a relevant emoji for each.

IMPORTANT: The "text" field must ALWAYS be in English only. Never use ${langLabel}, any non-Latin script, or romanised ${langLabel} in the text field.

Return ONLY a raw JSON array, no markdown, no explanation:
[{"emoji":"...","text":"..."},...]`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "[]";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    const sentences = JSON.parse(cleaned);
    return NextResponse.json({ sentences });
  } catch {
    return NextResponse.json({ sentences: [] }, { status: 500 });
  }
}
