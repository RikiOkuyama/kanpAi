import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { FeedbackEntry } from "@/types/party";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const { partyId, restaurantScore, atmosphereScore, organizerScore, comment } =
      await req.json();

    if (!partyId || !restaurantScore || !atmosphereScore || !organizerScore) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const feedback: FeedbackEntry = {
      restaurantScore: Number(restaurantScore),
      atmosphereScore: Number(atmosphereScore),
      organizerScore: Number(organizerScore),
      comment: comment ?? "",
      submittedAt: new Date().toISOString(),
    };

    const db = getAdminFirestore();
    await db.collection("parties").doc(partyId).update({
      feedbacks: FieldValue.arrayUnion(feedback),
      status: "done",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
