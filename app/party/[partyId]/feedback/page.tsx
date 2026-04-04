"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import StarRating from "@/app/components/StarRating";
import Link from "next/link";

interface PageProps {
  params: Promise<{ partyId: string }>;
}

export default function FeedbackPage({ params }: PageProps) {
  const { partyId } = use(params);
  const router = useRouter();
  const [scores, setScores] = useState({
    restaurantScore: 0,
    atmosphereScore: 0,
    organizerScore: 0,
  });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scores.restaurantScore || !scores.atmosphereScore || !scores.organizerScore) {
      alert("すべての評価を入力してください");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyId, ...scores, comment }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "送信に失敗しました");
        return;
      }

      setDone(true);
      setTimeout(() => router.push(`/party/${partyId}`), 2500);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div
        className="min-h-dvh flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #fffbf5 0%, #fef3e2 100%)" }}
      >
        <div className="text-center animate-fade-in-up">
          <div className="text-6xl mb-4">🙏</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">フィードバックありがとう！</h2>
          <p className="text-gray-500">次回の飲み会に活かします</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh" style={{ background: "linear-gradient(135deg, #fffbf5 0%, #fef3e2 100%)" }}>
      <header className="bg-white border-b border-amber-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href={`/party/${partyId}`} className="text-amber-600 text-2xl">←</Link>
          <h1 className="text-lg font-bold text-gray-800">📝 フィードバック</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <p className="text-sm text-amber-800">
              🤖 フィードバックはAIの学習に使われます。次回のお店提案がより精度高くなります！
            </p>
          </div>

          <section className="bg-white rounded-3xl shadow-sm p-6 flex flex-col gap-5">
            <StarRating
              label="🍽 お店・料理の満足度"
              value={scores.restaurantScore}
              onChange={(v) => setScores({ ...scores, restaurantScore: v })}
            />
            <StarRating
              label="🎉 雰囲気・盛り上がり度"
              value={scores.atmosphereScore}
              onChange={(v) => setScores({ ...scores, atmosphereScore: v })}
            />
            <StarRating
              label="👑 幹事の仕切り評価"
              value={scores.organizerScore}
              onChange={(v) => setScores({ ...scores, organizerScore: v })}
            />
          </section>

          <section className="bg-white rounded-3xl shadow-sm p-6">
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              コメント（自由記入）
            </label>
            <textarea
              placeholder="例：個室が良かった、次回は焼肉がいい、量が少なかった…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-95 disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #F5A623 0%, #E8850A 100%)",
              boxShadow: "0 4px 15px rgba(245, 166, 35, 0.3)",
            }}
          >
            {submitting ? "送信中..." : "✅ フィードバックを送る"}
          </button>
        </form>
      </main>
    </div>
  );
}
