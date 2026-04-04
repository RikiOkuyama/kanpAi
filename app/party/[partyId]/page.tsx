"use client";

import { useEffect, useState, use } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { Party, Restaurant, GeminiSuggestion } from "@/types/party";
import QRCodeDisplay from "@/app/components/QRCodeDisplay";
import SwipePreview from "@/app/components/SwipePreview";
import Link from "next/link";

interface PageProps {
  params: Promise<{ partyId: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  planning:  "🗓 プランニング中",
  candidate: "🔖 予約候補選択中",
  reserved:  "✅ 予約済み",
  ongoing:   "🍺 開催中",
  done:      "🎊 終了",
};

export default function PartyPage({ params }: PageProps) {
  const { partyId } = use(params);
  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchingRestaurants, setSearchingRestaurants] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [beRealBanner, setBeRealBanner] = useState(false);

  const appUrl = typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? "";
  const joinUrl = `${appUrl}/party/${partyId}/join`;

  const handleSearchRestaurants = async () => {
    setSearchingRestaurants(true);
    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "お店の検索に失敗しました");
        return;
      }
      await fetchParty();
    } finally {
      setSearchingRestaurants(false);
    }
  };

  const fetchParty = async () => {
    const res = await fetch(`/api/party/${partyId}`);
    if (res.ok) {
      const data = await res.json();
      setParty(data);
      const stored = localStorage.getItem("kanpai_history");
      const ids: string[] = stored ? JSON.parse(stored) : [];
      if (!ids.includes(partyId)) {
        localStorage.setItem("kanpai_history", JSON.stringify([partyId, ...ids].slice(0, 20)));
      }
      setLoading(false);
      return data;
    }
    setLoading(false);
    return null;
  };

  // Firestoreリアルタイム監視（BeReal通知）
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "parties", partyId), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data() as Party;
      setParty(data);
      if (data.beRealActive) {
        setBeRealBanner(true);
      }
    });
    return () => unsub();
  }, [partyId]);

  useEffect(() => {
    fetchParty().then((data) => {
      // お店未検索なら自動で検索を開始
      if (data && !data.restaurants?.length) {
        handleSearchRestaurants();
      }
    });
  }, [partyId]);

  const handleSelectRestaurant = async (restaurant: Restaurant) => {
    setSelectingId(restaurant.id);
    try {
      await fetch(`/api/party/${partyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedRestaurant: restaurant,
          status: "candidate",
        }),
      });
      await fetchParty();
    } finally {
      setSelectingId(null);
    }
  };

  const handleStatusChange = async (status: string) => {
    setStatusUpdating(true);
    try {
      await fetch(`/api/party/${partyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await fetchParty();
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #fffbf5 0%, #fef3e2 100%)" }}>
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🍺</div>
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!party) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">パーティーが見つかりません</p>
      </div>
    );
  }

  const suggestion = (id: string): GeminiSuggestion | undefined =>
    party.geminiSuggestions?.find((s) => s.restaurantId === id);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #fffbf5 0%, #fef3e2 100%)" }}>
      {/* BeReal バナー */}
      {beRealBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in-up">
          <div className="bg-white rounded-3xl p-8 mx-6 text-center shadow-2xl">
            <div className="text-6xl mb-4">📸</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">今だ！</h2>
            <p className="text-gray-500 mb-6">みんなで写真撮ろう！</p>
            <div className="flex flex-col gap-3">
              <Link
                href={`/party/${partyId}/camera`}
                className="block w-full py-4 rounded-2xl text-white font-bold text-lg"
                style={{ background: "linear-gradient(135deg, #F5A623 0%, #E8850A 100%)" }}
                onClick={() => setBeRealBanner(false)}
              >
                📸 カメラを開く
              </Link>
              <button
                onClick={() => setBeRealBanner(false)}
                className="text-sm text-gray-400 py-2"
              >
                あとで
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <header className="bg-white border-b border-amber-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-amber-700">🍺 kanpAi</Link>
          <span className="text-sm font-medium px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            {STATUS_LABELS[party.status]}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* 基本情報 */}
        <section className="bg-white rounded-3xl shadow-sm p-6 animate-fade-in-up">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📋 飲み会情報</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow icon="📅" label="日時" value={`${party.date} ${party.time}`} />
            <InfoRow icon="📍" label="エリア" value={party.area} />
            <InfoRow icon="👥" label="人数" value={`${party.headcount}名（参加者${party.participants.length}名）`} />
            <InfoRow icon="💰" label="予算/人" value={`${party.budget.toLocaleString()}円`} />
            <InfoRow icon="👑" label="幹事" value={party.organizer.name} />
            {party.requests && (
              <div className="col-span-2">
                <InfoRow icon="📝" label="要望" value={party.requests} />
              </div>
            )}
          </div>
        </section>

        {/* QRコード・参加URL */}
        <section className="bg-white rounded-3xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🔗 参加リンク</h2>
          <div className="flex flex-col items-center gap-4">
            <QRCodeDisplay url={joinUrl} size={180} />
            <p className="text-sm text-gray-500 text-center">
              QRコードまたはURLをシェアして参加者を招待してください
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(joinUrl);
                alert("URLをコピーしました！");
              }}
              className="px-4 py-2 rounded-xl border border-amber-300 text-amber-700 text-sm font-medium hover:bg-amber-50 transition-colors"
            >
              📋 URLをコピー
            </button>
          </div>
        </section>

        {/* 参加者リスト */}
        <section className="bg-white rounded-3xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            👥 参加者 ({party.participants.length}名)
          </h2>
          <div className="flex flex-wrap gap-2">
            {party.participants.map((p) => (
              <span
                key={p.id}
                className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-sm font-medium text-amber-800"
              >
                {p.name}
                {p.lineUserId && " 💬"}
              </span>
            ))}
          </div>
        </section>

        {/* お店検索・提案 */}
        <section className="bg-white rounded-3xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🍽 お店の提案</h2>

          {party.geminiMessage && (
            <div className="mb-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <p className="text-sm text-amber-800">🤖 {party.geminiMessage}</p>
            </div>
          )}

          {!party.restaurants?.length ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="text-4xl animate-bounce">🔍</div>
              <p className="font-bold text-gray-700">AIがお店を探しています...</p>
              <p className="text-sm text-gray-400">しばらくお待ちください</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* スワイプで選ぶ */}
              <div className="rounded-3xl overflow-hidden border border-purple-100 bg-white shadow-sm">
                <SwipePreview />
                <Link
                  href={`/party/${partyId}/swipe`}
                  className="block w-full py-4 text-center text-white font-bold text-base"
                  style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)" }}
                >
                  👆 スワイプでお店を選ぶ
                </Link>
                <Link
                  href={`/party/${partyId}/swipe?view=results`}
                  className="block w-full py-3.5 text-center text-amber-700 font-bold text-base border-t border-purple-100 hover:bg-amber-50 transition-colors"
                >
                  🗳 みんなの投票結果を見る
                </Link>
              </div>

              {party.selectedRestaurant && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl mb-2 flex flex-col gap-3">
                  <div>
                    <p className="text-xs font-bold text-blue-600 mb-1">🔖 予約候補</p>
                    <p className="font-bold text-gray-800">{party.selectedRestaurant.name}</p>
                  </div>
                  {party.status !== "reserved" && (
                    <button
                      onClick={async () => {
                        await fetch(`/api/party/${partyId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "reserved" }),
                        });
                        await fetchParty();
                      }}
                      className="w-full py-2.5 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors"
                    >
                      ✅ 予約済みにする
                    </button>
                  )}
                  {party.status === "reserved" && (
                    <p className="text-sm font-bold text-green-600">✅ 予約済み</p>
                  )}
                </div>
              )}

              {party.restaurants.map((r) => {
                const sg = suggestion(r.id);
                const isSelected = party.selectedRestaurant?.id === r.id;
                const isSuggested = !!sg;

                return (
                  <div
                    key={r.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? "border-green-400 bg-green-50"
                        : isSuggested
                        ? "border-amber-300 bg-amber-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex gap-3">
                      {r.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.imageUrl}
                          alt={r.name}
                          className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-gray-800 text-base leading-tight">{r.name}</p>
                          {isSuggested && !isSelected && (
                            <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                              AIオススメ
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                              選択中
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{r.genre} · {r.budget}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{r.access}</p>
                        {sg && (
                          <p className="text-xs text-amber-700 mt-1.5 bg-amber-50 px-2 py-1 rounded-lg">
                            💡 {sg.reason}
                          </p>
                        )}
                      </div>
                    </div>

                    {!isSelected && (
                      <div className="flex gap-2 mt-3">
                        <a
                          href={r.urls}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 text-center text-sm border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          詳細を見る
                        </a>
                        <button
                          onClick={() => handleSelectRestaurant(r)}
                          disabled={selectingId === r.id}
                          className="flex-1 py-2 text-sm rounded-xl text-white font-medium transition-colors disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #F5A623 0%, #E8850A 100%)" }}
                        >
                          {selectingId === r.id ? "選択中..." : "このお店に決める"}
                        </button>
                      </div>
                    )}

                    {isSelected && (
                      <div className="flex gap-2 mt-3">
                        <a
                          href={r.urls}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 text-center text-sm bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
                        >
                          予約ページを開く
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                onClick={handleSearchRestaurants}
                disabled={searchingRestaurants}
                className="w-full py-3 border border-amber-300 text-amber-700 rounded-2xl text-sm font-medium hover:bg-amber-50 transition-colors disabled:opacity-50"
              >
                {searchingRestaurants ? "検索中..." : "🔄 再検索する"}
              </button>
            </div>
          )}
        </section>

        {/* ステータス管理 */}
        <section className="bg-white rounded-3xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">⚙️ ステータス管理</h2>
          <div className="grid grid-cols-2 gap-3">
            {["planning", "candidate", "reserved", "ongoing", "done"].map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={party.status === s || statusUpdating}
                className={`py-3 rounded-xl text-sm font-medium transition-all ${
                  party.status === s
                    ? "bg-amber-500 text-white"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                } disabled:opacity-50`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </section>

        {/* アクションボタン */}
        <section className="flex flex-col gap-3">
          <Link
            href={`/party/${partyId}/camera`}
            className="block w-full py-4 text-center rounded-2xl text-white font-bold text-base transition-colors"
            style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #333 100%)" }}
          >
            📸 写真を撮る
          </Link>
          <Link
            href={`/party/${partyId}/album`}
            className="block w-full py-4 text-center rounded-2xl bg-white border border-gray-200 text-gray-700 font-bold text-base hover:bg-gray-50 transition-colors"
          >
            🖼 アルバムを見る
          </Link>
          <Link
            href={`/party/${partyId}/split`}
            className="block w-full py-4 text-center rounded-2xl bg-white border border-amber-300 text-amber-700 font-bold text-base hover:bg-amber-50 transition-colors"
          >
            💴 割り勘を計算する
          </Link>
          <Link
            href={`/party/${partyId}/feedback`}
            className="block w-full py-4 text-center rounded-2xl bg-white border border-gray-200 text-gray-600 font-bold text-base hover:bg-gray-50 transition-colors"
          >
            📝 フィードバックを送る
          </Link>
        </section>
      </main>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex gap-2 items-start">
      <span className="text-base flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-700">{value}</p>
      </div>
    </div>
  );
}
