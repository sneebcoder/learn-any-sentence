import { NextRequest, NextResponse } from "next/server";

const PROMPTS: Record<string, string> = {
  hindi: "मुझे food चाहिए. मैं office जा रहा हूँ. I want water. Use Devanagari script for Hindi words and Latin script for English words.",
  tamil: "Enakku food vennum. Naan office poren. I want water. Use romanised Latin script for Tamil words and Latin script for English words.",
};

export async function POST(req: NextRequest) {
  const lang = new URL(req.url).searchParams.get("lang") ?? "hindi";
  const audioBlob = await req.blob();

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-1");
  formData.append("prompt", PROMPTS[lang] ?? PROMPTS.hindi);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    return NextResponse.json({ error: "STT failed" }, { status: 500 });
  }

  const result = await response.json();
  return NextResponse.json({ transcript: result.text ?? "" });
}
