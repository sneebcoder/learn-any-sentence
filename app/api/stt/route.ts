import { NextRequest, NextResponse } from "next/server";

const PROMPTS: Record<string, string> = {
  hindi: "The user is speaking in Hindi. Transcribe using the Latin alphabet (romanised Hindi), not Devanagari or Urdu script. For example: 'Mujhe khana chahiye', 'Aap kaise hain', 'Main theek hoon'.",
  tamil: "The user is speaking in Tamil. Transcribe using the Latin alphabet (romanised Tamil), not Tamil script. For example: 'Enakku saapadu vennum', 'Neenga eppadi irukkeenga', 'Naan nalla irukken'.",
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
