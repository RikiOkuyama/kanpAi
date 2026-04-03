"use client";

import { useEffect, useState } from "react";

export default function SwipePreview() {
  const [step, setStep] = useState(0);
  // 0: 静止 → 1: 右へ → 2: 左へ → 3: 上へ → repeat

  useEffect(() => {
    const timings = [1200, 900, 900, 900];
    let i = 0;
    const tick = () => {
      i = (i + 1) % 4;
      setStep(i);
      timer = setTimeout(tick, timings[i]);
    };
    let timer = setTimeout(tick, timings[0]);
    return () => clearTimeout(timer);
  }, []);

  const cardStyle = (() => {
    if (step === 1) return { transform: "translate(60px, -10px) rotate(12deg)", transition: "transform 0.6s cubic-bezier(0.34,1.56,0.64,1)" };
    if (step === 2) return { transform: "translate(-60px, -10px) rotate(-12deg)", transition: "transform 0.6s cubic-bezier(0.34,1.56,0.64,1)" };
    if (step === 3) return { transform: "translateY(-55px)", transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)" };
    return { transform: "translate(0,0) rotate(0deg)", transition: "transform 0.4s ease" };
  })();

  const rightActive = step === 1;
  const leftActive = step === 2;
  const upActive = step === 3;

  return (
    <div className="relative h-48 flex items-center justify-center overflow-hidden">
      {/* 方向ラベル */}
      {/* 左 */}
      <div className={`absolute left-2 flex flex-col items-center gap-1 transition-all duration-300 ${leftActive ? "opacity-100 scale-110" : "opacity-30 scale-100"}`}>
        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg ${leftActive ? "bg-red-100 border-red-400" : "bg-gray-100 border-gray-300"}`}>✕</div>
        <span className="text-xs font-bold text-gray-500">パス</span>
      </div>

      {/* 上 */}
      <div className={`absolute top-0 flex flex-col items-center gap-1 transition-all duration-300 ${upActive ? "opacity-100 scale-110" : "opacity-30 scale-100"}`}>
        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg ${upActive ? "bg-amber-100 border-amber-400" : "bg-gray-100 border-gray-300"}`}>⭐</div>
        <span className="text-xs font-bold text-gray-500">絶対行く</span>
      </div>

      {/* 右 */}
      <div className={`absolute right-2 flex flex-col items-center gap-1 transition-all duration-300 ${rightActive ? "opacity-100 scale-110" : "opacity-30 scale-100"}`}>
        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg ${rightActive ? "bg-green-100 border-green-400" : "bg-gray-100 border-gray-300"}`}>❤️</div>
        <span className="text-xs font-bold text-gray-500">行きたい</span>
      </div>

      {/* カード */}
      <div
        className="relative w-36 rounded-2xl shadow-lg overflow-hidden bg-white border border-gray-100"
        style={cardStyle}
      >
        {/* カード画像部分 */}
        <div className="h-20 bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center">
          <span className="text-3xl">🍽</span>
        </div>

        {/* インジケーターオーバーレイ */}
        {rightActive && (
          <div className="absolute inset-0 bg-green-400/30 flex items-center justify-center">
            <span className="text-white font-black text-lg bg-green-500/80 px-3 py-1 rounded-xl">❤️ 行きたい</span>
          </div>
        )}
        {leftActive && (
          <div className="absolute inset-0 bg-red-400/30 flex items-center justify-center">
            <span className="text-white font-black text-lg bg-red-500/80 px-3 py-1 rounded-xl">✕ パス</span>
          </div>
        )}
        {upActive && (
          <div className="absolute inset-0 bg-amber-400/30 flex items-center justify-center">
            <span className="text-white font-black text-lg bg-amber-500/80 px-3 py-1 rounded-xl">⭐ 絶対行く</span>
          </div>
        )}

        {/* カードテキスト部分 */}
        <div className="p-2">
          <div className="h-2 bg-gray-200 rounded w-3/4 mb-1" />
          <div className="h-2 bg-gray-100 rounded w-1/2" />
        </div>
      </div>

      {/* 矢印アニメーション */}
      {step === 0 && (
        <div className="absolute bottom-1 flex gap-6 text-gray-300 text-xs font-medium animate-pulse">
          <span>← 左</span>
          <span>↑ 上</span>
          <span>右 →</span>
        </div>
      )}
    </div>
  );
}
