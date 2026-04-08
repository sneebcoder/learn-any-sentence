import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const audioBlob = await req.blob();

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-1");

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
