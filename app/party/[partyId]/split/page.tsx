"use client";

import { useState, use, useEffect } from "react";
import { Party, SplitResult } from "@/types/party";
import Link from "next/link";

interface PageProps {
  params: Promise<{ partyId: string }>;
}

interface SplitParticipant {
  id: string;
  name: string;
  note: string;
}

export default function SplitPage({ params }: PageProps) {
  const { partyId } = use(params);
  const [party, setParty] = useState<Party | null>(null);
  const [fetching, setFetching] = useState(true);
  const [totalAmount, setTotalAmount] = useState("");
  const [splitParticipants, setSplitParticipants] = useState<SplitParticipant[]>([]);
  const [results, setResults] = useState<SplitResult[]>([]);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    fetch(`/api/party/${partyId}`)
      .then((r) => r.json())
      .then((p: Party) => {
        setParty(p);
        setSplitParticipants(
          p.participants.map((pt) => ({ id: pt.id, name: pt.name, note: "" }))
        );
        if (p.splitResults?.length) {
          setResults(p.splitResults);
        }
      })
      .finally(() => setFetching(false));
  }, [partyId]);

  const handleCalculate = async () => {
    if (!totalAmount || Number(totalAmount) <= 0) {
      alert("合計金額を入力してください");
      return;
    }

    setCalculating(true);
    try {
      const res = await fetch("/api/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyId,
          totalAmount: Number(totalAmount),
          splitParticipants,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "計算に失敗しました");
        return;
      }

      setResults(data.splitResults);
    } finally {
      setCalculating(false);
    }
  };

  const updateNote = (id: string, note: string) => {
    setSplitParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, note } : p))
    );
  };

  if (fetching) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "linear-gradient(135deg, #fffbf5 0%, #fef3e2 100%)" }}>
        <div className="text-4xl animate-bounce">🍺</div>
      </div>
    );
  }

  const total = results.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="min-h-dvh" style={{ background: "linear-gradient(135deg, #fffbf5 0%, #fef3e2 100%)" }}>
      <header className="bg-white border-b border-amber-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href={`/party/${partyId}`} className="text-amber-600 text-2xl">←</Link>
          <h1 className="text-lg font-bold text-gray-800">💴 割り勘計算</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
        {/* 合計金額入力 */}
        <section className="bg-white rounded-3xl shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">合計金額</h2>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="50000"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <span className="text-gray-500 font-medium">円</span>
          </div>
        </section>

        {/* 参加者と事情 */}
        <section className="bg-white rounded-3xl shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">参加者の事情（任意）</h2>
          <p className="text-xs text-gray-400 mb-4">
            「早退した」「ソフドリのみ」「誕生日」「たくさん飲んだ」など自由に書いてください。AIが内容を考慮して負担額を割り振ります
          </p>
          <div className="flex flex-col gap-3">
            {splitParticipants.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-20 text-sm font-medium text-gray-700 flex-shrink-0 truncate">
                  {p.name}
                </span>
                <input
                  type="text"
                  placeholder="例: 早退した"
                  value={p.note}
                  onChange={(e) => updateNote(p.id, e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            ))}
          </div>
        </section>

        {/* 計算ボタン */}
        <button
          onClick={handleCalculate}
          disabled={calculating || !totalAmount}
          className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-95 disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #F5A623 0%, #E8850A 100%)",
            boxShadow: "0 4px 15px rgba(245, 166, 35, 0.3)",
          }}
        >
          {calculating ? "🤖 AIが計算中..." : "💴 割り勘を計算する"}
        </button>

        {/* 結果 */}
        {results.length > 0 && (
          <section className="bg-white rounded-3xl shadow-sm p-6 animate-fade-in-up">
            <h2 className="text-base font-bold text-gray-800 mb-4">💰 割り勘結果</h2>
            <div className="flex flex-col gap-3">
              {results.map((r) => (
                <div
                  key={r.participantId}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-800">{r.name}</p>
                    {r.note && (
                      <p className="text-xs text-gray-400 mt-0.5">{r.note}</p>
                    )}
                  </div>
                  <span className="text-xl font-bold text-amber-700">
                    {r.amount.toLocaleString()}円
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm text-gray-500">合計</span>
              <span className="text-lg font-bold text-gray-800">{total.toLocaleString()}円</span>
            </div>

            {/* 共有テキスト */}
            <button
              onClick={() => {
                const text = results
                  .map((r) => `${r.name}: ${r.amount.toLocaleString()}円${r.note ? ` (${r.note})` : ""}`)
                  .join("\n");
                navigator.clipboard.writeText(`💴 割り勘結果\n合計: ${total.toLocaleString()}円\n\n${text}`);
                alert("コピーしました！");
              }}
              className="mt-4 w-full py-3 border border-amber-300 text-amber-700 rounded-2xl text-sm font-medium hover:bg-amber-50 transition-colors"
            >
              📋 結果をコピーする
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
