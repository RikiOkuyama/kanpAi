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

// SVG viewBox: 0 0 300 250
const PIVOT_X = 72;
const PIVOT_Y = 150;
const BOTTLE_LEN = 130; // pivot → neck opening (px)
const MAX_ANGLE = 88;   // degrees (bottle fully tilted)

const GLASS_CX = 240;
const GLASS_RIM_Y = 155;
const GLASS_BOT_Y = 245;
const GLASS_RIM_HW = 32;  // half-width at rim
const GLASS_BOT_HW = 25;  // half-width at bottom

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
    const svgY = (clientY - rect.top) / rect.height * 250;
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
  const streamW = 5 + (angle / MAX_ANGLE) * 11;
  const hw = streamW / 2;
  const streamCX = neckX + (GLASS_CX - 8 - neckX) * 0.5 + 10;
  const streamCY = neckY + (GLASS_RIM_Y - neckY) * 0.45 + 8;
  const streamEndX = GLASS_CX - 6;
  const streamEndY = fillPct > 3 ? Math.max(beerTop, GLASS_RIM_Y + 1) : GLASS_RIM_Y + 5;

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
        viewBox="0 0 300 250"
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

          <linearGradient id="bc-stream-fill-grad" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0%"   stopColor="#FFE070" stopOpacity="0.95" />
            <stop offset="55%"  stopColor="#F5A623" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#C87D10" stopOpacity="0.85" />
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
            {/* Ambient outer glow */}
            <path
              d={`M ${neckX} ${neckY} Q ${streamCX} ${streamCY} ${streamEndX} ${streamEndY}`}
              fill="none"
              stroke="rgba(245,190,60,0.10)"
              strokeWidth={streamW * 5}
              strokeLinecap="round"
            />
            <path
              d={`M ${neckX} ${neckY} Q ${streamCX} ${streamCY} ${streamEndX} ${streamEndY}`}
              fill="none"
              stroke="rgba(245,180,50,0.28)"
              strokeWidth={streamW * 2.5}
              strokeLinecap="round"
            />
            {/* Filled liquid stream body */}
            <path
              d={`
                M ${neckX - hw} ${neckY}
                Q ${streamCX - hw * 0.6} ${streamCY} ${streamEndX - hw * 1.7} ${streamEndY}
                L ${streamEndX + hw * 1.7} ${streamEndY}
                Q ${streamCX + hw * 0.6} ${streamCY} ${neckX + hw} ${neckY}
                Z
              `}
              fill="url(#bc-stream-fill-grad)"
            />
            {/* Animated highlight streak */}
            <path
              d={`M ${neckX} ${neckY} Q ${streamCX} ${streamCY} ${streamEndX} ${streamEndY}`}
              fill="none"
              stroke="rgba(255,248,190,0.65)"
              strokeWidth={hw * 0.7}
              strokeLinecap="round"
              className="bc-stream-anim"
            />
            {/* Splash at landing point */}
            <ellipse
              cx={streamEndX}
              cy={streamEndY}
              rx={hw * 3.5}
              ry={2.5}
              fill="rgba(255,220,80,0.5)"
              clipPath="url(#bc-clip)"
            />
          </>
        )}

        {/* Rising bubbles when actively pouring */}
        {showStream && fillPct > 2 && (
          <>
            {([
              { cx: GLASS_CX - 9, r: 2.2, dur: "0.9s", delay: "0s" },
              { cx: GLASS_CX + 4,  r: 1.6, dur: "1.1s", delay: "0.28s" },
              { cx: GLASS_CX - 2,  r: 2.5, dur: "0.75s", delay: "0.12s" },
              { cx: GLASS_CX + 11, r: 1.4, dur: "1.0s",  delay: "0.45s" },
            ] as const).map((b, i) => (
              <circle
                key={i}
                clipPath="url(#bc-clip)"
                cx={b.cx}
                cy={beerTop - 3}
                r={b.r}
                fill="rgba(255,255,255,0.72)"
                style={{
                  animation: `bc-bubble ${b.dur} ease-out infinite`,
                  animationDelay: b.delay,
                }}
              />
            ))}
          </>
        )}

        {/* ── BOTTLE ── */}
        <g transform={`rotate(${angle}, ${bx}, ${by})`}>
          {/* Bottle body */}
          <path
            d={`
              M ${bx - 20} ${by - 8}
              L ${bx - 21} ${by - 67}
              Q ${bx - 21} ${by - 81} ${bx - 14} ${by - 88}
              L ${bx - 11} ${by - 95}
              L ${bx - 11} ${by - 123}
              Q ${bx - 8}  ${by - 130} ${bx}      ${by - 130}
              Q ${bx + 8}  ${by - 130} ${bx + 11} ${by - 123}
              L ${bx + 11} ${by - 95}
              L ${bx + 14} ${by - 88}
              Q ${bx + 21} ${by - 81} ${bx + 21} ${by - 67}
              L ${bx + 20} ${by - 8}
              L ${bx + 20} ${by}
              L ${bx - 20} ${by}
              Z
            `}
            fill="url(#bc-bottle-grad)"
            stroke="#2A1005"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Label */}
          <rect
            x={bx - 15} y={by - 80}
            width="30" height="39"
            rx="5"
            fill="#EDE8D6"
            stroke="#B09050"
            strokeWidth="0.9"
          />

          {/* Body highlight */}
          <path
            d={`M ${bx + 14} ${by - 18} Q ${bx + 16} ${by - 58} ${bx + 13} ${by - 85}`}
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Neck highlight */}
          <path
            d={`M ${bx + 7} ${by - 99} L ${bx + 7} ${by - 125}`}
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Bottle cap */}
          <path
            d={`M ${bx - 9} ${by - 130} L ${bx - 8} ${by - 139} Q ${bx} ${by - 142} ${bx + 8} ${by - 139} L ${bx + 9} ${by - 130} Z`}
            fill="#B03020"
            stroke="#801810"
            strokeWidth="1"
          />
          {/* Cap sheen */}
          <line
            x1={bx - 6} y1={by - 131}
            x2={bx - 3} y2={by - 138}
            stroke="rgba(255,140,120,0.38)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>

        {/* Drag hint arrow (shown only when angle is near 0) */}
        {angle < 8 && (
          <g opacity={0.5}>
            <path
              d={`M ${bx + 32} ${by - 69} Q ${bx + 63} ${by - 57} ${bx + 60} ${by - 32}`}
              fill="none"
              stroke="#F5A623"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
            <polygon
              points={`${bx + 58},${by - 25} ${bx + 52},${by - 37} ${bx + 65},${by - 34}`}
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
