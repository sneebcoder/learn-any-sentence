import { NextRequest, NextResponse } from "next/server";

const PROMPTS: Record<string, string> = {
  hindi: "The user is speaking in Hindi or English. Transcribe Hindi in Devanagari script and English words in Latin script as spoken. Do not use Urdu script. For example: 'मुझे food चाहिए', 'मैं office जा रहा हूँ', 'I want water'.",
  tamil: "The user is speaking in Tamil or English. Transcribe Tamil using the Latin alphabet (romanised Tamil) and English words in Latin script as spoken. For example: 'Enakku food vennum', 'Naan office poren', 'I want water'.",
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
