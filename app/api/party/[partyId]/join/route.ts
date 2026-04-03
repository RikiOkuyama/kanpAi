import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { Participant } from "@/types/party";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ partyId: string }> }
) {
  try {
    const { partyId } = await params;
    const { name, lineUserId } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "名前は必須です" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const docRef = db.collection("parties").doc(partyId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "パーティーが見つかりません" }, { status: 404 });
    }

    const party = doc.data();
    const participants: Participant[] = party?.participants ?? [];

    // 重複チェック
    if (participants.some((p) => p.name === name)) {
      return NextResponse.json({ error: "同じ名前の参加者が既にいます" }, { status: 409 });
    }

    const newParticipant: Participant = {
      id: uuidv4(),
      name,
      lineUserId: lineUserId ?? "",
      joinedAt: new Date().toISOString(),
    };

    await docRef.update({
      participants: [...participants, newParticipant],
    });

    return NextResponse.json({ participant: newParticipant });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
