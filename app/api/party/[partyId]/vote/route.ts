import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ partyId: string }> }
) {
  try {
    const { partyId } = await params;
    const { photoId, userId } = await req.json();

    if (!photoId || !userId) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
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

    const photo = photoDoc.data()!;
    const alreadyLiked = photo.likes?.[userId] === true;

    if (alreadyLiked) {
      // いいね取り消し
      await photoRef.update({
        [`likes.${userId}`]: FieldValue.delete(),
        likeCount: FieldValue.increment(-1),
      });
      return NextResponse.json({ liked: false });
    } else {
      // いいね追加
      await photoRef.update({
        [`likes.${userId}`]: true,
        likeCount: FieldValue.increment(1),
      });
      return NextResponse.json({ liked: true });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
