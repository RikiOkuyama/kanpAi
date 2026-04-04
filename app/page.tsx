"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BeerSlider from "./components/BeerSlider";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: "",
    time: "19:00",
    area: "",
    headcount: 10,
    budget: 4000,
    requests: "",
    organizerName: "",
    organizerLineUserId: "",
  });

  const [loadingStep, setLoadingStep] = useState<"party" | "restaurants" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoadingStep("party");

    try {
      // Step 1: パーティ作成
      const res = await fetch("/api/party", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "エラーが発生しました");
        return;
      }

      const { partyId } = await res.json();

      // Step 2: AIでお店を検索
      setLoadingStep("restaurants");
      await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyId }),
      });

      router.push(`/party/${partyId}`);
    } finally {
      setLoading(false);
      setLoadingStep(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #fffbf5 0%, #fef3e2 100%)" }}>
      {/* ヘッダー */}
      <header className="text-center py-10 px-4">
        <div className="text-6xl mb-3">🍺</div>
        <h1 className="text-4xl font-bold text-amber-700 mb-2">kanpAi</h1>
        <p className="text-gray-600 text-lg">AIが飲み会の幹事を全部やります</p>
        <Link
          href="/history"
          className="inline-block mt-3 text-sm text-amber-600 underline underline-offset-2"
        >
          過去の飲み会を見る →
        </Link>
      </header>

      {/* フォーム */}
      <main className="max-w-lg mx-auto px-4 pb-16">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-lg p-8 flex flex-col gap-6"
        >
          {/* 幹事名 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">
              幹事のお名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例：田中太郎"
              value={form.organizerName}
              onChange={(e) => setForm({ ...form, organizerName: e.target.value })}
              className="border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* 日付・時間 */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-semibold text-gray-700">
                日付 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="flex flex-col gap-1.5 w-32">
              <label className="text-sm font-semibold text-gray-700">開始時刻</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* エリア */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">
              エリア <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例：渋谷、新宿、梅田"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              className="border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* 人数 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">
              予定人数 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={2}
                max={50}
                value={form.headcount}
                onChange={(e) => setForm({ ...form, headcount: Number(e.target.value) })}
                className="flex-1 accent-amber-500"
              />
              <span className="text-xl font-bold text-amber-700 w-16 text-right">
                {form.headcount}名
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 px-1">
              <span>2名</span><span>50名</span>
            </div>
          </div>

          {/* 予算スライダー（ビールジョッキ） */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">
              予算（1人あたり） <span className="text-red-500">*</span>
            </label>
            <BeerSlider
              value={form.budget}
              onChange={(v) => setForm({ ...form, budget: v })}
            />
          </div>

          {/* 要望 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">
              その他要望・こだわり
            </label>
            <textarea
              placeholder="例：個室希望、和食系、禁煙席、アレルギーあり（甲殻類）"
              value={form.requests}
              onChange={(e) => setForm({ ...form, requests: e.target.value })}
              rows={3}
              className="border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl text-white text-lg font-bold transition-all active:scale-95 disabled:opacity-60"
            style={{
              background: loading
                ? "#D4A853"
                : "linear-gradient(135deg, #F5A623 0%, #E8850A 100%)",
              boxShadow: "0 4px 15px rgba(245, 166, 35, 0.4)",
            }}
          >
            {loadingStep === "party" ? "🍺 飲み会を作成中..." : loadingStep === "restaurants" ? "🔍 AIがお店を探しています..." : "🎉 飲み会を立ち上げる！"}
          </button>
        </form>

        {/* フッター */}
        <p className="text-center text-xs text-gray-400 mt-6">
          お店の検索・参加者への通知・割り勘計算まで、全部AIにおまかせ！
        </p>
      </main>
    </div>
  );
}
