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
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #fffbf5 0%, #fef3e2 100%)" }}>
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
                <h2 className="text-base font-bold text-gray-800 mb-3">👑 ベストショット</h2>
                <div className="relative rounded-3xl overflow-hidden shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bestShot.storageUrl}
                    alt="ベストショット"
                    className="w-full object-cover"
                    style={{ maxHeight: "300px" }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <span className="text-white font-bold text-lg">
                      ❤️ {bestShot.likeCount}いいね
                    </span>
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
