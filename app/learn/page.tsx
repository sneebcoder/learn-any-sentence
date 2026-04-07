"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TextBlock = { type: "text"; content: string; step: number; isUser?: boolean };
type PhraseCardBlock = { type: "phrase_card"; english: string; romanization: string; hindi: string; followup: string; step: number };
type MCQBlock = { type: "mcq"; question: string; options: string[]; correct: string; step: number; answered?: string };
type JumbleBlock = { type: "jumble"; instruction: string; words: string[]; correct: string; step: number; submitted?: boolean; userAnswer?: string };
type SubstitutionBlock = { type: "substitution"; intro: string; swapWord: string; rows: { english: string; romanization: string; hindi: string }[]; outro: string; step: number };
type TypingBlock = { type: "typing" };

type Block = TextBlock | PhraseCardBlock | MCQBlock | JumbleBlock | SubstitutionBlock | TypingBlock;

type ApiMessage = { role: "user" | "assistant"; content: string };

// ─── Audio helpers ─────────────────────────────────────────────────────────────

async function speakText(text: string): Promise<HTMLAudioElement | null> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
    return audio;
  } catch {
    return null;
  }
}

function extractSpeakableText(blocks: Block[]): string {
  return blocks
    .filter((b): b is TextBlock | PhraseCardBlock => b.type === "text" || b.type === "phrase_card")
    .map((b) => {
      if (b.type === "text") return b.content;
      return `${b.english}. In Hindi: ${b.romanization}. ${b.hindi}. ${b.followup}`;
    })
    .join(" ");
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center px-4 py-3 bg-white rounded-2xl rounded-bl-sm w-16 shadow-sm">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function PhraseCardWidget({ block }: { block: PhraseCardBlock }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {/* English sentence chip */}
      <div className="self-start bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-2">
        <span className="text-gray-800 font-medium">{block.english}</span>
      </div>
      {/* Orange Hindi translation bubble */}
      <div className="self-start bg-[#d4622a] rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm max-w-[85%]">
        <p className="text-white font-bold text-base leading-snug">{block.romanization}</p>
        <p className="text-white/90 text-sm mt-1 leading-snug">{block.hindi}</p>
      </div>
      {/* Follow-up prompt */}
      <div className="self-start bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm max-w-[85%] flex items-start gap-2">
        <span className="text-2xl flex-shrink-0">🧑</span>
        <p className="text-gray-700 text-sm leading-snug">{block.followup}</p>
      </div>
    </div>
  );
}

function MCQWidget({ block, onAnswer }: { block: MCQBlock; onAnswer: (choice: string) => void }) {
  const letters = ["A", "B", "C", "D"];
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 w-full">
      <p className="font-semibold text-gray-800 mb-3 text-sm leading-snug">
        {block.question}
      </p>
      <div className="flex flex-col gap-2">
        {block.options.map((opt, i) => {
          const letter = letters[i];
          const isSelected = block.answered === letter;
          const isCorrect = letter === block.correct;
          const showResult = !!block.answered;

          let style = "border-gray-200 bg-gray-50 text-gray-700";
          if (showResult && isSelected && isCorrect) style = "border-green-400 bg-green-50 text-green-700";
          else if (showResult && isSelected && !isCorrect) style = "border-red-400 bg-red-50 text-red-700";
          else if (showResult && isCorrect) style = "border-green-400 bg-green-50 text-green-700";
          else if (!showResult) style = "border-gray-200 bg-gray-50 text-gray-700 hover:border-[#d4622a] hover:bg-orange-50";

          return (
            <button
              key={i}
              disabled={!!block.answered}
              onClick={() => onAnswer(letter)}
              className={`text-left px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${style}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function JumbleWidget({ block, onSubmit }: { block: JumbleBlock; onSubmit: (answer: string) => void }) {
  const [available, setAvailable] = useState<string[]>([...block.words]);
  const [arranged, setArranged] = useState<string[]>([]);

  const pick = (word: string, idx: number) => {
    if (block.submitted) return;
    setAvailable((a) => a.filter((_, i) => i !== idx));
    setArranged((a) => [...a, word]);
  };

  const remove = (word: string, idx: number) => {
    if (block.submitted) return;
    setArranged((a) => a.filter((_, i) => i !== idx));
    setAvailable((a) => [...a, word]);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 w-full">
      <p className="text-sm text-gray-600 mb-3 leading-snug">{block.instruction}</p>

      {/* Answer area */}
      <div className="min-h-10 flex flex-wrap gap-2 border-2 border-dashed border-gray-200 rounded-xl p-2 mb-3">
        {arranged.length === 0 && (
          <span className="text-xs text-gray-400 self-center">Tap words below to arrange them here</span>
        )}
        {arranged.map((word, i) => (
          <button
            key={i}
            onClick={() => remove(word, i)}
            className="bg-[#d4622a] text-white text-sm font-medium px-3 py-1 rounded-full"
          >
            {word}
          </button>
        ))}
      </div>

      {/* Word pool */}
      <div className="flex flex-wrap gap-2 mb-4">
        {available.map((word, i) => (
          <button
            key={i}
            onClick={() => pick(word, i)}
            className="bg-gray-100 text-gray-700 text-sm font-medium px-3 py-1 rounded-full border border-gray-200 hover:bg-orange-50 hover:border-[#d4622a]"
          >
            {word}
          </button>
        ))}
      </div>

      {!block.submitted && (
        <button
          disabled={arranged.length === 0}
          onClick={() => onSubmit(arranged.join(" "))}
          className="w-full bg-[#d4622a] disabled:bg-[#e8a882] text-white font-semibold py-2 rounded-full text-sm"
        >
          Submit
        </button>
      )}

      {block.submitted && (
        <p className="text-xs text-gray-500 text-center">
          Your answer: <span className="font-medium text-gray-700">{block.userAnswer}</span>
        </p>
      )}
    </div>
  );
}

function SubstitutionWidget({ block }: { block: SubstitutionBlock }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 w-full">
      <p className="text-sm text-gray-700 mb-3 leading-snug">{block.intro}</p>
      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">English</th>
              <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">Pronunciation</th>
              <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">Hindi</th>
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                <td className="px-3 py-2 text-gray-700">{row.english}</td>
                <td className="px-3 py-2 text-[#d4622a] font-medium">{row.romanization}</td>
                <td className="px-3 py-2 text-gray-800">{row.hindi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-gray-700 mt-3 leading-snug">{block.outro}</p>
    </div>
  );
}

// ─── Main Learn Page ───────────────────────────────────────────────────────────

function LearnPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sentence = searchParams.get("sentence") ?? "";
  const emoji = searchParams.get("emoji") ?? "📝";

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [inputText, setInputText] = useState("");
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const initialized = useRef(false);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 100);
  }, []);

  const addBlocks = useCallback((newBlocks: Block[]) => {
    setBlocks((prev) => [...prev, ...newBlocks]);
    const maxStep = Math.max(...newBlocks.map((b) => ("step" in b ? b.step : 0)));
    if (maxStep > 0) setCurrentStep(maxStep);
    scrollToBottom();
  }, [scrollToBottom]);

  const callChat = useCallback(async (messages: ApiMessage[]) => {
    setIsLoading(true);
    setBlocks((prev) => [...prev, { type: "typing" }]);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, sentence }),
      });
      const data = await res.json();
      const newBlocks: Block[] = data.blocks ?? [];

      // Store raw response for conversation history
      const rawResponse = JSON.stringify(newBlocks);
      const updatedMessages: ApiMessage[] = [
        ...messages,
        { role: "assistant", content: rawResponse },
      ];
      setApiMessages(updatedMessages);

      // Remove typing indicator, add new blocks
      setBlocks((prev) => {
        const withoutTyping = prev.filter((b) => b.type !== "typing");
        return [...withoutTyping, ...newBlocks];
      });

      const maxStep = Math.max(...newBlocks.map((b) => ("step" in b ? b.step : 0)));
      if (maxStep > 0) setCurrentStep(maxStep);
      scrollToBottom();

      // Auto-play TTS for text content
      const speakable = extractSpeakableText(newBlocks);
      if (speakable) {
        const audio = await speakText(speakable);
        if (audio) setCurrentAudio(audio);
      }

      return updatedMessages;
    } finally {
      setIsLoading(false);
    }
  }, [sentence, scrollToBottom]);

  // Init: start lesson on mount
  useEffect(() => {
    if (initialized.current || !sentence) return;
    initialized.current = true;
    callChat([]);
  }, [sentence, callChat]);

  const sendUserMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userBlock: TextBlock = { type: "text", content: text, step: currentStep, isUser: true };
    setBlocks((prev) => [...prev, userBlock]);
    setInputText("");
    scrollToBottom();

    const newMessages: ApiMessage[] = [
      ...apiMessages,
      { role: "user", content: text },
    ];
    setApiMessages(newMessages);
    await callChat(newMessages);
  }, [apiMessages, callChat, currentStep, scrollToBottom]);

  const handleMCQAnswer = useCallback(async (blockIndex: number, choice: string) => {
    setBlocks((prev) =>
      prev.map((b, i) => (i === blockIndex && b.type === "mcq" ? { ...b, answered: choice } : b))
    );
    await sendUserMessage(`I choose ${choice}`);
  }, [sendUserMessage]);

  const handleJumbleSubmit = useCallback(async (blockIndex: number, answer: string) => {
    setBlocks((prev) =>
      prev.map((b, i) =>
        i === blockIndex && b.type === "jumble" ? { ...b, submitted: true, userAnswer: answer } : b
      )
    );
    await sendUserMessage(answer);
  }, [sendUserMessage]);

  // Voice recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", blob);

        const res = await fetch("/api/stt", { method: "POST", body: blob });
        const data = await res.json();
        if (data.transcript) sendUserMessage(data.transcript);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      alert("Microphone access denied.");
    }
  }, [sendUserMessage]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const toggleRecording = () => {
    isRecording ? stopRecording() : startRecording();
  };

  const replayAudio = useCallback(async (text: string) => {
    if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }
    const audio = await speakText(text);
    if (audio) setCurrentAudio(audio);
  }, [currentAudio]);

  const progress = Math.min((currentStep / 7) * 100, 100);

  return (
    <div className="flex flex-col h-screen bg-[#f0f0f0] max-w-sm mx-auto">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#f0f0f0]">
        <button
          onClick={() => router.push("/")}
          className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0 shadow"
        >
          <span className="text-white text-sm font-bold">⏸</span>
        </button>
        <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#d4622a] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-4">
        {blocks.map((block, i) => {
          if (block.type === "typing") return (
            <div key={i} className="flex justify-start">
              <TypingIndicator />
            </div>
          );

          if (block.type === "text" && block.isUser) return (
            <div key={i} className="flex justify-end">
              <div className="bg-gray-300 rounded-2xl rounded-br-sm px-4 py-3 max-w-[80%] shadow-sm">
                <p className="text-gray-800 text-sm">{block.content}</p>
              </div>
            </div>
          );

          if (block.type === "text") return (
            <div key={i} className="flex justify-start items-start gap-2">
              <span className="text-2xl flex-shrink-0 mt-1">🧑</span>
              <div className="flex flex-col gap-1">
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 max-w-[80%] shadow-sm">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {block.content.split(/(".*?"|'.*?'|\*\*.*?\*\*)/).map((part, j) => {
                      if (/^\*\*.*\*\*$/.test(part)) return <strong key={j}>{part.slice(2, -2)}</strong>;
                      if (/^".*"$/.test(part)) return <span key={j} className="text-[#d4622a] font-medium">{part}</span>;
                      return part;
                    })}
                  </p>
                </div>
                <button
                  onClick={() => replayAudio(block.content)}
                  className="self-start text-xs text-gray-400 hover:text-[#d4622a] flex items-center gap-1 ml-1"
                >
                  🔊 Replay
                </button>
              </div>
            </div>
          );

          if (block.type === "phrase_card") return (
            <div key={i} className="flex flex-col gap-2">
              <PhraseCardWidget block={block} />
            </div>
          );

          if (block.type === "mcq") return (
            <div key={i} className="flex justify-start w-full">
              <div className="w-full max-w-[90%]">
                <MCQWidget block={block} onAnswer={(choice) => handleMCQAnswer(i, choice)} />
              </div>
            </div>
          );

          if (block.type === "jumble") return (
            <div key={i} className="flex justify-start w-full">
              <div className="w-full max-w-[90%]">
                <JumbleWidget block={block} onSubmit={(ans) => handleJumbleSubmit(i, ans)} />
              </div>
            </div>
          );

          if (block.type === "substitution") return (
            <div key={i} className="flex justify-start w-full">
              <div className="w-full max-w-[90%]">
                <SubstitutionWidget block={block} />
              </div>
            </div>
          );

          return null;
        })}

        {/* spacer */}
        <div className="h-4" />
      </div>

      {/* Input bar */}
      <div className="bg-[#f0f0f0] px-4 py-4 flex flex-col items-center gap-3">
        {/* Text input */}
        <div className="flex w-full gap-2 items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendUserMessage(inputText)}
            placeholder="Type your answer…"
            className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-[#d4622a]"
          />
          <button
            onClick={() => sendUserMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
            className="bg-[#d4622a] disabled:bg-[#e8a882] text-white rounded-full w-9 h-9 flex items-center justify-center text-sm flex-shrink-0"
          >
            ▶
          </button>
        </div>

        {/* Mic + skip row */}
        <div className="flex items-center justify-center gap-10">
          <button
            onClick={toggleRecording}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-all ${
              isRecording ? "bg-red-500 scale-110" : "bg-gray-400 hover:bg-gray-500"
            }`}
          >
            <span className="text-white text-xl">{isRecording ? "⏹" : "🎙"}</span>
          </button>
          <button
            onClick={() => sendUserMessage("skip")}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm"
          >
            <span className="text-lg">⏭</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense>
      <LearnPageInner />
    </Suspense>
  );
}
