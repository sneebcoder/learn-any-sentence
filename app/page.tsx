"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex justify-center min-h-screen" style={{ background: "#ececec" }}>
      <div className="w-full max-w-sm relative" style={{ minHeight: "100svh" }}>

        {/* Full-page background image */}
        <img
          src="/home-bg.png"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-top"
        />

        {/* CTAs — overlaid on the bottom-left, clear of the character */}
        <div className="absolute bottom-16 left-6 right-6 flex flex-col gap-3 z-10">

          {/* Hindi */}
          <button
            onClick={() => router.push("/hindi")}
            className="w-full rounded-2xl active:scale-95 transition-transform shadow-lg"
            style={{ height: "72px", background: "#d4622a" }}
          >
            <div className="flex items-center justify-center h-full gap-3">
              <span style={{ fontSize: "28px" }}>🇮🇳</span>
              <span className="text-white font-bold text-2xl tracking-wide">Learn Hindi</span>
            </div>
          </button>

          {/* Tamil */}
          <button
            onClick={() => router.push("/tamil")}
            className="w-full rounded-2xl active:scale-95 transition-transform shadow-lg"
            style={{ height: "72px", background: "#7c5cbf" }}
          >
            <div className="flex items-center justify-center h-full gap-3">
              <span style={{ fontSize: "28px" }}>🇮🇳</span>
              <span className="text-white font-bold text-2xl tracking-wide">Learn Tamil</span>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}
