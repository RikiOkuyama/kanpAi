import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ partyId: string; photoId: string }> }
) {
  try {
    const { partyId, photoId } = await params;
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userIdが必要です" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const photoRef = db
      .collection("parties")
      .doc(partyId)
      .collection("photos")
      .doc(photoId);

    const photoDoc = await photoRef.get();
    if (!photoDoc.exists) {
      return NextResponse.json({ error: "写真が見つかりません" }, { status: 404 });
    }

    // 投稿者本人のみ削除可能
    if (photoDoc.data()?.uploadedBy !== userId) {
      return NextResponse.json({ error: "削除権限がありません" }, { status: 403 });
    }

    await photoRef.delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
