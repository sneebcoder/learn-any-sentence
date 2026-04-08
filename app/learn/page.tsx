"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { savePhrase } from "../lib/phrasebook";

// ─── Types ────────────────────────────────────────────────────────────────────

type TextBlock = { type: "text"; content: string; step: number; isUser?: boolean; quickReplies?: string[] };
type PhraseCardBlock = { type: "phrase_card"; english: string; romanization: string; hindi: string; followup: string; step: number; lang?: string };
type MCQBlock = { type: "mcq"; question: string; options: string[]; correct: string; step: number; answered?: string };
type JumbleBlock = { type: "jumble"; instruction: string; words: string[]; correct: string; step: number; submitted?: boolean; userAnswer?: string };
type SubstitutionBlock = { type: "substitution"; intro: string; swapWord: string; rows: { english: string; romanization: string; hindi: string }[]; outro: string; step: number };
type ReportBlock = { type: "report"; sentenceType: string; romanization: string; hindi: string; step: number };
type TypingBlock = { type: "typing" };

type Block = TextBlock | PhraseCardBlock | MCQBlock | JumbleBlock | SubstitutionBlock | ReportBlock | TypingBlock;
type ApiMessage = { role: "user" | "assistant"; content: string };

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function PauseIcon({ size = 20, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <rect x="5" y="4" width="4" height="16" rx="1.5" />
      <rect x="15" y="4" width="4" height="16" rx="1.5" />
    </svg>
  );
}

function SpeakerIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function MicIcon({ size = 24, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function StopIcon({ size = 22, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function SkipIcon({ size = 22, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <polygon points="5 4 15 12 5 20 5 4" />
      <rect x="17" y="4" width="2.5" height="16" rx="1" />
    </svg>
  );
}

function SendIcon({ size = 18, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

// ─── Audio helpers ─────────────────────────────────────────────────────────────

async function fetchAudio(text: string): Promise<HTMLAudioElement | null> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return new Audio(url);
  } catch {
    return null;
  }
}

function blockSpeakableText(block: Block): string | null {
  if (block.type === "text" && !block.isUser) return block.content;
  if (block.type === "phrase_card") return `${block.english}. In Hindi: ${block.romanization}. ${block.followup}`;
  return null;
}

// Circular speaker button embedded inside bubbles
function InlineSpeaker({ isPlaying, onClick, light = false }: { isPlaying: boolean; onClick: () => void; light?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center transition-all active:scale-95 ${
        light
          ? "bg-white/20 hover:bg-white/30"
          : isPlaying
          ? "bg-[#d4622a]/15"
          : "bg-gray-200 hover:bg-gray-300"
      }`}
    >
      {isPlaying ? (
        <span className="flex items-end gap-[2px] h-3">
          {[0, 1, 2].map((k) => (
            <span
              key={k}
              className={`w-[3px] rounded-full animate-bounce ${light ? "bg-white" : "bg-[#d4622a]"}`}
              style={{ height: `${[8, 12, 6][k]}px`, animationDelay: `${k * 0.15}s` }}
            />
          ))}
        </span>
      ) : (
        <SpeakerIcon size={16} color={light ? "white" : "#6b7280"} />
      )}
    </button>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
        <span className="text-lg leading-none">🧑</span>
      </div>
      {/* Bubble */}
      <div className="flex gap-1.5 items-center px-4 py-3 bg-white rounded-2xl rounded-bl-sm shadow-sm">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2.5 h-2.5 bg-gray-300 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function QuickReplies({ replies, onSelect }: { replies: string[]; onSelect: (r: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2 ml-9">
      {replies.map((r, i) => (
        <button
          key={i}
          onClick={() => onSelect(r)}
          className="bg-white border border-[#d4622a] text-[#d4622a] text-xs font-medium px-3 py-1.5 rounded-full hover:bg-orange-50 active:scale-95 transition-all shadow-sm"
        >
          {r}
        </button>
      ))}
    </div>
  );
}

function PhraseCardWidget({ block, isPlaying, onReplay }: { block: PhraseCardBlock; isPlaying: boolean; onReplay: () => void }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {/* English chip */}
      <div className="self-start bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
        <InlineSpeaker isPlaying={false} onClick={onReplay} />
        <span className="text-gray-800 font-medium">{block.english}</span>
      </div>
      {/* Orange Hindi bubble */}
      <div className="self-start bg-[#d4622a] rounded-2xl rounded-bl-sm px-4 py-4 shadow-sm max-w-[85%] flex items-start gap-3">
        <InlineSpeaker isPlaying={isPlaying} onClick={onReplay} light />
        <div>
          <p className="text-white font-bold text-base leading-snug">{block.romanization}</p>
          <p className="text-white/90 text-sm mt-1 leading-snug">{block.hindi}</p>
        </div>
      </div>
      {/* Follow-up */}
      <div className="self-start bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm max-w-[85%] flex items-center gap-3">
        <InlineSpeaker isPlaying={false} onClick={onReplay} />
        <p className="text-gray-700 text-sm leading-snug">{block.followup}</p>
      </div>
    </div>
  );
}

function MCQWidget({ block, onAnswer }: { block: MCQBlock; onAnswer: (choice: string) => void }) {
  const letters = ["A", "B", "C", "D"];
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 w-full">
      <p className="font-semibold text-gray-800 mb-3 text-sm leading-snug">{block.question}</p>
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
            <button key={i} disabled={!!block.answered} onClick={() => onAnswer(letter)} className={`text-left px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${style}`}>
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
      <div className="min-h-10 flex flex-wrap gap-2 border-2 border-dashed border-gray-200 rounded-xl p-2 mb-3">
        {arranged.length === 0 && <span className="text-xs text-gray-400 self-center">Tap words below to arrange them here</span>}
        {arranged.map((word, i) => (
          <button key={i} onClick={() => remove(word, i)} className="bg-[#d4622a] text-white text-sm font-medium px-3 py-1 rounded-full">{word}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {available.map((word, i) => (
          <button key={i} onClick={() => pick(word, i)} className="bg-gray-100 text-gray-700 text-sm font-medium px-3 py-1 rounded-full border border-gray-200 hover:bg-orange-50 hover:border-[#d4622a]">{word}</button>
        ))}
      </div>
      {!block.submitted && (
        <button disabled={arranged.length === 0} onClick={() => onSubmit(arranged.join(" "))} className="w-full bg-[#d4622a] disabled:bg-[#e8a882] text-white font-semibold py-2 rounded-full text-sm">
          Submit
        </button>
      )}
      {block.submitted && (
        <p className="text-xs text-gray-500 text-center">Your answer: <span className="font-medium text-gray-700">{block.userAnswer}</span></p>
      )}
    </div>
  );
}

function SubstitutionWidget({ block, targetLang = "Hindi" }: { block: SubstitutionBlock; targetLang?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 w-full">
      <p className="text-sm text-gray-700 mb-3 leading-snug">{block.intro}</p>
      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">English</th>
              <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">Pronunciation</th>
              <th className="text-left px-3 py-2 text-xs text-gray-500 font-medium">{targetLang}</th>
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

function ReportModal({ block, emoji, sentence, onClose }: { block: ReportBlock; emoji: string; sentence: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
      <div className="w-full max-w-sm bg-white rounded-3xl px-6 pt-6 pb-7 shadow-2xl relative">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-2xl">📣</span>
          <h2 className="text-xl font-bold text-gray-900">Report</h2>
        </div>

        {/* Sentence type */}
        <div className="bg-gray-100 rounded-2xl px-4 py-4 mb-5">
          <p className="text-sm text-gray-500 font-medium">Sentence Type Learned</p>
          <p className="text-base font-semibold text-gray-800 mt-0.5">{block.sentenceType}</p>
        </div>

        {/* You can now express */}
        <p className="text-base text-gray-700 mb-3">
          You can <span className="font-semibold">now express:</span>
        </p>
        <div className="flex items-start gap-3 mb-7">
          <span className="text-4xl">{emoji}</span>
          <div>
            <p className="text-[#d4622a] font-bold text-lg leading-snug">{block.romanization}</p>
            <p className="text-[#d4622a] text-sm mt-0.5 leading-snug">{block.hindi}</p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onClose}
          className="w-full bg-[#3b5ea6] hover:bg-[#2f4d8a] text-white text-base font-semibold py-4 rounded-full transition-colors"
        >
          Back to Home Page
        </button>
      </div>
    </div>
  );
}

// ─── Main Learn Page ───────────────────────────────────────────────────────────

function LearnPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sentence = searchParams.get("sentence") ?? "";
  const emoji = searchParams.get("emoji") ?? "📝";
  const lang = searchParams.get("lang") ?? "hindi";
  const langLabel = lang === "tamil" ? "Tamil" : "Hindi";
  const accentColor = lang === "tamil" ? "#7c5cbf" : "#d4622a";

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [usedQuickReplies, setUsedQuickReplies] = useState<Set<number>>(new Set());
  const [reportBlock, setReportBlock] = useState<ReportBlock | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const playBlockAtRef = useRef<(index: number, text: string) => Promise<void>>(async () => {});

  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const initialized = useRef(false);
  // Always points to the latest sendUserMessage to avoid stale closure in onstop
  const sendUserMessageRef = useRef<(text: string, fromBlockIndex?: number) => Promise<void>>(async () => {});

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 100);
  }, []);

  const callChat = useCallback(async (messages: ApiMessage[]) => {
    setIsLoading(true);
    setBlocks((prev) => [...prev, { type: "typing" }]);
    scrollToBottom();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, sentence, lang }),
      });
      const data = await res.json();
      const newBlocks: Block[] = data.blocks ?? [];
      const rawResponse = JSON.stringify(newBlocks);
      const updatedMessages: ApiMessage[] = [...messages, { role: "assistant", content: rawResponse }];
      setApiMessages(updatedMessages);

      const maxStep = Math.max(...newBlocks.map((b) => ("step" in b ? b.step : 0)));
      if (maxStep > 0) setCurrentStep(maxStep);

      // Reveal blocks one at a time with typing delays between them
      let firstSpeakableAbsIdx: number | null = null;
      let firstSpeakableBlock: Block | null = null;

      for (let idx = 0; idx < newBlocks.length; idx++) {
        const block = newBlocks[idx];

        if (idx === 0) {
          // Replace typing indicator with first block
          setBlocks((prev) => {
            const withoutTyping = prev.filter((b) => b.type !== "typing");
            const absIdx = withoutTyping.length;
            if (firstSpeakableAbsIdx === null && blockSpeakableText(block)) {
              firstSpeakableAbsIdx = absIdx;
              firstSpeakableBlock = block;
            }
            return [...withoutTyping, block];
          });
        } else {
          // Gap before typing indicator appears
          await new Promise((r) => setTimeout(r, 400));
          setBlocks((prev) => [...prev, { type: "typing" }]);
          scrollToBottom();
          // Typing duration scales with content length (2000–3000ms)
          const contentLength = "content" in block ? (block.content as string).length : 80;
          const typingMs = Math.min(3000, Math.max(2000, contentLength * 15));
          await new Promise((r) => setTimeout(r, typingMs));
          setBlocks((prev) => {
            const withoutTyping = prev.filter((b) => b.type !== "typing");
            const absIdx = withoutTyping.length;
            if (firstSpeakableAbsIdx === null && blockSpeakableText(block)) {
              firstSpeakableAbsIdx = absIdx;
              firstSpeakableBlock = block;
            }
            return [...withoutTyping, block];
          });
        }
        scrollToBottom();
      }

      // Auto-play first speakable block
      if (firstSpeakableAbsIdx !== null && firstSpeakableBlock !== null) {
        const speakable = blockSpeakableText(firstSpeakableBlock);
        if (speakable) playBlockAtRef.current(firstSpeakableAbsIdx, speakable);
      }

      // Show report modal and save to phrasebook if lesson is complete
      const report = newBlocks.find((b): b is ReportBlock => b.type === "report");
      if (report) {
        savePhrase({ english: sentence, hindi: report.hindi, romanization: report.romanization, emoji, learnedAt: new Date().toISOString() });
        setTimeout(() => setReportBlock(report), 1500);
      }

      return updatedMessages;
    } finally {
      setIsLoading(false);
    }
  }, [sentence, scrollToBottom]);

  useEffect(() => {
    if (initialized.current || !sentence) return;
    initialized.current = true;
    callChat([]);
  }, [sentence, callChat]);

  const sendUserMessage = useCallback(async (text: string, fromBlockIndex?: number) => {
    if (!text.trim()) return;
    if (fromBlockIndex !== undefined) {
      setUsedQuickReplies((prev) => new Set(prev).add(fromBlockIndex));
    }
    const userBlock: TextBlock = { type: "text", content: text, step: currentStep, isUser: true };
    setBlocks((prev) => [...prev, userBlock]);
    setInputText("");
    scrollToBottom();
    const newMessages: ApiMessage[] = [...apiMessages, { role: "user", content: text }];
    setApiMessages(newMessages);
    await callChat(newMessages);
  }, [apiMessages, callChat, currentStep, scrollToBottom]);

  // Keep ref in sync so onstop always calls the latest sendUserMessage
  useEffect(() => { sendUserMessageRef.current = sendUserMessage; }, [sendUserMessage]);

  const handleMCQAnswer = useCallback(async (blockIndex: number, choice: string) => {
    setBlocks((prev) => prev.map((b, i) => (i === blockIndex && b.type === "mcq" ? { ...b, answered: choice } : b)));
    await sendUserMessage(`I choose ${choice}`);
  }, [sendUserMessage]);

  const handleJumbleSubmit = useCallback(async (blockIndex: number, answer: string) => {
    setBlocks((prev) => prev.map((b, i) => (i === blockIndex && b.type === "jumble" ? { ...b, submitted: true, userAnswer: answer } : b)));
    await sendUserMessage(answer);
  }, [sendUserMessage]);

  const startRecording = useCallback(async () => {
    console.log("[Recorder] startRecording called");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[Recorder] mic stream obtained");
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        console.log("[Recorder] ondataavailable — chunk size:", e.data.size);
        audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        console.log("[Recorder] onstop fired — chunks:", audioChunksRef.current.length);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        console.log("[Recorder] blob assembled — size:", blob.size);
        setIsProcessingAudio(true);
        try {
          const res = await fetch("/api/stt", { method: "POST", body: blob });
          const data = await res.json();
          console.log("[Recorder] STT response:", data);
          if (data.transcript) {
            console.log("[Recorder] transcript received, showing preview:", data.transcript);
            setPendingTranscript(data.transcript);
          } else {
            console.warn("[Recorder] empty transcript from STT");
          }
        } catch (err) {
          console.error("[Recorder] STT fetch failed:", err);
        } finally {
          setIsProcessingAudio(false);
        }
      };
      recorder.start();
      console.log("[Recorder] MediaRecorder started, state:", recorder.state);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("[Recorder] failed to start:", err);
      alert("Microphone access denied.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    console.log("[Recorder] stopRecording called, recorder state:", mediaRecorderRef.current?.state);
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const playBlockAt = useCallback(async (index: number, text: string) => {
    // If this block is already playing, pause it
    if (playingIndex === index && currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setPlayingIndex(null);
      return;
    }
    // Stop any other playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setPlayingIndex(index);
    const audio = await fetchAudio(text);
    if (audio) {
      currentAudioRef.current = audio;
      audio.onended = () => {
        currentAudioRef.current = null;
        setPlayingIndex((prev) => (prev === index ? null : prev));
      };
      audio.play();
    } else {
      setPlayingIndex(null);
    }
  }, [playingIndex]);

  // Keep ref in sync so callChat can call it without a dependency cycle
  playBlockAtRef.current = playBlockAt;

  const progress = Math.min((currentStep / 7) * 100, 100);

  return (
    <div className="flex flex-col h-screen bg-[#f0f0f0] max-w-sm mx-auto">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#f0f0f0]">
        <button
          onClick={() => router.push(`/${lang}`)}
          className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0 shadow hover:bg-gray-600 transition-colors"
        >
          <PauseIcon size={18} color="white" />
        </button>
        <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden">
          <div className="h-full bg-[#d4622a] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Sentence banner */}
      <div className="mx-4 mb-1 bg-white rounded-2xl px-4 py-3 shadow-sm">
        <p className="text-gray-700 text-sm leading-snug">
          Let&apos;s start learning how to say{" "}
          <span className="font-medium" style={{ color: accentColor }}>&ldquo;{sentence}&rdquo;</span>
          {" "}in {langLabel}.
        </p>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-4">
        {blocks.map((block, i) => {
          if (block.type === "typing") return (
            <div key={i} className="flex justify-start"><TypingIndicator /></div>
          );

          if (block.type === "text" && block.isUser) return (
            <div key={i} className="flex justify-end">
              <div className="bg-gray-300 rounded-2xl rounded-br-sm px-4 py-3 max-w-[80%] shadow-sm">
                <p className="text-gray-800 text-sm">{block.content}</p>
              </div>
            </div>
          );

          if (block.type === "text") {
            const showQuickReplies = block.quickReplies && block.quickReplies.length > 0 && !usedQuickReplies.has(i) && !isLoading;
            return (
              <div key={i} className="flex flex-col">
                <div className="self-start bg-white rounded-2xl rounded-bl-sm shadow-sm max-w-[85%] flex items-center gap-3 px-4 py-3">
                  <InlineSpeaker isPlaying={playingIndex === i} onClick={() => playBlockAt(i, block.content)} />
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {block.content.split(/(\*\*.*?\*\*|"[^"]*")/).map((part, j) => {
                      if (/^\*\*.*\*\*$/.test(part)) return <strong key={j}>{part.slice(2, -2)}</strong>;
                      if (/^"[^"]*"$/.test(part)) return <span key={j} className="text-[#d4622a] font-medium">{part}</span>;
                      return part;
                    })}
                  </p>
                </div>
                {showQuickReplies && (
                  <QuickReplies replies={block.quickReplies!} onSelect={(r) => sendUserMessage(r, i)} />
                )}
              </div>
            );
          }

          if (block.type === "phrase_card") return (
            <div key={i}>
              <PhraseCardWidget block={block} isPlaying={playingIndex === i} onReplay={() => playBlockAt(i, blockSpeakableText(block)!)} />
            </div>
          );

          if (block.type === "mcq") return (
            <div key={i} className="w-full max-w-[90%]">
              <MCQWidget block={block} onAnswer={(choice) => handleMCQAnswer(i, choice)} />
            </div>
          );

          if (block.type === "jumble") return (
            <div key={i} className="w-full max-w-[90%]">
              <JumbleWidget block={block} onSubmit={(ans) => handleJumbleSubmit(i, ans)} />
            </div>
          );

          if (block.type === "substitution") return (
            <div key={i} className="w-full max-w-[90%]">
              <SubstitutionWidget block={block} targetLang={langLabel} />
            </div>
          );

          if (block.type === "report") return null; // rendered as modal

          return null;
        })}
        <div className="h-4" />
      </div>

      {/* Report modal */}
      {reportBlock && (
        <ReportModal
          block={reportBlock}
          emoji={emoji}
          sentence={sentence}
          onClose={() => router.push(`/${lang}?completed=${encodeURIComponent(sentence)}`)}
        />
      )}

      {/* Input bar */}
      <div className="bg-[#f0f0f0] px-4 py-4 flex flex-col items-center gap-3">
        {/* Text input row */}
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
            className="bg-[#d4622a] disabled:bg-[#e8a882] text-white rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <SendIcon size={16} color="white" />
          </button>
        </div>

        {/* Mic + skip row */}
        <div className="flex items-center justify-center gap-12">
          {/* Mic / Stop button with transcript tooltip */}
          <div className="relative flex flex-col items-center">
            {/* Transcript preview tooltip */}
            {pendingTranscript && (
              <div className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 w-64 bg-gray-800 text-white text-sm rounded-2xl px-4 py-3 shadow-lg flex flex-col gap-2">
                <p className="text-center leading-snug">&ldquo;{pendingTranscript}&rdquo;</p>
                <div className="flex items-center justify-center gap-3">
                  {/* Discard */}
                  <button
                    onClick={() => {
                      console.log("[Recorder] transcript discarded");
                      setPendingTranscript(null);
                    }}
                    className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors flex-shrink-0"
                    title="Discard and re-record"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  {/* Confirm */}
                  <button
                    onClick={() => {
                      console.log("[Recorder] transcript confirmed, sending:", pendingTranscript);
                      sendUserMessageRef.current(pendingTranscript);
                      setPendingTranscript(null);
                    }}
                    className="w-9 h-9 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors flex-shrink-0"
                    title="Send"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                </div>
                {/* Tooltip arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-800" />
              </div>
            )}

            <button
              onClick={isRecording ? stopRecording : (pendingTranscript ? undefined : startRecording)}
              disabled={isProcessingAudio || !!pendingTranscript}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-all ${
                isRecording ? "bg-red-500 scale-110"
                : isProcessingAudio ? "bg-gray-400"
                : pendingTranscript ? "bg-gray-400"
                : "bg-gray-500 hover:bg-gray-600"
              }`}
            >
              {isProcessingAudio
                ? <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                : isRecording
                  ? <StopIcon size={22} color="white" />
                  : <MicIcon size={24} color="white" />
              }
            </button>
          </div>

          {/* Skip button */}
          <button
            onClick={() => sendUserMessage("skip")}
            disabled={isLoading}
            className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-40 flex items-center justify-center transition-colors"
          >
            <SkipIcon size={20} color="#6b7280" />
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
