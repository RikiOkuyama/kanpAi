import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { callGemini } from "@/lib/gemini";
import { SplitResult } from "@/types/party";

interface SplitParticipant {
  id: string;
  name: string;
  note: string; // 例: "早退した", "ソフトドリンクのみ"
}

export async function POST(req: NextRequest) {
  try {
    const { partyId, totalAmount, splitParticipants } = await req.json() as {
      partyId: string;
      totalAmount: number;
      splitParticipants: SplitParticipant[];
    };

    if (!partyId || !totalAmount || !splitParticipants?.length) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const doc = await db.collection("parties").doc(partyId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "パーティーが見つかりません" }, { status: 404 });
    }

    const hasSpecialNotes = splitParticipants.some((p) => p.note);

    let splitResults: SplitResult[];

    if (hasSpecialNotes) {
      // Geminiで人間的な割り勘計算
      const prompt = `飲み会の割り勘を計算してください。

合計金額: ${totalAmount.toLocaleString()}円
参加者と事情:
${splitParticipants.map((p) => `- ${p.name}: ${p.note || "通常参加"}`).join("\n")}

事情を考慮して公平な割り勘金額を計算してください。
必ず以下のJSON形式で返してください:

\`\`\`json
{
  "results": [
    {
      "participantId": "参加者のID",
      "name": "名前",
      "amount": 金額（整数）,
      "note": "計算の根拠やコメント"
    }
  ],
  "totalCheck": 合計金額（各amountの合計）
}
\`\`\`

${splitParticipants.map((p) => `${p.name}のID: ${p.id}`).join("\n")}`;

      const geminiRaw = await callGemini(prompt);

      try {
        const jsonMatch = geminiRaw.match(/```json\n?([\s\S]*?)\n?```/) ||
          geminiRaw.match(/(\{[\s\S]*\})/);
        if (!jsonMatch) throw new Error("JSON not found");

        const parsed = JSON.parse(jsonMatch[1]);
        splitResults = parsed.results;
      } catch {
        // パース失敗時は均等割り
        const perPerson = Math.ceil(totalAmount / splitParticipants.length);
        splitResults = splitParticipants.map((p) => ({
          participantId: p.id,
          name: p.name,
          amount: perPerson,
          note: "均等割り",
        }));
      }
    } else {
      // 事情なし → シンプルな均等割り
      const base = Math.floor(totalAmount / splitParticipants.length);
      const remainder = totalAmount - base * splitParticipants.length;

      splitResults = splitParticipants.map((p, i) => ({
        participantId: p.id,
        name: p.name,
        amount: i === 0 ? base + remainder : base, // 端数は最初の人
        note: i === 0 && remainder > 0 ? `端数${remainder}円含む` : "",
      }));
    }

    // Firestoreに保存
    await db.collection("parties").doc(partyId).update({
      splitResults,
      totalAmount,
    });

    return NextResponse.json({ splitResults });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
