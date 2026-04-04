"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Party } from "@/types/party";

interface PageProps {
  params: Promise<{ partyId: string }>;
}

export default function JoinPage({ params }: PageProps) {
  const { partyId } = use(params);
  const router = useRouter();
  const [party, setParty] = useState<Party | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    fetch(`/api/party/${partyId}`)
      .then((r) => r.json())
      .then(setParty)
      .finally(() => setFetching(false));
  }, [partyId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/party/${partyId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "参加登録に失敗しました");
        return;
      }

      setJoined(true);
      setTimeout(() => router.push(`/party/${partyId}`), 2000);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "linear-gradient(135deg, #fffbf5 0%, #fef3e2 100%)" }}>
        <div className="text-4xl animate-bounce">🍺</div>
      </div>
    );
  }

  if (!party) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="text-gray-500">パーティーが見つかりません</p>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "linear-gradient(135deg, #fffbf5 0%, #fef3e2 100%)" }}>
        <div className="text-center animate-fade-in-up">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">参加登録完了！</h2>
          <p className="text-gray-500">飲み会ページに移動します...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh" style={{ background: "linear-gradient(135deg, #fffbf5 0%, #fef3e2 100%)" }}>
      <div className="max-w-md mx-auto px-4 py-12">
        {/* タイトル */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍺</div>
          <h1 className="text-2xl font-bold text-amber-700">飲み会に参加する</h1>
        </div>

        {/* 飲み会情報 */}
        <div className="bg-white rounded-3xl shadow-sm p-5 mb-6">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">幹事</span>
              <span className="font-medium text-gray-800">{party.organizer.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">日時</span>
              <span className="font-medium text-gray-800">{party.date} {party.time}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">エリア</span>
              <span className="font-medium text-gray-800">{party.area}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">予算/人</span>
              <span className="font-medium text-gray-800">{party.budget.toLocaleString()}円</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">現在の参加者</span>
              <span className="font-medium text-gray-800">{party.participants.length}名</span>
            </div>
          </div>
        </div>

        {/* 参加フォーム */}
        <form onSubmit={handleJoin} className="bg-white rounded-3xl shadow-sm p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">
              お名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例：鈴木花子"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl text-white text-lg font-bold transition-all active:scale-95 disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #F5A623 0%, #E8850A 100%)",
              boxShadow: "0 4px 15px rgba(245, 166, 35, 0.4)",
            }}
          >
            {loading ? "登録中..." : "🎉 参加する！"}
          </button>
        </form>
      </div>
    </div>
  );
}
