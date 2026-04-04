export type PartyStatus = "planning" | "candidate" | "reserved" | "ongoing" | "done";

export interface Participant {
  id: string;
  name: string;
  lineUserId?: string;
  joinedAt: string; // ISO string
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  access: string;
  imageUrl: string;
  urls: string;
  budget: string;
  genre: string;
  capacity: string;
  catch?: string;
  open?: string;
}

export interface GeminiSuggestion {
  restaurantId: string;
  reason: string;
  recommendPoint: string;
}

export interface FeedbackEntry {
  restaurantScore: number; // 1-5
  atmosphereScore: number; // 1-5
  organizerScore: number;  // 1-5
  comment: string;
  submittedAt: string;
}

export interface Photo {
  id: string;
  partyId: string;
  storageUrl: string;
  uploadedBy: string; // localStorage の匿名ユーザーID
  uploadedAt: string;
  likes: Record<string, boolean>; // { userId: true }
  likeCount: number;
}

export interface SplitResult {
  participantId: string;
  name: string;
  amount: number;
  note: string;
}

export interface Party {
  partyId: string;
  createdAt: string;
  title?: string;       // 飲み会タイトル
  date: string;         // ISO date string "YYYY-MM-DD"
  time: string;         // "HH:mm"
  area: string;
  budget: number;       // per person (yen)
  headcount: number;
  requests: string;
  status: PartyStatus;
  organizer: {
    lineUserId: string;
    name: string;
  };
  participants: Participant[];
  selectedRestaurant?: Restaurant;
  restaurants?: Restaurant[];
  geminiSuggestions?: GeminiSuggestion[];
  geminiMessage?: string;
  requestsHonored?: boolean;  // 要望を考慮した検索結果かどうか
  searchError?: "no_results"; // お店が見つからなかった場合
  feedbacks?: FeedbackEntry[];
  splitResults?: SplitResult[];
  afterPartyNotifiedAt?: string;
  // BeReal機能
  beRealActive?: boolean;
  beRealActiveAt?: string;
  beRealCount?: number;
  beRealNextAt?: string;
}
