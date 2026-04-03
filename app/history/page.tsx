"use client";

import { useState, useEffect } from "react";
import { Party } from "@/types/party";
import Link from "next/link";

export default function HistoryPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // localStorageから過去のpartyIdを取得
    const stored = localStorage.getItem("kanpai_history");
    const ids: string[] = stored ? JSON.parse(stored) : [];

    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    // 各パーティーの情報を取得
    Promise.all(
      ids.map((id) =>
        fetch(`/api/party/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      setParties(results.filter(Boolean) as Party[]);
      setLoading(false);
    });
  }, []);

  const STATUS_LABELS: Record<string, string> = {
    planning: "🗓 プランニング中",
    reserved: "✅ 予約済み",
    ongoing: "🍺 開催中",
    done: "🎊 終了",
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #fffbf5 0%, #fef3e2 100%)" }}>
      <header className="bg-white border-b border-amber-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="text-amber-600 text-2xl">←</Link>
          <h1 className="text-lg font-bold text-gray-800">🍺 過去の飲み会</h1>
          <div className="w-8" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20">
            <div className="text-4xl animate-bounce">🍺</div>
          </div>
        ) : parties.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-500 mb-6">まだ飲み会の記録がありません</p>
            <Link
              href="/"
              className="px-6 py-3 rounded-2xl text-white font-bold"
              style={{ background: "linear-gradient(135deg, #F5A623 0%, #E8850A 100%)" }}
            >
              飲み会を立ち上げる
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {parties
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((party) => (
                <Link
                  key={party.partyId}
                  href={`/party/${party.partyId}`}
                  className="block bg-white rounded-3xl shadow-sm p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-bold text-gray-800 text-base">
                        {party.area}の飲み会
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {party.date} {party.time} · {party.headcount}名
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                      {STATUS_LABELS[party.status]}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>👥 {party.participants.length}名参加</span>
                    <span>💰 {party.budget.toLocaleString()}円/人</span>
                    {party.selectedRestaurant && (
                      <span className="text-amber-600 font-medium truncate">
                        🍽 {party.selectedRestaurant.name}
                      </span>
                    )}
                  </div>

                  {/* アルバムリンク */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      📸 アルバムを見る →
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        )}
      </main>
    </div>
  );
}
