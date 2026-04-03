import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

export type SwipeDirection = "right" | "left" | "up";

interface SwipeRecord {
  userId: string;
  votes: Record<string, SwipeDirection>; // { restaurantId: direction }
  completedAt: string;
}

interface RestaurantScore {
  restaurantId: string;
  score: number;
  upCount: number;
  rightCount: number;
  leftCount: number;
  voters: string[];
}

const SCORE: Record<SwipeDirection, number> = {
  up: 3,
  right: 1,
  left: 0,
};

// スワイプ結果を保存
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ partyId: string }> }
) {
  try {
    const { partyId } = await params;
    const { userId, votes } = await req.json() as {
      userId: string;
      votes: Record<string, SwipeDirection>;
    };

    if (!userId || !votes) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const record: SwipeRecord = {
      userId,
      votes,
      completedAt: new Date().toISOString(),
    };

    await db
      .collection("parties")
      .doc(partyId)
      .collection("swipes")
      .doc(userId)
      .set(record);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// 集計結果を取得
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ partyId: string }> }
) {
  try {
    const { partyId } = await params;
    const userId = req.nextUrl.searchParams.get("userId");
    const db = getAdminFirestore();

    const snapshot = await db
      .collection("parties")
      .doc(partyId)
      .collection("swipes")
      .get();

    const swipes = snapshot.docs.map((d) => d.data() as SwipeRecord);

    // レストランごとにスコアを集計
    const scoreMap: Record<string, RestaurantScore> = {};

    for (const swipe of swipes) {
      for (const [restaurantId, direction] of Object.entries(swipe.votes)) {
        if (!scoreMap[restaurantId]) {
          scoreMap[restaurantId] = {
            restaurantId,
            score: 0,
            upCount: 0,
            rightCount: 0,
            leftCount: 0,
            voters: [],
          };
        }
        scoreMap[restaurantId].score += SCORE[direction];
        if (direction === "up") scoreMap[restaurantId].upCount++;
        if (direction === "right") scoreMap[restaurantId].rightCount++;
        if (direction === "left") scoreMap[restaurantId].leftCount++;
        scoreMap[restaurantId].voters.push(swipe.userId);
      }
    }

    const results = Object.values(scoreMap).sort((a, b) => b.score - a.score);

    // 指定ユーザーの既存投票を返す
    const myVotes: Record<string, SwipeDirection> | null = userId
      ? (swipes.find((s) => s.userId === userId)?.votes ?? null)
      : null;

    return NextResponse.json({ results, totalVoters: swipes.length, myVotes });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
