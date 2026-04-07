"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const sentences = [
  { emoji: "🍕", text: "I want food" },
  { emoji: "💧", text: "I am sad" },
  { emoji: "⏰", text: "What is the time?" },
  { emoji: "🏷️", text: "How much?" },
  { emoji: "💬", text: "What is your name?" },
  { emoji: "🙆", text: "I need help" },
  { emoji: "🚽", text: "Where is the toilet?" },
  { emoji: "🗺️", text: "I am lost" },
  { emoji: "😊", text: "Where is the toilet?" },
  { emoji: "😄", text: "Nice to meet you" },
];

type Sentence = { emoji: string; text: string };

export default function Home() {
  const router = useRouter();
  const [showInputModal, setShowInputModal] = useState(false);
  const [showLearnModal, setShowLearnModal] = useState<Sentence | null>(null);
  const [sentence, setSentence] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
      <div className="w-full max-w-sm bg-[#f0f0f0] px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="pt-2">
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">
              Learn to
              <br />
              <span className="text-[#d4622a]">say anything</span>
              <br />
              in Hindi
            </h1>
          </div>
          <div className="w-24 h-24 rounded-full overflow-hidden flex items-end justify-center bg-gradient-to-b from-blue-100 to-gray-200 text-6xl select-none">
            🧑
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={openInputModal}
          className="w-full bg-[#d4622a] hover:bg-[#bf5524] text-white text-lg font-semibold py-4 rounded-full mb-6 transition-colors"
        >
          Choose your own sentence
        </button>

        {/* Sentence Grid */}
        <div className="grid grid-cols-2 gap-3">
          {sentences.map((item, i) => (
            <button
              key={i}
              onClick={() => setShowLearnModal(item)}
              className="bg-white rounded-2xl p-4 flex flex-col items-start gap-2 shadow-sm hover:shadow-md active:scale-95 transition-all text-left"
            >
              <span className="text-3xl">{item.emoji}</span>
              <span className="text-sm font-medium text-gray-800 leading-snug">
                {item.text}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Modal (bottom sheet) */}
      {showInputModal && (
        <div
          className="fixed inset-0 bg-black/30 flex items-end justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && closeInputModal()}
        >
          <div className="w-full max-w-sm bg-white rounded-t-3xl px-5 pt-5 pb-8 shadow-xl">
            <div className="flex items-center justify-between mb-1">
              <div className="w-14" />
              <h2 className="text-lg font-bold text-gray-900">Enter your sentence</h2>
              <button
                onClick={closeInputModal}
                className="text-blue-500 font-medium w-14 text-right"
              >
                Cancel
              </button>
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
              onClick={() => router.push(`/learn?sentence=${encodeURIComponent(sentence)}&emoji=📝`)}
              className="w-full bg-[#d4622a] disabled:bg-[#e8a882] text-white text-lg font-semibold py-4 rounded-full transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Learn Modal (centered) */}
      {showLearnModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6"
          onClick={(e) => e.target === e.currentTarget && setShowLearnModal(null)}
        >
          <div className="w-full max-w-sm bg-white rounded-3xl px-6 pt-6 pb-7 shadow-2xl relative">
            {/* Close button */}
            <button
              onClick={() => setShowLearnModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ✕
            </button>

            {/* Title */}
            <div className="text-center mb-5">
              <p className="text-xl font-bold text-gray-800">Learn how to say</p>
              <p className="text-2xl font-bold text-[#d4622a] mt-1">
                &ldquo;{showLearnModal.text}&rdquo;
              </p>
              <p className="text-xl font-bold text-gray-800 mt-1">in Hindi</p>
            </div>

            {/* Emoji card */}
            <div className="bg-gray-50 rounded-2xl flex items-center justify-center py-6 mb-5">
              <span className="text-7xl">{showLearnModal.emoji}</span>
            </div>

            {/* Start learning button */}
            <button
              onClick={() => router.push(`/learn?sentence=${encodeURIComponent(showLearnModal.text)}&emoji=${encodeURIComponent(showLearnModal.emoji)}`)}
              className="w-full bg-[#d4622a] hover:bg-[#bf5524] text-white text-lg font-semibold py-4 rounded-full transition-colors"
            >
              Start learning
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
