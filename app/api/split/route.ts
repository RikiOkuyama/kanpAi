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

    // 常にGeminiで計算（事情なしの場合も均等割りの根拠をAIが説明）
    const prompt = `飲み会の割り勘を計算してください。

合計金額: ${totalAmount.toLocaleString()}円
参加者と事情:
${splitParticipants.map((p) => `- ${p.name}: ${p.note || "特になし"}`).join("\n")}

ルール:
- 事情の内容に応じて各自の負担額を増減させてください
  - 例: 「早退した」→ 少なめ、「ソフドリのみ」→ かなり少なめ、「たくさん飲んだ」「肉をいっぱい食べた」→ 多め、「誕生日」→ 無料や大幅減額、「幹事」→ 少し減額
- 事情が「特になし」の人は基準額として扱ってください
- 均等にする必要はありません。事情に応じて差をつけてください
- 合計が必ず${totalAmount}円になるよう端数を調整してください
- 金額は全て整数（円単位）にしてください

必ず以下のJSON形式のみで返してください（説明文不要）:

\`\`\`json
{
  "results": [
    {
      "participantId": "参加者のID",
      "name": "名前",
      "amount": 金額（整数）,
      "note": "計算根拠（例: 早退のため半額、たくさん飲んだため1.5倍 など）"
    }
  ]
}
\`\`\`

参加者IDの対応:
${splitParticipants.map((p) => `${p.name} → ID: ${p.id}`).join("\n")}`;

    const geminiRaw = await callGemini(prompt);

    let splitResults: SplitResult[];

    try {
      const jsonMatch = geminiRaw.match(/```json\n?([\s\S]*?)\n?```/) ||
        geminiRaw.match(/(\{[\s\S]*\})/);
      if (!jsonMatch) throw new Error("JSON not found");

      const parsed = JSON.parse(jsonMatch[1]);
      splitResults = parsed.results;

      // 合計金額のズレを補正（端数調整）
      const calcTotal = splitResults.reduce((s: number, r: SplitResult) => s + r.amount, 0);
      const diff = totalAmount - calcTotal;
      if (diff !== 0) {
        splitResults[0].amount += diff;
      }
    } catch {
      // パース失敗時は均等割りにフォールバック
      const base = Math.floor(totalAmount / splitParticipants.length);
      const remainder = totalAmount - base * splitParticipants.length;
      splitResults = splitParticipants.map((p, i) => ({
        participantId: p.id,
        name: p.name,
        amount: i === 0 ? base + remainder : base,
        note: i === 0 && remainder > 0 ? `均等割り（端数${remainder}円含む）` : "均等割り",
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
