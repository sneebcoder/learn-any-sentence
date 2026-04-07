import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const audioBlob = await req.blob();

  const response = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&language=hi-Latn&detect_language=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        "Content-Type": audioBlob.type || "audio/webm",
      },
      body: audioBlob,
    }
  );

  if (!response.ok) {
    return NextResponse.json({ error: "STT failed" }, { status: 500 });
  }

  const result = await response.json();
  const transcript =
    result.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

  return NextResponse.json({ transcript });
}
