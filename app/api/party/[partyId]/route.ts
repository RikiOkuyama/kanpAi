import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { Party } from "@/types/party";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ partyId: string }> }
) {
  try {
    const { partyId } = await params;
    const db = getAdminFirestore();
    const doc = await db.collection("parties").doc(partyId).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "パーティーが見つかりません" }, { status: 404 });
    }

    return NextResponse.json(doc.data() as Party);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ partyId: string }> }
) {
  try {
    const { partyId } = await params;
    const body = await req.json();
    const db = getAdminFirestore();

    await db.collection("parties").doc(partyId).update(body);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
