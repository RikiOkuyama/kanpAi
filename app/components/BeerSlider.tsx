"use client";

import { useState, useEffect } from "react";

interface BeerSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const BUDGET_LABELS = [
  { value: 2000, label: "2,000円" },
  { value: 3000, label: "3,000円" },
  { value: 4000, label: "4,000円" },
  { value: 5000, label: "5,000円" },
  { value: 6000, label: "6,000円" },
  { value: 8000, label: "8,000円" },
  { value: 10000, label: "10,000円" },
  { value: 15000, label: "15,000円" },
];

export default function BeerSlider({
  value,
  onChange,
  min = 2000,
  max = 15000,
  step = 1000,
}: BeerSliderProps) {
  const [animating, setAnimating] = useState(false);
  const fillPercent = ((value - min) / (max - min)) * 100;

  useEffect(() => {
    setAnimating(true);
    const t = setTimeout(() => setAnimating(false), 300);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* ジョッキ SVG */}
      <div className="relative w-28 h-40 select-none">
        {/* ジョッキ外形 */}
        <svg viewBox="0 0 100 140" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* ハンドル */}
          <path
            d="M72 40 Q90 40 90 65 Q90 90 72 90"
            fill="none"
            stroke="#D4A853"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* ジョッキ本体 */}
          <path
            d="M15 20 L10 130 Q10 135 20 135 L70 135 Q80 135 80 130 L75 20 Z"
            fill="#FFF9F0"
            stroke="#D4A853"
            strokeWidth="3"
          />

          {/* ビール液体（動的） */}
          <clipPath id="beer-clip">
            <path d="M15 20 L10 130 Q10 135 20 135 L70 135 Q80 135 80 130 L75 20 Z" />
          </clipPath>
          <rect
            clipPath="url(#beer-clip)"
            x="0"
            y={135 - fillPercent * 1.15}
            width="100"
            height="140"
            fill="#F5A623"
            className={`transition-all duration-500 ${animating ? "opacity-90" : "opacity-100"}`}
          />

          {/* 泡 */}
          {fillPercent > 5 && (
            <>
              <ellipse
                clipPath="url(#beer-clip)"
                cx="35"
                cy={135 - fillPercent * 1.15 - 4}
                rx="22"
                ry="8"
                fill="white"
                opacity="0.9"
                className="transition-all duration-500"
              />
              <circle cx="28" cy={135 - fillPercent * 1.15 - 8} r="5" fill="white" opacity="0.8" clipPath="url(#beer-clip)" className="transition-all duration-500" />
              <circle cx="42" cy={135 - fillPercent * 1.15 - 9} r="4" fill="white" opacity="0.8" clipPath="url(#beer-clip)" className="transition-all duration-500" />
              <circle cx="55" cy={135 - fillPercent * 1.15 - 6} r="3" fill="white" opacity="0.7" clipPath="url(#beer-clip)" className="transition-all duration-500" />
            </>
          )}

          {/* ジョッキ外枠（前面に重ねる） */}
          <path
            d="M15 20 L10 130 Q10 135 20 135 L70 135 Q80 135 80 130 L75 20 Z"
            fill="none"
            stroke="#D4A853"
            strokeWidth="3"
          />
        </svg>
      </div>

      {/* 金額表示 */}
      <div className="text-2xl font-bold text-amber-700">
        {value.toLocaleString()}円 / 人
      </div>

      {/* スライダー */}
      <div className="w-full px-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-3 rounded-lg appearance-none cursor-pointer beer-slider"
          style={{
            background: `linear-gradient(to right, #F5A623 0%, #F5A623 ${fillPercent}%, #E5E7EB ${fillPercent}%, #E5E7EB 100%)`,
          }}
        />
      </div>

      {/* ラベル */}
      <div className="flex justify-between w-full px-1 text-xs text-gray-400">
        <span>{min.toLocaleString()}円</span>
        <span>{max.toLocaleString()}円</span>
      </div>

      {/* プリセットボタン */}
      <div className="flex flex-wrap gap-2 justify-center">
        {BUDGET_LABELS.map((b) => (
          <button
            key={b.value}
            type="button"
            onClick={() => onChange(b.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              value === b.value
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white text-gray-600 border-gray-300 hover:border-amber-400"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      <style jsx>{`
        .beer-slider::-webkit-slider-thumb {
          appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #F5A623;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          cursor: pointer;
        }
        .beer-slider::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #F5A623;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
