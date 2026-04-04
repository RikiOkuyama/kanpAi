import { NextRequest, NextResponse } from "next/server";
import { searchRestaurants, budgetToCode } from "@/lib/hotpepper";
import { callGemini, callGeminiWithSearch } from "@/lib/gemini";
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

    // 過去フィードバック（継続学習）
    const feedbackContext = party.feedbacks?.length
      ? `過去の飲み会フィードバック:\n${party.feedbacks
          .map((f: { comment: string; restaurantScore: number; atmosphereScore: number }) =>
            `- 飲食店評価: ${f.restaurantScore}/5, 雰囲気: ${f.atmosphereScore}/5, コメント: ${f.comment}`
          )
          .join("\n")}`
      : "";

    let restaurants: Restaurant[] = [];
    let suggestions: GeminiSuggestion[] = [];
    let geminiMessage = "";

    if (party.requests) {
      // ── 要望あり: Gemini + Google Search でお店を探す ──
      const searchPrompt = buildGeminiSearchPrompt(party, feedbackContext);
      const raw = await callGeminiWithSearch(searchPrompt);

      const parsed = extractJSON(raw);
      if (parsed && Array.isArray(parsed.restaurants) && parsed.restaurants.length) {
        restaurants = (parsed.restaurants as Array<Record<string, string | number>>).map(
          (r, i): Restaurant => ({
            id: `gemini_${i}`,
            name: String(r.name ?? ""),
            genre: String(r.genre ?? ""),
            address: String(r.address ?? ""),
            access: String(r.access ?? ""),
            imageUrl: "",
            urls: String(r.urls ?? ""),
            budget: String(r.budget ?? ""),
            capacity: String(r.capacity ?? "0"),
            catch: String(r.catch ?? ""),
          })
        );
        suggestions = (parsed.restaurants as Array<Record<string, string | number>>).map(
          (r, i): GeminiSuggestion => ({
            restaurantId: `gemini_${i}`,
            reason: String(r.reason ?? ""),
            recommendPoint: String(r.recommendPoint ?? ""),
          })
        );
        geminiMessage = String(parsed.message ?? "");
      }
    }

    // 要望なし or Gemini検索が空だった場合は HotPepper にフォールバック
    if (restaurants.length === 0) {
      const budgetCode = budgetToCode(party.budget);
      restaurants = await searchRestaurants({
        area: party.area,
        budget: budgetCode,
        count: 10,
      });

      if (restaurants.length > 0) {
        // Geminiでランキング・提案文を生成
        const rankPrompt = buildRankPrompt(party, restaurants, feedbackContext);
        const rankRaw = await callGemini(rankPrompt);
        const rankParsed = extractJSON(rankRaw);
        if (rankParsed) {
          suggestions = (rankParsed.suggestions as GeminiSuggestion[] | undefined) ?? [];
          geminiMessage = String(rankParsed.message ?? "");
        }
      }
    }

    if (restaurants.length === 0) {
      await db.collection("parties").doc(partyId).update({
        restaurants: [],
        searchError: "no_results",
        geminiMessage: "",
      });
      return NextResponse.json({ error: "no_results" }, { status: 404 });
    }

    await db.collection("parties").doc(partyId).update({
      restaurants,
      geminiSuggestions: suggestions,
      geminiMessage,
      searchError: null,
    });

    return NextResponse.json({ restaurants, suggestions, geminiMessage });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

function extractJSON(raw: string): Record<string, unknown> | null {
  try {
    const jsonMatch =
      raw.match(/```json\n?([\s\S]*?)\n?```/) ||
      raw.match(/(\{[\s\S]*\})/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);
  } catch { /* ignore */ }
  return null;
}

function buildGeminiSearchPrompt(
  party: Record<string, unknown>,
  feedbackContext: string,
): string {
  return `あなたは飲み会の幹事AIアシスタント「kanpAi」です。
以下の条件で飲み会向けのお店をGoogle検索で探して、JSON形式で返してください。

## 検索条件
- エリア: ${party.area}
- 日付: ${party.date} ${party.time}
- 人数: ${party.headcount}名
- 予算（1人あたり）: ${party.budget}円
- 要望（最優先・必ず満たすこと）: ${party.requests}
${feedbackContext ? `\n${feedbackContext}` : ""}

## 指示
- 上記の要望を最優先として、エリア・予算・人数にも合ったお店を実際に検索して5〜8件見つけてください
- 実在するお店のみを返してください（架空のお店は不可）
- 食べログ・ホットペッパー・Googleマップ等で確認できるお店にしてください

## 出力形式（必ずこのJSONのみを返すこと）
\`\`\`json
{
  "message": "幹事として参加者へのメッセージ（100字程度、楽しい雰囲気で）",
  "restaurants": [
    {
      "name": "店名",
      "genre": "ジャンル（例：居酒屋、焼肉、イタリアン）",
      "address": "住所",
      "access": "最寄り駅・アクセス",
      "budget": "予算目安（例：3,000〜4,000円）",
      "catch": "お店の特徴・キャッチフレーズ（要望への合致ポイントを含めて）",
      "urls": "食べログまたはホットペッパーのURL",
      "capacity": 収容人数（数字、不明な場合は0）,
      "reason": "このお店を選んだ理由（要望との関連性を含めて50字程度）",
      "recommendPoint": "オススメポイント（30字程度）"
    }
  ]
}
\`\`\``;
}

function buildRankPrompt(
  party: Record<string, unknown>,
  restaurants: Restaurant[],
  feedbackContext: string,
): string {
  return `あなたは飲み会の幹事AIアシスタント「kanpAi」です。
以下の飲み会情報とお店リストを元に、最適なお店をJSON形式で提案してください。

## 飲み会情報
- エリア: ${party.area}
- 日付: ${party.date} ${party.time}
- 人数: ${party.headcount}名
- 予算（1人あたり）: ${party.budget}円
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
