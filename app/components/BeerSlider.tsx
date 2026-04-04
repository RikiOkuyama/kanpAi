"use client";

import { useState, useRef, useCallback, useEffect } from "react";

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
];

// SVG viewBox: 0 0 300 215
const PIVOT_X = 70;
const PIVOT_Y = 127;
const BOTTLE_LEN = 113; // pivot → neck opening (px)
const MAX_ANGLE = 88;   // degrees (bottle fully tilted)

const GLASS_CX = 235;
const GLASS_RIM_Y = 132;
const GLASS_BOT_Y = 207;
const GLASS_RIM_HW = 26;  // half-width at rim
const GLASS_BOT_HW = 20;  // half-width at bottom

function pctToAngle(pct: number) {
  return (pct / 100) * MAX_ANGLE;
}
function angleToPct(a: number) {
  return Math.max(0, Math.min(100, (a / MAX_ANGLE) * 100));
}

export default function BeerSlider({
  value,
  onChange,
  min = 2000,
  max = 10000,
  step = 1000,
}: BeerSliderProps) {
  const initPct = ((value - min) / (max - min)) * 100;
  const [angle, setAngle] = useState(pctToAngle(initPct));
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Sync when value changes externally
  useEffect(() => {
    if (!isDragging) {
      const pct = ((value - min) / (max - min)) * 100;
      setAngle(pctToAngle(pct));
    }
  }, [value, min, max, isDragging]);

  const fillPct = angleToPct(angle);

  const getAngleFromPointer = useCallback((clientX: number, clientY: number): number => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = (clientX - rect.left) / rect.width * 300;
    const svgY = (clientY - rect.top) / rect.height * 215;
    const dx = svgX - PIVOT_X;
    const dy = svgY - PIVOT_Y;
    const deg = Math.atan2(dx, -dy) * (180 / Math.PI);
    return Math.max(0, Math.min(MAX_ANGLE, deg));
  }, []);

  const commit = useCallback((newAngle: number) => {
    const pct = angleToPct(newAngle);
    const raw = min + (pct / 100) * (max - min);
    const snapped = Math.round(raw / step) * step;
    onChange(Math.max(min, Math.min(max, snapped)));
  }, [min, max, step, onChange]);

  const onPtrDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    const a = getAngleFromPointer(e.clientX, e.clientY);
    setAngle(a);
    commit(a);
  }, [getAngleFromPointer, commit]);

  const onPtrMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    const a = getAngleFromPointer(e.clientX, e.clientY);
    setAngle(a);
    commit(a);
  }, [isDragging, getAngleFromPointer, commit]);

  const onPtrUp = useCallback(() => setIsDragging(false), []);

  // Neck opening position in world coords
  const rad = angle * Math.PI / 180;
  const neckX = PIVOT_X + BOTTLE_LEN * Math.sin(rad);
  const neckY = PIVOT_Y - BOTTLE_LEN * Math.cos(rad);

  const showStream = angle > 18 && neckY < GLASS_RIM_Y + 2;

  // Glass fill geometry
  const beerH = (fillPct / 100) * (GLASS_BOT_Y - GLASS_RIM_Y);
  const beerTop = GLASS_BOT_Y - beerH;
  const surfaceRatio = beerH > 0 ? beerH / (GLASS_BOT_Y - GLASS_RIM_Y) : 0;
  const surfaceHW = GLASS_BOT_HW + (GLASS_RIM_HW - GLASS_BOT_HW) * surfaceRatio;

  // Stream bezier control point
  const streamW = 2 + (angle / MAX_ANGLE) * 3;
  const streamCX = neckX + (GLASS_CX - 8 - neckX) * 0.5 + 10;
  const streamCY = neckY + (GLASS_RIM_Y - neckY) * 0.45 + 8;

  // Bottle path (pivot at PIVOT_X, PIVOT_Y; bottle extends upward)
  const bx = PIVOT_X;
  const by = PIVOT_Y;

  return (
    <div className="flex flex-col items-center gap-3">
      <style>{`
        @keyframes bc-stream {
          to { stroke-dashoffset: -12; }
        }
        @keyframes bc-bubble {
          0%   { transform: translateY(0px) scale(1);   opacity: 0.75; }
          100% { transform: translateY(-28px) scale(0.3); opacity: 0; }
        }
        .bc-stream-anim {
          stroke-dasharray: 6 5;
          animation: bc-stream 0.16s linear infinite;
        }
      `}</style>

      <p className="text-xs text-gray-400 font-medium tracking-wide">瓶を傾けて予算を設定</p>

      <svg
        ref={svgRef}
        viewBox="0 0 300 215"
        className="w-full max-w-xs select-none touch-none"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        onPointerDown={onPtrDown}
        onPointerMove={onPtrMove}
        onPointerUp={onPtrUp}
        onPointerCancel={onPtrUp}
      >
        <defs>
          <clipPath id="bc-clip">
            <path d={`
              M ${GLASS_CX - GLASS_RIM_HW} ${GLASS_RIM_Y}
              L ${GLASS_CX - GLASS_BOT_HW} ${GLASS_BOT_Y}
              L ${GLASS_CX + GLASS_BOT_HW} ${GLASS_BOT_Y}
              L ${GLASS_CX + GLASS_RIM_HW} ${GLASS_RIM_Y}
              Z
            `} />
          </clipPath>

          <linearGradient id="bc-beer-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#C47B10" />
            <stop offset="45%"  stopColor="#F5A623" />
            <stop offset="100%" stopColor="#D08518" />
          </linearGradient>

          <linearGradient id="bc-bottle-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#5A2A08" />
            <stop offset="30%"  stopColor="#9B5A28" />
            <stop offset="65%"  stopColor="#8B4E20" />
            <stop offset="100%" stopColor="#4A2008" />
          </linearGradient>

          <linearGradient id="bc-stream-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#F5C030" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#F5A623" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* ── GLASS ── */}
        {/* Interior fill */}
        <path
          d={`
            M ${GLASS_CX - GLASS_RIM_HW} ${GLASS_RIM_Y}
            L ${GLASS_CX - GLASS_BOT_HW} ${GLASS_BOT_Y}
            L ${GLASS_CX + GLASS_BOT_HW} ${GLASS_BOT_Y}
            L ${GLASS_CX + GLASS_RIM_HW} ${GLASS_RIM_Y}
            Z
          `}
          fill="rgba(235,250,255,0.18)"
        />

        {/* Beer liquid */}
        {fillPct > 0 && (
          <rect
            clipPath="url(#bc-clip)"
            x={GLASS_CX - GLASS_RIM_HW - 1}
            y={beerTop}
            width={(GLASS_RIM_HW + 1) * 2}
            height={beerH + 2}
            fill="url(#bc-beer-grad)"
            style={{ transition: isDragging ? "none" : "y 0.22s ease-out, height 0.22s ease-out" }}
          />
        )}

        {/* Foam */}
        {fillPct > 1 && (
          <>
            <ellipse
              clipPath="url(#bc-clip)"
              cx={GLASS_CX}
              cy={beerTop}
              rx={Math.max(0, surfaceHW - 2)}
              ry={5}
              fill="white"
              opacity={0.9}
              style={{ transition: isDragging ? "none" : "cy 0.22s ease-out, rx 0.22s ease-out" }}
            />
            <circle
              clipPath="url(#bc-clip)"
              cx={GLASS_CX - 9} cy={beerTop - 4} r={3.5}
              fill="white" opacity={0.78}
              style={{ transition: isDragging ? "none" : "cy 0.22s ease-out" }}
            />
            <circle
              clipPath="url(#bc-clip)"
              cx={GLASS_CX + 5} cy={beerTop - 5} r={3}
              fill="white" opacity={0.72}
              style={{ transition: isDragging ? "none" : "cy 0.22s ease-out" }}
            />
            <circle
              clipPath="url(#bc-clip)"
              cx={GLASS_CX + 14} cy={beerTop - 3} r={2.5}
              fill="white" opacity={0.65}
              style={{ transition: isDragging ? "none" : "cy 0.22s ease-out" }}
            />
          </>
        )}

        {/* Glass outline */}
        <path
          d={`
            M ${GLASS_CX - GLASS_RIM_HW} ${GLASS_RIM_Y}
            L ${GLASS_CX - GLASS_BOT_HW} ${GLASS_BOT_Y}
            L ${GLASS_CX + GLASS_BOT_HW} ${GLASS_BOT_Y}
            L ${GLASS_CX + GLASS_RIM_HW} ${GLASS_RIM_Y}
          `}
          fill="none"
          stroke="#C99030"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Glass shine */}
        <path
          d={`M ${GLASS_CX - GLASS_RIM_HW + 5} ${GLASS_RIM_Y + 7} L ${GLASS_CX - GLASS_BOT_HW + 4} ${GLASS_BOT_Y - 12}`}
          stroke="rgba(255,255,255,0.42)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* ── POUR STREAM ── */}
        {showStream && (
          <>
            {/* Outer glow */}
            <path
              d={`M ${neckX} ${neckY} Q ${streamCX} ${streamCY} ${GLASS_CX - 6} ${GLASS_RIM_Y}`}
              fill="none"
              stroke="rgba(245,180,50,0.25)"
              strokeWidth={streamW + 4}
              strokeLinecap="round"
            />
            {/* Stream */}
            <path
              d={`M ${neckX} ${neckY} Q ${streamCX} ${streamCY} ${GLASS_CX - 6} ${GLASS_RIM_Y}`}
              fill="none"
              stroke="url(#bc-stream-grad)"
              strokeWidth={streamW}
              strokeLinecap="round"
              className="bc-stream-anim"
            />
          </>
        )}

        {/* ── BOTTLE ── */}
        <g transform={`rotate(${angle}, ${bx}, ${by})`}>
          {/* Bottle body */}
          <path
            d={`
              M ${bx - 17} ${by - 7}
              L ${bx - 18} ${by - 58}
              Q ${bx - 18} ${by - 70} ${bx - 12} ${by - 76}
              L ${bx - 9}  ${by - 82}
              L ${bx - 9}  ${by - 107}
              Q ${bx - 7}  ${by - 113} ${bx}     ${by - 113}
              Q ${bx + 7}  ${by - 113} ${bx + 9}  ${by - 107}
              L ${bx + 9}  ${by - 82}
              L ${bx + 12} ${by - 76}
              Q ${bx + 18} ${by - 70} ${bx + 18} ${by - 58}
              L ${bx + 17} ${by - 7}
              L ${bx + 17} ${by}
              L ${bx - 17} ${by}
              Z
            `}
            fill="url(#bc-bottle-grad)"
            stroke="#2A1005"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />

          {/* Label */}
          <rect
            x={bx - 13} y={by - 70}
            width="26" height="34"
            rx="4"
            fill="#EDE8D6"
            stroke="#B09050"
            strokeWidth="0.8"
          />

          {/* Body highlight */}
          <path
            d={`M ${bx + 12} ${by - 15} Q ${bx + 14} ${by - 50} ${bx + 11} ${by - 74}`}
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Neck highlight */}
          <path
            d={`M ${bx + 6} ${by - 86} L ${bx + 6} ${by - 108}`}
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Bottle cap */}
          <path
            d={`M ${bx - 8} ${by - 113} L ${bx - 7} ${by - 120} Q ${bx} ${by - 123} ${bx + 7} ${by - 120} L ${bx + 8} ${by - 113} Z`}
            fill="#B03020"
            stroke="#801810"
            strokeWidth="1"
          />
          {/* Cap sheen */}
          <line
            x1={bx - 5} y1={by - 114}
            x2={bx - 3} y2={by - 120}
            stroke="rgba(255,140,120,0.38)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        {/* Drag hint arrow (shown only when angle is near 0) */}
        {angle < 8 && (
          <g opacity={0.5}>
            <path
              d={`M ${bx + 28} ${by - 60} Q ${bx + 55} ${by - 50} ${bx + 52} ${by - 28}`}
              fill="none"
              stroke="#F5A623"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
            <polygon
              points={`${bx + 50},${by - 22} ${bx + 45},${by - 32} ${bx + 57},${by - 30}`}
              fill="#F5A623"
            />
          </g>
        )}
      </svg>

      {/* 金額表示 */}
      <div className="text-2xl font-bold text-amber-700">
        {value.toLocaleString()}円 / 人
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
    </div>
  );
}
