import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

const MAX_BEREAL = 4;
const MIN_INTERVAL_MS = 30 * 60 * 1000; // 30分
const MAX_INTERVAL_MS = 90 * 60 * 1000; // 90分
const ACTIVE_DURATION_MS = 5 * 60 * 1000; // 5分間アクティブ

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminFirestore();
    const now = new Date();

    const snapshot = await db
      .collection("parties")
      .where("status", "==", "ongoing")
      .get();

    let triggered = 0;
    let reset = 0;

    for (const doc of snapshot.docs) {
      const party = doc.data();
      const partyId = party.partyId;

      const beRealCount = party.beRealCount ?? 0;
      const beRealActive = party.beRealActive ?? false;
      const beRealActiveAt = party.beRealActiveAt
        ? new Date(party.beRealActiveAt)
        : null;
      const beRealNextAt = party.beRealNextAt
        ? new Date(party.beRealNextAt)
        : null;

      // アクティブ状態が5分以上経過したらリセット
      if (
        beRealActive &&
        beRealActiveAt &&
        now.getTime() - beRealActiveAt.getTime() > ACTIVE_DURATION_MS
      ) {
        await db.collection("parties").doc(partyId).update({
          beRealActive: false,
        });
        reset++;
        continue;
      }

      // まだアクティブ中はスキップ
      if (beRealActive) continue;

      // 最大回数に達したらスキップ
      if (beRealCount >= MAX_BEREAL) continue;

      // 初回 or 次の通知時刻に達した
      const shouldTrigger =
        !beRealNextAt || now.getTime() >= beRealNextAt.getTime();

      if (!shouldTrigger) continue;

      // ランダムな次回通知時刻を計算
      const randomInterval =
        MIN_INTERVAL_MS +
        Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
      const nextAt = new Date(now.getTime() + randomInterval);

      await db.collection("parties").doc(partyId).update({
        beRealActive: true,
        beRealActiveAt: now.toISOString(),
        beRealCount: beRealCount + 1,
        beRealNextAt: nextAt.toISOString(),
      });

      triggered++;
    }

    return NextResponse.json({ ok: true, triggered, reset });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
