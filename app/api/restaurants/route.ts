import { NextRequest, NextResponse } from "next/server";
import { searchRestaurants, budgetToCode } from "@/lib/hotpepper";
import { callGemini } from "@/lib/gemini";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { GeminiSuggestion, Restaurant } from "@/types/party";

export async function POST(req: NextRequest) {
  try {
    const { partyId } = await req.json();
    if (!partyId) {
      return NextResponse.json({ error: "partyIdが必要です" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const doc = await db.collection("parties").doc(partyId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "パーティーが見つかりません" }, { status: 404 });
    }

    const party = doc.data()!;
    const budgetCode = budgetToCode(party.budget);

    // 過去フィードバックを取得（継続学習）
    const feedbackContext = party.feedbacks?.length
      ? `過去の飲み会フィードバック:\n${party.feedbacks
          .map((f: { comment: string; restaurantScore: number; atmosphereScore: number }) =>
            `- 飲食店評価: ${f.restaurantScore}/5, 雰囲気: ${f.atmosphereScore}/5, コメント: ${f.comment}`
          )
          .join("\n")}`
      : "";

    // ホットペッパーでお店検索
    const restaurants = await searchRestaurants({
      area: party.area,
      budget: budgetCode,
      count: 10,
    });

    if (restaurants.length === 0) {
      return NextResponse.json({ error: "条件に合うお店が見つかりませんでした" }, { status: 404 });
    }

    // Geminiでお店提案文を生成
    const prompt = buildRestaurantPrompt(party, restaurants, feedbackContext);
    const geminiRaw = await callGemini(prompt);

    let suggestions: GeminiSuggestion[] = [];
    let geminiMessage = "";

    try {
      // JSON部分を抽出
      const jsonMatch = geminiRaw.match(/```json\n?([\s\S]*?)\n?```/) ||
        geminiRaw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        suggestions = parsed.suggestions ?? parsed;
        geminiMessage = parsed.message ?? "";
      }
    } catch {
      geminiMessage = geminiRaw;
    }

    // Firestoreに保存
    await db.collection("parties").doc(partyId).update({
      restaurants,
      geminiSuggestions: suggestions,
      geminiMessage,
    });

    return NextResponse.json({ restaurants, suggestions, geminiMessage });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

function buildRestaurantPrompt(
  party: Record<string, unknown>,
  restaurants: Restaurant[],
  feedbackContext: string
): string {
  return `あなたは飲み会の幹事AIアシスタント「kanpAi」です。
以下の飲み会情報とお店リストを元に、最適なお店をJSON形式で提案してください。

## 飲み会情報
- エリア: ${party.area}
- 日付: ${party.date} ${party.time}
- 人数: ${party.headcount}名
- 予算（1人あたり）: ${party.budget}円
- 要望: ${party.requests || "特になし"}
${feedbackContext ? `\n${feedbackContext}` : ""}

## お店候補
${restaurants.map((r, i) => `${i + 1}. ${r.name} - ${r.genre} - ${r.budget} - ${r.catch ?? ""}`).join("\n")}

## 出力形式（必ずこのJSONで返すこと）
\`\`\`json
{
  "message": "幹事として参加者へのメッセージ（100字程度、楽しい雰囲気で）",
  "suggestions": [
    {
      "restaurantId": "お店のID（上記リストのidフィールド）",
      "reason": "なぜこのお店を選んだか（50字程度）",
      "recommendPoint": "オススメポイント（30字程度）"
    }
  ]
}
\`\`\`

上位3つを推薦してください。過去のフィードバックがあれば参考にしてください。`;
}
