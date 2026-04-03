import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// LINE Webhookエンドポイント（将来の拡張用）
export async function POST(req: NextRequest) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET ?? "";
  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  // 署名検証
  const hmac = crypto
    .createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");

  if (hmac !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const events = JSON.parse(body).events ?? [];
  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      // テキストメッセージへの応答（拡張ポイント）
      console.log("LINE message received:", event.message.text);
    }
  }

  return NextResponse.json({ ok: true });
}
