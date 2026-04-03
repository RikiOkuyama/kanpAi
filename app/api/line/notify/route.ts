import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { sendLineMessage, buildRestaurantFlexMessage } from "@/lib/line";

export async function POST(req: NextRequest) {
  try {
    const { partyId, type } = await req.json();
    if (!partyId) {
      return NextResponse.json({ error: "partyIdが必要です" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const doc = await db.collection("parties").doc(partyId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "パーティーが見つかりません" }, { status: 404 });
    }

    const party = doc.data()!;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

    // 通知対象: lineUserIdを持つ参加者全員
    const lineUsers: string[] = (party.participants ?? [])
      .filter((p: { lineUserId?: string }) => p.lineUserId)
      .map((p: { lineUserId: string }) => p.lineUserId);

    if (type === "restaurant_selected") {
      if (!party.selectedRestaurant) {
        return NextResponse.json({ error: "お店が選択されていません" }, { status: 400 });
      }

      const flexMsg = buildRestaurantFlexMessage({
        restaurantName: party.selectedRestaurant.name,
        reservationUrl: party.selectedRestaurant.urls,
        geminiComment: party.geminiMessage ?? "",
        partyDate: party.date,
        partyTime: party.time,
        headcount: party.headcount,
      });

      for (const userId of lineUsers) {
        await sendLineMessage(userId, [flexMsg]);
      }
    } else if (type === "join_reminder") {
      const joinUrl = `${appUrl}/party/${partyId}/join`;
      const message = {
        type: "text",
        text: `🍺 kanpAi\n\n「${party.area}」での飲み会に招待されています！\n\n📅 ${party.date} ${party.time}\n👥 ${party.headcount}名予定\n\n参加登録はこちら👇\n${joinUrl}`,
      };

      for (const userId of lineUsers) {
        await sendLineMessage(userId, [message]);
      }
    }

    return NextResponse.json({ ok: true, notified: lineUsers.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
