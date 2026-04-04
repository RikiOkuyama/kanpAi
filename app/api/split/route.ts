import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { callGeminiLow } from "@/lib/gemini";
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

    const hasNotes = splitParticipants.some((p) => p.note.trim());

    const prompt = `あなたは飲み会の割り勘を計算するAIです。
参加者それぞれの「事情・コメント」を最大限考慮して、公平に負担額を割り振ってください。

## 飲み会情報
- 合計金額: ${totalAmount.toLocaleString()}円
- 参加人数: ${splitParticipants.length}名
- 1人あたり均等額（参考）: ${Math.round(totalAmount / splitParticipants.length).toLocaleString()}円

## 参加者と事情
${splitParticipants.map((p) => `- ${p.name}（ID: ${p.id}）: ${p.note.trim() || "事情なし"}`).join("\n")}

## 割り振りルール
${hasNotes ? `- 【重要】事情・コメントのある人は必ずその内容を反映した金額にしてください
- 「早退した」「途中参加」→ 均等より大幅に少なく（50〜70%程度）
- 「ソフトドリンクのみ」「飲めない」→ かなり少なく（30〜50%程度）
- 「たくさん飲んだ」「食べまくった」→ 多めに（120〜150%程度）
- 「誕生日」「祝われる側」→ 無料または大幅減額
- 「幹事」→ 少し少なく（80〜90%程度）
- 「奢る」「多めに出す」→ その分を他の人から引いて負担
- 「学生」「お金ない」→ 少し少なく（70〜85%程度）
- 上記以外の事情も文脈を読んで合理的に判断してください` : `- 事情コメントがないため、全員均等に割り振ってください`}
- 合計が必ず${totalAmount}円になるよう端数を調整してください（差額は「事情なし」の人に上乗せ）
- 金額は全て0円以上の整数（円単位）にしてください

## 出力形式（JSONのみ）
{
  "results": [
    {
      "participantId": "ID文字列",
      "name": "名前",
      "amount": 金額の整数,
      "note": "計算根拠を一言で（例: 早退のため均等より30%減、ソフドリのみのため半額）"
    }
  ]
}`;

    const geminiRaw = await callGeminiLow(prompt);

    // JSON modeで返ってくるので直接パース
    const parsed = JSON.parse(geminiRaw);
    let splitResults: SplitResult[] = parsed.results;

    // 合計金額のズレを補正（端数調整）
    const calcTotal = splitResults.reduce((s: number, r: SplitResult) => s + r.amount, 0);
    const diff = totalAmount - calcTotal;
    if (diff !== 0) {
      // 差額を「事情なし」の人に上乗せ（いなければ先頭）
      const targetIdx = splitResults.findIndex(
        (r) => !splitParticipants.find((p) => p.id === r.participantId)?.note.trim()
      );
      splitResults[targetIdx >= 0 ? targetIdx : 0].amount += diff;
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
