"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPhrases, type PhrasebookEntry } from "../lib/phrasebook";

const ALL_SENTENCES = [
  { emoji: "🍕", text: "I want food" },
  { emoji: "💧", text: "I am sad" },
  { emoji: "⏰", text: "What is the time?" },
  { emoji: "🏷️", text: "How much?" },
  { emoji: "💬", text: "What is your name?" },
  { emoji: "🙆", text: "I need help" },
  { emoji: "🚽", text: "Where is the toilet?" },
  { emoji: "🗺️", text: "I am lost" },
  { emoji: "😊", text: "Good morning!" },
  { emoji: "😄", text: "Nice to meet you" },
  { emoji: "🚕", text: "I need a taxi" },
  { emoji: "🏨", text: "Where is the hotel?" },
  { emoji: "💊", text: "I need a doctor" },
  { emoji: "📞", text: "Call the police" },
  { emoji: "💰", text: "That's too expensive" },
  { emoji: "🍽️", text: "The food is delicious" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Sentence = { emoji: string; text: string };

function getReplacementSentence(current: Sentence[]): Sentence {
  const currentTexts = new Set(current.map((s) => s.text));
  const available = ALL_SENTENCES.filter((s) => !currentTexts.has(s.text));
  const pool = available.length > 0 ? available : ALL_SENTENCES;
  return pool[Math.floor(Math.random() * pool.length)];
}

function PhrasebookModal({ onClose }: { onClose: () => void }) {
  const phrases: PhrasebookEntry[] = getPhrases();
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="animate-slide-up w-full max-w-sm bg-[#f5f5f5] rounded-t-3xl shadow-xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 pt-6 pb-3 flex-shrink-0">
          <h2 className="text-xl font-bold text-[#d4622a]">Phrasebook</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <p className="px-5 pb-3 text-sm text-gray-500 flex-shrink-0">
          {phrases.length === 0 ? "You haven't learned any phrases yet."
            : phrases.length === 1 ? "You've learned 1 phrase — nice start!"
            : `You've learned ${phrases.length} phrases — wow!`}
        </p>
        {phrases.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-14 text-center px-8">
            <span className="text-6xl">📖</span>
            <p className="text-gray-400 text-sm leading-relaxed">
              Complete a lesson and your phrases will appear here. Go learn your first one!
            </p>
          </div>
        )}
        {phrases.length > 0 && (
          <div className="flex flex-col gap-3 overflow-y-auto px-5 pb-8">
            {phrases.map((phrase, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
                <span className="text-4xl flex-shrink-0">{phrase.emoji}</span>
                <div>
                  <p className="font-bold text-base text-gray-900">{phrase.english}</p>
                  <p className="text-gray-800 text-sm mt-0.5">{phrase.hindi}</p>
                  <p className="text-gray-400 text-sm italic mt-0.5">{phrase.romanization}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
      <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse" />
      <div className="flex flex-col gap-1.5">
        <div className="h-3 bg-gray-200 rounded-full animate-pulse w-3/4" />
        <div className="h-3 bg-gray-200 rounded-full animate-pulse w-1/2" />
      </div>
    </div>
  );
}

const HINDI_STORAGE_KEY = "hindi_displayed_sentences";

function loadHindiSentences(): Sentence[] {
  try {
    const saved = sessionStorage.getItem(HINDI_STORAGE_KEY);
    if (saved) return JSON.parse(saved) as Sentence[];
  } catch {}
  return ALL_SENTENCES.slice(0, 8);
}

function HindiHomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [displayedSentences, setDisplayedSentences] = useState<Sentence[]>(loadHindiSentences);
  const [isShuffling, setIsShuffling] = useState(false);
  const [showPhrasebook, setShowPhrasebook] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);
  const [showLearnModal, setShowLearnModal] = useState<Sentence | null>(null);
  const [sentence, setSentence] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // Track every sentence ever shown so shuffles never repeat them
  const seenTextsRef = useRef<Set<string>>(new Set(loadHindiSentences().map((s) => s.text)));

  // Persist displayed sentences so they survive navigation
  useEffect(() => {
    try { sessionStorage.setItem(HINDI_STORAGE_KEY, JSON.stringify(displayedSentences)); } catch {}
  }, [displayedSentences]);

  // Completion animation state
  const [completedIdx, setCompletedIdx] = useState<number | null>(null);
  const [animPhase, setAnimPhase] = useState<"celebrate" | "exit" | "enter" | null>(null);

  useEffect(() => {
    const completed = searchParams.get("completed");
    if (!completed) return;

    // Clean the URL immediately
    router.replace("/hindi", { scroll: false });

    const idx = displayedSentences.findIndex((s) => s.text === completed);
    if (idx === -1) return;

    setCompletedIdx(idx);
    setAnimPhase("celebrate");

    // Exit animation
    const t1 = setTimeout(() => setAnimPhase("exit"), 1200);

    // Swap sentence + enter animation
    const t2 = setTimeout(() => {
      setDisplayedSentences((prev) => {
        const updated = [...prev];
        updated[idx] = getReplacementSentence(prev);
        return updated;
      });
      setAnimPhase("enter");
    }, 1700);

    // Clean up
    const t3 = setTimeout(() => {
      setAnimPhase(null);
      setCompletedIdx(null);
    }, 2300);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShuffle = async () => {
    setIsShuffling(true);
    try {
      const exclude = Array.from(seenTextsRef.current).join("|||");
      const res = await fetch(`/api/sentences?lang=hindi&exclude=${encodeURIComponent(exclude)}`);
      const data = await res.json();
      if (data.sentences?.length) {
        data.sentences.forEach((s: Sentence) => seenTextsRef.current.add(s.text));
        setDisplayedSentences(data.sentences);
      } else {
        setDisplayedSentences(shuffle(ALL_SENTENCES).slice(0, 8));
      }
    } catch {
      setDisplayedSentences(shuffle(ALL_SENTENCES).slice(0, 8));
    } finally {
      setIsShuffling(false);
    }
  };

  const openInputModal = () => {
    setShowInputModal(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeInputModal = () => {
    setShowInputModal(false);
    setSentence("");
  };

  return (
    <div className="min-h-screen bg-[#f0f0f0] flex justify-center">
      <div className="w-full max-w-sm bg-[#f0f0f0] pt-0 pb-8 overflow-hidden">
        {/* Banner */}
        <div className="relative w-full mb-4 -mx-4" style={{ width: "calc(100% + 2rem)" }}>
          <img src="/banner.png" alt="Learn to say anything in Hindi" className="w-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#f0f0f0] to-transparent" />
          <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-[#f0f0f0] to-transparent" />
          <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-[#f0f0f0] to-transparent" />
        </div>

        <div className="px-4">
          {/* Back button */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-gray-500 text-sm mb-4 hover:text-gray-700"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            All languages
          </button>

          {/* CTA Button */}
          <button
            onClick={openInputModal}
            className="w-full bg-[#d4622a] hover:bg-[#bf5524] text-white text-lg font-semibold py-4 rounded-full mb-6 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            ✏️ Type my own sentence
          </button>

          {/* Sentence Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {isShuffling
              ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
              : displayedSentences.map((item, i) => {
                  const isCelebrating = completedIdx === i && animPhase === "celebrate";
                  const isExiting    = completedIdx === i && animPhase === "exit";
                  const isEntering   = completedIdx === i && animPhase === "enter";

                  return (
                    <div key={i} className="relative">
                      <button
                        onClick={() => setShowLearnModal(item)}
                        className={`w-full bg-white rounded-2xl p-4 flex flex-col items-start gap-2 shadow-sm hover:shadow-md active:scale-95 transition-shadow text-left
                          ${isCelebrating ? "tile-celebrate" : ""}
                          ${isExiting ? "tile-exit" : ""}
                          ${isEntering ? "tile-enter" : ""}
                        `}
                      >
                        <span className="text-3xl">{item.emoji}</span>
                        <span className="text-sm font-medium text-gray-800 leading-snug">{item.text}</span>
                      </button>

                      {/* Celebration overlay */}
                      {isCelebrating && (
                        <div className="absolute inset-0 bg-green-500/90 rounded-2xl flex flex-col items-center justify-center gap-1 pointer-events-none z-10 tile-celebrate">
                          <span className="text-white text-3xl font-bold">✓</span>
                          <span className="text-white text-xs font-semibold">Learned!</span>
                        </div>
                      )}
                    </div>
                  );
                })}
          </div>

          {/* Bottom action buttons */}
          <div className="flex items-center justify-center gap-3 pb-2">
            <button
              onClick={handleShuffle}
              disabled={isShuffling}
              className="flex items-center gap-2 bg-[#d4622a] hover:bg-[#bf5524] disabled:opacity-60 active:scale-95 text-white font-semibold text-sm px-5 py-3 rounded-full transition-all shadow-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
              </svg>
              Shuffle sentences
            </button>
            <button
              onClick={() => setShowPhrasebook(true)}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 active:scale-95 text-gray-700 font-semibold text-sm px-5 py-3 rounded-full transition-all shadow-sm border border-gray-100"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              History
            </button>
          </div>
        </div>
      </div>

      {/* Input Modal */}
      {showInputModal && (
        <div
          className="fixed inset-0 bg-black/30 flex items-end justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && closeInputModal()}
        >
          <div className="w-full max-w-sm bg-white rounded-t-3xl px-5 pt-5 pb-8 shadow-xl">
            <div className="flex items-center justify-between mb-1">
              <div className="w-14" />
              <h2 className="text-lg font-bold text-gray-900">Enter your sentence</h2>
              <button onClick={closeInputModal} className="text-blue-500 font-medium w-14 text-right">Cancel</button>
            </div>
            <p className="text-sm text-gray-500 text-center mb-4">
              Type in the sentence you&apos;d like to learn in Hindi
            </p>
            <input
              ref={inputRef}
              type="text"
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              placeholder="I need a taxi"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-base outline-none focus:border-[#d4622a] shadow-sm mb-5"
            />
            <button
              disabled={!sentence.trim()}
              onClick={() => router.push(`/learn?sentence=${encodeURIComponent(sentence)}&emoji=📝&lang=hindi`)}
              className="w-full bg-[#d4622a] disabled:bg-[#e8a882] text-white text-lg font-semibold py-4 rounded-full transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Learn Modal */}
      {showLearnModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6"
          onClick={(e) => e.target === e.currentTarget && setShowLearnModal(null)}
        >
          <div className="w-full max-w-sm bg-white rounded-3xl px-6 pt-6 pb-7 shadow-2xl relative">
            <button
              onClick={() => setShowLearnModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
            >✕</button>
            <div className="text-center mb-5">
              <p className="text-xl font-bold text-gray-800">Learn how to say</p>
              <p className="text-2xl font-bold text-[#d4622a] mt-1">&ldquo;{showLearnModal.text}&rdquo;</p>
              <p className="text-xl font-bold text-gray-800 mt-1">in Hindi</p>
            </div>
            <div className="bg-gray-50 rounded-2xl flex items-center justify-center py-6 mb-5">
              <span className="text-7xl">{showLearnModal.emoji}</span>
            </div>
            <button
              onClick={() => router.push(`/learn?sentence=${encodeURIComponent(showLearnModal.text)}&emoji=${encodeURIComponent(showLearnModal.emoji)}&lang=hindi`)}
              className="w-full bg-[#d4622a] hover:bg-[#bf5524] text-white text-lg font-semibold py-4 rounded-full transition-colors"
            >
              Start learning
            </button>
          </div>
        </div>
      )}

      {showPhrasebook && <PhrasebookModal onClose={() => setShowPhrasebook(false)} />}
    </div>
  );
}

export default function HindiHome() {
  return (
    <Suspense>
      <HindiHomeInner />
    </Suspense>
  );
}
