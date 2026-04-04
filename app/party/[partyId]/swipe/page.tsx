"use client";

import { useState, useEffect, use, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Party, Restaurant } from "@/types/party";
import { SwipeDirection } from "@/app/api/party/[partyId]/swipe/route";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";
import SwipePreview from "@/app/components/SwipePreview";

interface PageProps {
  params: Promise<{ partyId: string }>;
}

interface ScoreResult {
  restaurantId: string;
  score: number;
  upCount: number;
  rightCount: number;
  leftCount: number;
}

const SWIPE_X_THRESHOLD = 80;
const SWIPE_Y_THRESHOLD = -80;

type IndicatorType = "right" | "left" | "up" | null;

const INDICATOR_CONFIG = {
  right: { label: "行きたい！", bg: "rgba(34,197,94,0.85)", border: "#22C55E", emoji: "❤️" },
  left:  { label: "パス",       bg: "rgba(239,68,68,0.85)",  border: "#EF4444", emoji: "✕"  },
  up:    { label: "絶対行く！", bg: "rgba(245,158,11,0.85)", border: "#F59E0B", emoji: "⭐" },
};

export default function SwipePage({ params }: PageProps) {
  const { partyId } = use(params);
  const searchParams = useSearchParams();
  const viewResults = searchParams.get("view") === "results";
  const [party, setParty] = useState<Party | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [votes, setVotes] = useState<Record<string, SwipeDirection>>({});
  const [history, setHistory] = useState<Array<{ index: number; restaurantId: string; dir: SwipeDirection }>>([]);
  const [phase, setPhase] = useState<"intro" | "swipe" | "done" | "results">("intro");
  const [results, setResults] = useState<ScoreResult[]>([]);
  const [totalVoters, setTotalVoters] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(true);

  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [flyDir, setFlyDir] = useState<SwipeDirection | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  // ページを開くたびに新しいUUIDを生成 → 同デバイス複数タブでも別々に集計される
  const [userId] = useState(() => uuidv4());

  const fetchResults = useCallback(async () => {
    const res = await fetch(`/api/party/${partyId}/swipe`);
    const data = await res.json();
    setResults(data.results ?? []);
    setTotalVoters(data.totalVoters ?? 0);
    return data;
  }, [partyId]);

  useEffect(() => {
    fetch(`/api/party/${partyId}`)
      .then((r) => r.json())
      .then((p: Party) => {
        setParty(p);
        setRestaurants(p.restaurants ?? []);
      });
    if (viewResults) {
      fetchResults().then(() => setPhase("results"));
    }
  }, [partyId, viewResults, fetchResults]);

  // ヒント：最初のカードを自動で少し揺らす
  useEffect(() => {
    if (!showHint || currentIndex > 0) return;
    const t = setTimeout(() => setShowHint(false), 2200);
    return () => clearTimeout(t);
  }, [showHint, currentIndex]);

  const currentRestaurant = restaurants[currentIndex];

  const getIndicator = (dx: number, dy: number): IndicatorType => {
    if (Math.abs(dy) > Math.abs(dx) && dy < SWIPE_Y_THRESHOLD) return "up";
    if (dx > SWIPE_X_THRESHOLD) return "right";
    if (dx < -SWIPE_X_THRESHOLD) return "left";
    return null;
  };

  const indicator = getIndicator(drag.x, drag.y);
  const indicatorStrength = Math.min(
    Math.max(Math.abs(drag.x), Math.abs(drag.y)) / 120,
    1
  );

  const swipeCard = useCallback(async (dir: SwipeDirection) => {
    if (!currentRestaurant || flyDir) return;
    setShowHint(false);
    setFlyDir(dir);

    await new Promise((r) => setTimeout(r, 380));

    const newVotes = { ...votes, [currentRestaurant.id]: dir };
    setVotes(newVotes);
    setHistory((h) => [...h, { index: currentIndex, restaurantId: currentRestaurant.id, dir }]);
    setFlyDir(null);
    setDrag({ x: 0, y: 0 });

    const next = currentIndex + 1;
    setCurrentIndex(next);

    if (next >= restaurants.length) {
      setPhase("done");
    }
  }, [currentRestaurant, currentIndex, votes, restaurants.length, flyDir]);

  const handleUndo = () => {
    if (history.length === 0 || flyDir) return;
    const last = history[history.length - 1];
    const newVotes = { ...votes };
    delete newVotes[last.restaurantId];
    setVotes(newVotes);
    setHistory((h) => h.slice(0, -1));
    setCurrentIndex(last.index);
    if (phase === "done") setPhase("swipe");
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (flyDir) return;
    setShowHint(false);
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    cardRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDrag({
      x: e.clientX - startPos.current.x,
      y: e.clientY - startPos.current.y,
    });
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const dir = getIndicator(drag.x, drag.y);
    if (dir) {
      swipeCard(dir);
    } else {
      setDrag({ x: 0, y: 0 });
    }
  };

  // カードのスタイル計算
  const getFlyTransform = (dir: SwipeDirection) => {
    if (dir === "right") return "translate(160%, -30px) rotate(30deg)";
    if (dir === "left")  return "translate(-160%, -30px) rotate(-30deg)";
    if (dir === "up")    return "translateY(-140%)";
    return "";
  };

  const cardTransform = flyDir
    ? getFlyTransform(flyDir)
    : isDragging || drag.x !== 0 || drag.y !== 0
      ? `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x * 0.07}deg)`
      : showHint && currentIndex === 0
        ? undefined // ヒントアニメはCSS keyframesで
        : "translate(0,0) rotate(0deg)";

  const cardTransition = isDragging
    ? "none"
    : flyDir
      ? "transform 0.38s cubic-bezier(0.55, 0, 1, 0.45)"
      : "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch(`/api/party/${partyId}/swipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, votes }),
      });
      await fetchResults();
      setPhase("results");
    } finally {
      setSubmitting(false);
    }
  };

  // 結果画面では15秒ごとにポーリングして最新の集計を反映
  useEffect(() => {
    if (phase !== "results") return;
    const interval = setInterval(fetchResults, 15000);
    return () => clearInterval(interval);
  }, [phase, fetchResults]);

  // ローディング
  if (!party) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-4xl animate-bounce">🍺</div>
      </div>
    );
  }

  // お店未検索
  if (restaurants.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gray-900 text-white px-6">
        <div className="text-5xl">🔍</div>
        <p className="text-center text-gray-300">先にダッシュボードで「AIでお店を探す」を実行してください</p>
        <Link href={`/party/${partyId}`} className="px-6 py-3 bg-amber-500 rounded-2xl font-bold">
          ダッシュボードへ
        </Link>
      </div>
    );
  }

  // イントロ画面
  if (phase === "intro") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fffbf5 0%, #fef3e2 100%)" }}>
        <header className="bg-white border-b border-amber-100 px-4 py-4 sticky top-0 z-10">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <Link href={`/party/${partyId}`} className="text-amber-600 text-2xl">←</Link>
            <h1 className="text-lg font-bold text-gray-800">👆 スワイプでお店を選ぶ</h1>
            <span className="text-sm text-gray-400">{restaurants.length}件</span>
          </div>
        </header>
        <main className="max-w-lg mx-auto w-full px-4 py-8 flex flex-col gap-6 flex-1 justify-center">
          {/* パーティ概要 */}
          <div className="bg-white rounded-3xl shadow-sm p-5 text-center">
            <p className="text-xs text-gray-400 mb-1">{party.organizer.name}さんの飲み会</p>
            <p className="font-bold text-gray-800 text-lg">{party.date} {party.time} · {party.area}</p>
          </div>

          {/* スワイプアニメプレビュー */}
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-purple-100">
            <SwipePreview />
          </div>

          {/* スワイプ開始ボタン */}
          <button
            onClick={() => setPhase("swipe")}
            className="w-full py-5 rounded-3xl text-white font-bold text-xl transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
              boxShadow: "0 4px 20px rgba(124, 58, 237, 0.4)",
            }}
          >
            👆 スワイプを始める
          </button>

        </main>
      </div>
    );
  }

  // 結果画面
  if (phase === "results") {
    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #fffbf5 0%, #fef3e2 100%)" }}>
        <header className="bg-white border-b border-amber-100 px-4 py-4 sticky top-0 z-10">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <Link href={`/party/${partyId}`} className="text-amber-600 text-2xl">←</Link>
            <h1 className="text-lg font-bold text-gray-800">🗳 みんなの投票結果</h1>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-sm text-gray-400">{totalVoters}人投票</span>
              <span className="text-xs text-gray-300 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                自動更新中
              </span>
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
          <div className="flex gap-4 text-sm text-center">
            <div className="flex-1 bg-amber-50 rounded-2xl py-3 border border-amber-100">
              <p className="text-xl">⭐</p>
              <p className="font-bold text-amber-700">絶対行く</p>
              <p className="text-xs text-gray-400">3pt</p>
            </div>
            <div className="flex-1 bg-green-50 rounded-2xl py-3 border border-green-100">
              <p className="text-xl">❤️</p>
              <p className="font-bold text-green-700">行きたい</p>
              <p className="text-xs text-gray-400">1pt</p>
            </div>
            <div className="flex-1 bg-red-50 rounded-2xl py-3 border border-red-100">
              <p className="text-xl">✕</p>
              <p className="font-bold text-red-500">パス</p>
              <p className="text-xs text-gray-400">0pt</p>
            </div>
          </div>

          {results.map((r, i) => {
            const restaurant = restaurants.find((res) => res.id === r.restaurantId);
            if (!restaurant) return null;
            const maxScore = results[0]?.score || 1;
            const barWidth = maxScore > 0 ? Math.round((r.score / maxScore) * 100) : 0;
            const isTop = i === 0;
            const myVote = votes[r.restaurantId] as SwipeDirection | undefined;
            const MY_VOTE_LABEL: Record<SwipeDirection, string> = { up: "⭐ 絶対行く", right: "❤️ 行きたい", left: "✕ パス" };

            return (
              <div
                key={r.restaurantId}
                className={`bg-white rounded-3xl shadow-sm overflow-hidden ${isTop ? "ring-2 ring-amber-400" : ""}`}
              >
                {isTop && (
                  <div className="bg-amber-400 text-white text-center text-xs font-bold py-1.5 tracking-wider">
                    👑 みんなの第1位
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-3xl font-black text-amber-400 w-8 flex-shrink-0 leading-none mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-base leading-snug">{restaurant.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{restaurant.genre} · {restaurant.budget}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xl font-black text-amber-600">{r.score}pt</span>
                      {myVote && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-700 whitespace-nowrap">
                          あなた: {MY_VOTE_LABEL[myVote]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* スコアバー */}
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${barWidth}%`,
                        background: isTop
                          ? "linear-gradient(90deg, #F59E0B, #F5A623)"
                          : "linear-gradient(90deg, #A7F3D0, #34D399)",
                        transition: "width 0.8s ease",
                      }}
                    />
                  </div>

                  {/* 票数 */}
                  <div className="flex gap-3 text-sm">
                    <span className="flex items-center gap-1 text-amber-500 font-bold">⭐ {r.upCount}</span>
                    <span className="flex items-center gap-1 text-green-500 font-bold">❤️ {r.rightCount}</span>
                    <span className="flex items-center gap-1 text-red-400 font-bold">✕ {r.leftCount}</span>
                  </div>

                  {isTop && (
                    <div className="flex gap-2 mt-4">
                      <a
                        href={restaurant.urls}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 text-center text-sm bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 transition-colors"
                      >
                        予約ページを開く
                      </a>
                      <button
                        onClick={async () => {
                          await fetch(`/api/party/${partyId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ selectedRestaurant: restaurant, status: "candidate" }),
                          });
                          alert(`✅ ${restaurant.name} を予約済みに設定しました`);
                        }}
                        className="flex-1 py-3 text-sm border border-amber-300 text-amber-700 rounded-2xl font-bold hover:bg-amber-50 transition-colors"
                      >
                        このお店に決める
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex gap-3">
            <button
              onClick={fetchResults}
              className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-2xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              🔄 最新の結果を取得
            </button>
            <button
              onClick={() => {
                setVotes({});
                setHistory([]);
                setCurrentIndex(0);
                setPhase("intro");
              }}
              className="flex-1 py-3 border border-purple-200 text-purple-600 rounded-2xl text-sm font-medium hover:bg-purple-50 transition-colors"
            >
              👆 もう一度スワイプ
            </button>
          </div>
        </main>
      </div>
    );
  }

  // 完了画面
  if (phase === "done") {
    const upCount = Object.values(votes).filter((v) => v === "up").length;
    const rightCount = Object.values(votes).filter((v) => v === "right").length;
    const leftCount = Object.values(votes).filter((v) => v === "left").length;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 px-6 gap-6">
        <div className="text-center text-white animate-fade-in-up">
          <div className="text-7xl mb-5">🎉</div>
          <h2 className="text-3xl font-bold mb-3">スワイプ完了！</h2>
          <div className="flex gap-6 justify-center text-lg mb-2">
            <span className="text-amber-400">⭐ {upCount}</span>
            <span className="text-green-400">❤️ {rightCount}</span>
            <span className="text-red-400">✕ {leftCount}</span>
          </div>
          <p className="text-gray-400 text-sm">全{restaurants.length}軒をチェックしました</p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full max-w-xs py-5 rounded-3xl font-bold text-lg text-gray-900 disabled:opacity-50 transition-all active:scale-95"
          style={{ background: submitting ? "#aaa" : "white", boxShadow: "0 8px 30px rgba(255,255,255,0.2)" }}
        >
          {submitting ? "集計中..." : "📊 みんなの結果を見る"}
        </button>

        <button
          onClick={() => { setCurrentIndex(0); setVotes({}); setPhase("swipe"); setShowHint(true); }}
          className="text-gray-500 text-sm py-2"
        >
          最初からやり直す
        </button>
      </div>
    );
  }

  // スワイプ画面
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col select-none overflow-hidden">
      <style>{`
        @keyframes hint-wobble {
          0%   { transform: translate(0,0) rotate(0deg); }
          20%  { transform: translate(18px, -5px) rotate(5deg); }
          40%  { transform: translate(0,0) rotate(0deg); }
          60%  { transform: translate(-18px, -5px) rotate(-5deg); }
          80%  { transform: translate(0,0) rotate(0deg); }
          100% { transform: translate(0,0) rotate(0deg); }
        }
        .hint-wobble { animation: hint-wobble 2s ease-in-out; }
      `}</style>

      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4">
        <Link href={`/party/${partyId}`} className="text-white/60 text-2xl">←</Link>
        <div className="flex flex-col items-center">
          <span className="text-white font-bold text-base">{party.area}の飲み会</span>
          <span className="text-white/40 text-xs mt-0.5">{currentIndex + 1} / {restaurants.length}</span>
        </div>
        <button onClick={() => setPhase("results")} className="text-white/40 text-xs py-1 px-2">
          結果 →
        </button>
      </div>

      {/* プログレスバー */}
      <div className="mx-5 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-amber-400 rounded-full transition-all duration-500"
          style={{ width: `${(currentIndex / restaurants.length) * 100}%` }}
        />
      </div>

      {/* カードエリア */}
      <div className="flex-1 flex items-center justify-center px-5 py-4 relative">

        {/* 背景カード（次の次） */}
        {restaurants[currentIndex + 2] && (
          <div
            className="absolute w-full max-w-sm rounded-3xl bg-white/5 border border-white/10"
            style={{ transform: "scale(0.88) translateY(24px)", height: "440px" }}
          />
        )}

        {/* 背景カード（次） */}
        {restaurants[currentIndex + 1] && (
          <div
            className="absolute w-full max-w-sm rounded-3xl overflow-hidden bg-gray-800 shadow-xl"
            style={{ transform: "scale(0.94) translateY(12px)", zIndex: 0 }}
          >
            <div className="h-52 bg-gray-700" />
            <div className="p-5">
              <div className="h-4 bg-gray-600 rounded-lg w-2/3 mb-2" />
              <div className="h-3 bg-gray-700 rounded-lg w-1/2" />
            </div>
          </div>
        )}

        {/* メインカード */}
        {currentRestaurant && (
          <div
            ref={cardRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`relative w-full max-w-sm rounded-3xl overflow-hidden bg-white shadow-2xl cursor-grab active:cursor-grabbing ${showHint && currentIndex === 0 ? "hint-wobble" : ""}`}
            style={{
              transform: cardTransform,
              transition: cardTransition,
              zIndex: 1,
              touchAction: "none",
            }}
          >
            {/* 写真 */}
            <div className="relative">
              {currentRestaurant.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentRestaurant.imageUrl}
                  alt={currentRestaurant.name}
                  className="w-full h-56 object-cover pointer-events-none"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-56 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="text-6xl">🍽</span>
                </div>
              )}

              {/* スワイプインジケーター */}
              {indicator && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: INDICATOR_CONFIG[indicator].bg.replace("0.85", String(indicatorStrength * 0.5)) }}
                >
                  <div
                    className="px-5 py-2.5 rounded-2xl border-4 font-black text-white text-2xl"
                    style={{
                      borderColor: INDICATOR_CONFIG[indicator].border,
                      background: INDICATOR_CONFIG[indicator].bg,
                      opacity: Math.min(indicatorStrength * 1.5, 1),
                      transform: `scale(${0.8 + indicatorStrength * 0.3})`,
                      transition: "transform 0.1s ease",
                    }}
                  >
                    {INDICATOR_CONFIG[indicator].emoji} {INDICATOR_CONFIG[indicator].label}
                  </div>
                </div>
              )}

              {/* グラデーション */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />
            </div>

            {/* お店情報 */}
            <div className="p-5 pb-6">
              <h2 className="text-xl font-bold text-gray-900 leading-tight mb-1">
                {currentRestaurant.name}
              </h2>
              <p className="text-sm font-medium text-amber-600 mb-1">{currentRestaurant.genre}</p>
              <p className="text-sm text-gray-400 mb-3 line-clamp-1">{currentRestaurant.access}</p>

              <div className="flex flex-wrap gap-2">
                <span className="text-sm bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium">
                  💰 {currentRestaurant.budget}
                </span>
                {currentRestaurant.capacity && Number(currentRestaurant.capacity) > 0 && (
                  <span className="text-sm bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                    👥 {currentRestaurant.capacity}席
                  </span>
                )}
              </div>

              {currentRestaurant.catch && (
                <p className="text-xs text-gray-400 mt-3 line-clamp-2 leading-relaxed">
                  {currentRestaurant.catch}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ボタン操作エリア */}
      <div className="pb-10 px-5">
        {/* ガイドテキスト */}
        <div className="flex justify-between text-xs text-white/30 mb-5 px-2">
          <span>← 左スワイプでパス</span>
          <span>上スワイプで絶対行く</span>
          <span>右スワイプで行きたい →</span>
        </div>

        {/* ボタン */}
        <div className="flex items-center justify-center gap-4">
          {/* 戻る */}
          <button
            onClick={handleUndo}
            disabled={history.length === 0 || !!flyDir}
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg border-2 border-white/20 bg-white/5 hover:bg-white/15 transition-all active:scale-90 disabled:opacity-25 disabled:cursor-not-allowed"
            title="直前の選択を取り消す"
          >
            ↩️
          </button>

          {/* パス */}
          <button
            onClick={() => swipeCard("left")}
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 border-red-400/60 bg-red-400/10 hover:bg-red-400/25 transition-all active:scale-90"
          >
            ✕
          </button>

          {/* 絶対行く（大きい） */}
          <button
            onClick={() => swipeCard("up")}
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all active:scale-90"
            style={{ background: "linear-gradient(135deg, #F59E0B, #F5A623)" }}
          >
            ⭐
          </button>

          {/* 行きたい */}
          <button
            onClick={() => swipeCard("right")}
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 border-green-400/60 bg-green-400/10 hover:bg-green-400/25 transition-all active:scale-90"
          >
            ❤️
          </button>
        </div>
      </div>
    </div>
  );
}
