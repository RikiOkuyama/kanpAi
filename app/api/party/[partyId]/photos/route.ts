import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { Photo } from "@/types/party";

// 写真メタデータ保存
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ partyId: string }> }
) {
  try {
    const { partyId } = await params;
    const { storageUrl, uploadedBy } = await req.json();

    if (!storageUrl || !uploadedBy) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const photoId = uuidv4();

    const photo: Photo = {
      id: photoId,
      partyId,
      storageUrl,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      likes: {},
      likeCount: 0,
    };

    await db
      .collection("parties")
      .doc(partyId)
      .collection("photos")
      .doc(photoId)
      .set(photo);

    return NextResponse.json({ photo });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// 写真一覧取得
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ partyId: string }> }
) {
  try {
    const { partyId } = await params;
    const db = getAdminFirestore();

    const snapshot = await db
      .collection("parties")
      .doc(partyId)
      .collection("photos")
      .orderBy("uploadedAt", "desc")
      .get();

    const photos = snapshot.docs.map((doc) => doc.data() as Photo);
    return NextResponse.json({ photos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
