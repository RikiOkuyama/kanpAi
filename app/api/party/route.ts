import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { Party } from "@/types/party";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, date, time, area, budget, headcount, requests, organizerName, organizerLineUserId } = body;

    if (!date || !area || !budget || !headcount || !organizerName) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const partyId = uuidv4().replace(/-/g, "").slice(0, 12);
    const now = new Date().toISOString();

    const party: Party = {
      partyId,
      createdAt: now,
      ...(title ? { title } : {}),
      date,
      time: time ?? "19:00",
      area,
      budget: Number(budget),
      headcount: Number(headcount),
      requests: requests ?? "",
      status: "planning",
      organizer: {
        lineUserId: organizerLineUserId ?? "",
        name: organizerName,
      },
      participants: [
        {
          id: uuidv4(),
          name: organizerName,
          lineUserId: organizerLineUserId ?? "",
          joinedAt: now,
        },
      ],
    };

    const db = getAdminFirestore();
    await db.collection("parties").doc(partyId).set(party);

    return NextResponse.json({ partyId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
