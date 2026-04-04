"use client";

import { useState, useEffect, use } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { Photo } from "@/types/party";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";

interface PageProps {
  params: Promise<{ partyId: string }>;
}

function getUserId(): string {
  if (typeof window === "undefined") return "";
  let uid = localStorage.getItem("kanpai_uid");
  if (!uid) {
    uid = uuidv4();
    localStorage.setItem("kanpai_uid", uid);
  }
  return uid;
}

export default function AlbumPage({ params }: PageProps) {
  const { partyId } = use(params);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const userId = typeof window !== "undefined" ? getUserId() : "";

  // Firestoreリアルタイム購読
  useEffect(() => {
    const q = query(
      collection(db, "parties", partyId, "photos"),
      orderBy("uploadedAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setPhotos(snapshot.docs.map((d) => d.data() as Photo));
    });

    return () => unsub();
  }, [partyId]);

  const handleLike = async (photo: Photo) => {
    if (votingId) return;
    setVotingId(photo.id);

    try {
      await fetch(`/api/party/${partyId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: photo.id, userId }),
      });
    } finally {
      setVotingId(null);
    }
  };

  const handleDelete = async (photo: Photo) => {
    if (!confirm("この写真を削除しますか？")) return;
    setDeletingId(photo.id);
    try {
      const res = await fetch(`/api/party/${partyId}/photos/${photo.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "削除に失敗しました");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const bestShot = photos.reduce<Photo | null>(
    (best, p) => (!best || p.likeCount > best.likeCount ? p : best),
    null
  );

  return (
    <div className="min-h-dvh" style={{ background: "linear-gradient(135deg, #fffbf5 0%, #fef3e2 100%)" }}>
      <header className="bg-white border-b border-amber-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href={`/party/${partyId}`} className="text-amber-600 text-2xl">←</Link>
          <h1 className="text-lg font-bold text-gray-800">📸 アルバム</h1>
          <Link
            href={`/party/${partyId}/camera`}
            className="px-3 py-1.5 bg-amber-500 text-white text-sm font-bold rounded-full"
          >
            撮影
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {photos.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📷</div>
            <p className="text-gray-500 mb-6">まだ写真がありません</p>
            <Link
              href={`/party/${partyId}/camera`}
              className="px-6 py-3 rounded-2xl text-white font-bold"
              style={{ background: "linear-gradient(135deg, #F5A623 0%, #E8850A 100%)" }}
            >
              最初の1枚を撮る
            </Link>
          </div>
        ) : (
          <>
            {/* ベストショット */}
            {bestShot && bestShot.likeCount > 0 && (
              <section className="mb-6">
                <style>{`
                  @keyframes best-spin-border {
                    to { transform: rotate(360deg); }
                  }
                  @keyframes best-sparkle-big {
                    0%, 100% { opacity: 0; transform: scale(0.1) rotate(0deg); }
                    40%, 60% { opacity: 1; transform: scale(1) rotate(180deg); }
                  }
                  @keyframes best-sparkle-small {
                    0%, 100% { opacity: 0; transform: scale(0) rotate(45deg); }
                    35%, 65% { opacity: 0.9; transform: scale(1) rotate(225deg); }
                  }
                  @keyframes best-shimmer {
                    0%   { transform: translateX(-220%) skewX(-22deg); }
                    100% { transform: translateX(500%) skewX(-22deg); }
                  }
                  @keyframes best-glow-pulse {
                    0%, 100% { box-shadow: 0 0 30px rgba(245,166,35,0.5), 0 0 70px rgba(245,166,35,0.2); }
                    50%       { box-shadow: 0 0 55px rgba(255,215,0,0.85), 0 0 110px rgba(255,215,0,0.45); }
                  }
                  @keyframes best-float-star {
                    0%   { opacity: 0.9; transform: translateY(0) scale(1); }
                    100% { opacity: 0;   transform: translateY(-55px) scale(0.2); }
                  }
                `}</style>

                <h2 className="text-base font-bold text-gray-800 mb-4">👑 ベストショット</h2>

                {/* 全体グロー */}
                <div style={{ filter: "drop-shadow(0 0 22px rgba(255,200,50,0.65))" }}>

                  {/* スパークル層（overflow の外） */}
                  <div className="relative mx-2">
                    {([
                      { s: { top: "-14px", left: "8%"  }, sym: "✦", size: 24, dur: "2.1s", delay: "0s"    },
                      { s: { top: "-18px", left: "28%" }, sym: "✧", size: 18, dur: "2.5s", delay: "0.4s"  },
                      { s: { top: "-16px", left: "50%" }, sym: "✦", size: 28, dur: "2.0s", delay: "0.9s"  },
                      { s: { top: "-18px", right:"28%" }, sym: "✧", size: 18, dur: "2.4s", delay: "0.25s" },
                      { s: { top: "-14px", right:"8%"  }, sym: "✦", size: 22, dur: "2.2s", delay: "1.2s"  },
                      { s: { top: "18%",   right:"-14px"}, sym:"✧", size: 17, dur: "2.3s", delay: "0.6s"  },
                      { s: { top: "45%",   right:"-18px"}, sym:"✦", size: 25, dur: "2.1s", delay: "1.5s"  },
                      { s: { top: "70%",   right:"-14px"}, sym:"✧", size: 16, dur: "2.6s", delay: "0.3s"  },
                      { s: { bottom:"-14px",right:"8%" }, sym: "✦", size: 22, dur: "2.0s", delay: "1.0s"  },
                      { s: { bottom:"-18px",right:"28%"}, sym: "✧", size: 18, dur: "2.4s", delay: "1.7s"  },
                      { s: { bottom:"-16px",left:"50%" }, sym: "✦", size: 28, dur: "2.2s", delay: "0.5s"  },
                      { s: { bottom:"-18px",left:"25%" }, sym: "✧", size: 18, dur: "2.5s", delay: "1.3s"  },
                      { s: { bottom:"-14px",left:"8%"  }, sym: "✦", size: 22, dur: "2.1s", delay: "1.9s"  },
                      { s: { top: "68%",   left:"-14px"}, sym: "✧", size: 16, dur: "2.3s", delay: "0.7s"  },
                      { s: { top: "42%",   left:"-18px"}, sym: "✦", size: 25, dur: "2.0s", delay: "1.4s"  },
                      { s: { top: "16%",   left:"-14px"}, sym: "✧", size: 17, dur: "2.6s", delay: "0.1s"  },
                      // 浮き上がる流れ星
                      { s: { top: "20%",   left:"18%"  }, sym: "★", size: 11, dur: "1.8s", delay: "0.8s", anim: "best-float-star" },
                      { s: { top: "30%",   right:"22%" }, sym: "★", size: 9,  dur: "1.6s", delay: "1.1s", anim: "best-float-star" },
                      { s: { top: "55%",   left:"38%"  }, sym: "★", size: 10, dur: "2.0s", delay: "0.35s",anim: "best-float-star" },
                    ] as Array<{ s: Record<string,string>; sym: string; size: number; dur: string; delay: string; anim?: string }>
                    ).map((item, i) => (
                      <div
                        key={i}
                        className="absolute pointer-events-none z-20 leading-none select-none"
                        style={{
                          ...item.s,
                          fontSize: item.size,
                          color: i % 3 === 0 ? "#FFD700" : i % 3 === 1 ? "#FFA500" : "#FFFACD",
                          animation: `${item.anim ?? (item.size >= 22 ? "best-sparkle-big" : "best-sparkle-small")} ${item.dur} ease-in-out infinite`,
                          animationDelay: item.delay,
                          textShadow: "0 0 8px rgba(255,215,0,0.9)",
                        }}
                      >
                        {item.sym}
                      </div>
                    ))}

                    {/* 回転グラデーションボーダー */}
                    <div className="relative rounded-3xl overflow-hidden" style={{ padding: "3px" }}>
                      <div className="absolute inset-0 overflow-hidden rounded-3xl">
                        <div
                          className="absolute"
                          style={{
                            width: "300%", height: "300%",
                            top: "-100%", left: "-100%",
                            background: "conic-gradient(from 0deg, #FFD700, #FFA500, #FF8C00, #FFE066, #FFFACD, #FFD700, #FFA500, #FF6B00, #FFD700)",
                            animation: "best-spin-border 3s linear infinite",
                          }}
                        />
                      </div>

                      {/* 写真本体 */}
                      <div
                        className="relative rounded-[22px] overflow-hidden"
                        style={{ animation: "best-glow-pulse 2.5s ease-in-out infinite" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={bestShot.storageUrl}
                          alt="ベストショット"
                          className="w-full object-cover"
                          style={{ maxHeight: "300px" }}
                        />
                        {/* シマー（光の流れ） */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: "linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.38) 50%, transparent 62%)",
                            animation: "best-shimmer 3.5s ease-in-out infinite",
                            animationDelay: "0.8s",
                          }}
                        />
                        {/* 下グラデ＋いいね数 */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                          <span className="text-white font-bold text-lg drop-shadow">
                            ❤️ {bestShot.likeCount}いいね
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 写真グリッド */}
            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">
                全ての写真 ({photos.length}枚)
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {photos.map((photo) => {
                  const isLiked = photo.likes?.[userId] === true;
                  const isBest = bestShot?.id === photo.id && photo.likeCount > 0;

                  return (
                    <div key={photo.id} className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.storageUrl}
                        alt="飲み会の写真"
                        className="w-full h-full object-cover"
                      />
                      {isBest && (
                        <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          👑 BEST
                        </div>
                      )}
                      {/* 自分の投稿のみ削除ボタン表示 */}
                      {photo.uploadedBy === userId && (
                        <button
                          onClick={() => handleDelete(photo)}
                          disabled={deletingId === photo.id}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs disabled:opacity-50"
                          style={{ background: "rgba(0,0,0,0.6)", color: "white" }}
                        >
                          {deletingId === photo.id ? "…" : "✕"}
                        </button>
                      )}
                      <button
                        onClick={() => handleLike(photo)}
                        disabled={votingId === photo.id}
                        className="absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm font-bold transition-all active:scale-95"
                        style={{
                          background: isLiked
                            ? "rgba(239,68,68,0.9)"
                            : "rgba(0,0,0,0.5)",
                          color: "white",
                        }}
                      >
                        {isLiked ? "❤️" : "🤍"} {photo.likeCount}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
