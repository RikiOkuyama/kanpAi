import { Restaurant } from "@/types/party";

const HOTPEPPER_BASE = "https://webservice.recruit.co.jp/hotpepper/gourmet/v1/";

interface HotpepperShop {
  id: string;
  name: string;
  address: string;
  access: string;
  photo: { pc: { l: string } };
  urls: { pc: string };
  budget: { average: string };
  genre: { name: string };
  capacity: number;
  catch: string;
  open: string;
}

interface HotpepperResponse {
  results: {
    shop?: HotpepperShop[];
    results_available?: number;
    error?: Array<{ message: string }>;
  };
}

export async function searchRestaurants(params: {
  keyword?: string;
  area?: string;
  budget?: string; // ホットペッパー予算コード
  count?: number;
  genre?: string;
}): Promise<Restaurant[]> {
  const apiKey = process.env.HOTPEPPER_API_KEY;
  if (!apiKey) throw new Error("HOTPEPPER_API_KEY is not set");

  const query = new URLSearchParams({
    key: apiKey,
    format: "json",
    count: String(params.count ?? 10),
    ...(params.keyword && { keyword: params.keyword }),
    ...(params.budget && { budget: params.budget }),
    ...(params.genre && { genre: params.genre }),
  });

  // エリアはキーワードとして渡す（テキストエリア対応）
  if (params.area) {
    query.set("keyword", [params.keyword, params.area].filter(Boolean).join(" "));
  }

  const res = await fetch(`${HOTPEPPER_BASE}?${query.toString()}`);
  if (!res.ok) throw new Error(`Hotpepper API error: ${res.status}`);

  const data: HotpepperResponse = await res.json();

  if (data.results.error) {
    throw new Error(`Hotpepper API: ${data.results.error[0]?.message}`);
  }

  return (data.results.shop ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    access: s.access,
    imageUrl: s.photo.pc.l,
    urls: s.urls.pc,
    budget: s.budget.average,
    genre: s.genre.name,
    capacity: String(s.capacity),
    catch: s.catch,
    open: s.open,
  }));
}

// 予算（円/人）からホットペッパーの予算コードに変換
export function budgetToCode(perPersonBudget: number): string {
  // ホットペッパー予算コードは2人分相当の合計目安
  // B009=〜1000, B010=〜2000, B011=〜3000, B001=〜4000, B002=〜5000, B003=〜6000, B008=〜7000, B004=〜8000, B005=〜10000, B006=〜15000, B012=〜20000, B013=〜30000
  if (perPersonBudget <= 1000) return "B009";
  if (perPersonBudget <= 2000) return "B010";
  if (perPersonBudget <= 3000) return "B011";
  if (perPersonBudget <= 4000) return "B001";
  if (perPersonBudget <= 5000) return "B002";
  if (perPersonBudget <= 6000) return "B003";
  if (perPersonBudget <= 8000) return "B004";
  if (perPersonBudget <= 10000) return "B005";
  if (perPersonBudget <= 15000) return "B006";
  return "B012";
}
