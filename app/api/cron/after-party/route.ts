import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { searchRestaurants } from "@/lib/hotpepper";
import { callGemini } from "@/lib/gemini";
import { sendLineMessage } from "@/lib/line";

// Vercel Cron Jobs - 毎時実行（vercel.jsonで設定）
export async function GET(req: NextRequest) {
  // Cronシークレット認証
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminFirestore();
    const now = new Date();

    // 進行中パーティーのうち、開始90分後のものを取得
    const snapshot = await db
      .collection("parties")
      .where("status", "==", "ongoing")
      .get();

    let notified = 0;

    for (const doc of snapshot.docs) {
      const party = doc.data();
      const partyDateTime = new Date(`${party.date}T${party.time}:00`);
      const minutesSinceStart = (now.getTime() - partyDateTime.getTime()) / 60000;

      // 90〜100分後（Cronの誤差を考慮して10分幅）
      if (minutesSinceStart < 90 || minutesSinceStart > 100) continue;

      // 2次会候補を検索（バー・カラオケ・クラブ）
      const afterPartyGenres = [
        { code: "G005", name: "バー" },
        { code: "G009", name: "カラオケ" },
      ];

      const allRestaurants = [];
      for (const genre of afterPartyGenres) {
        const results = await searchRestaurants({
          area: party.area,
          count: 3,
          genre: genre.code,
        });
        allRestaurants.push(...results);
      }

      if (allRestaurants.length === 0) continue;

      // Geminiで2次会提案文を生成
      const prompt = `飲み会が盛り上がっています！2次会の提案をしてください。
エリア: ${party.area}
人数: ${party.headcount}名

2次会候補:
${allRestaurants.slice(0, 5).map((r, i) => `${i + 1}. ${r.name} (${r.genre}) - ${r.budget}`).join("\n")}

参加者を盛り上げる楽しい2次会提案メッセージを200字以内で書いてください。絵文字を使ってください。`;

      const geminiText = await callGemini(prompt);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const message = {
        type: "text",
        text: `🎉 2次会タイム！\n\n${geminiText}\n\n詳細はこちら👇\n${appUrl}/party/${party.partyId}`,
      };

      // 参加者全員に通知
      const lineUsers: string[] = (party.participants ?? [])
        .filter((p: { lineUserId?: string }) => p.lineUserId)
        .map((p: { lineUserId: string }) => p.lineUserId);

      for (const userId of lineUsers) {
        await sendLineMessage(userId, [message]);
      }

      // 通知済みフラグを更新
      await db.collection("parties").doc(party.partyId).update({
        afterPartyNotifiedAt: now.toISOString(),
      });

      notified++;
    }

    return NextResponse.json({ ok: true, notified });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
