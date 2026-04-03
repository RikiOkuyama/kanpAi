const LINE_API = "https://api.line.me/v2/bot/message/push";

export async function sendLineMessage(
  to: string,
  messages: Array<{ type: string; text?: string; altText?: string; contents?: unknown }>
): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");

  const res = await fetch(LINE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to, messages }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LINE API error: ${res.status} ${err}`);
  }
}

export function buildRestaurantFlexMessage(params: {
  restaurantName: string;
  reservationUrl: string;
  geminiComment: string;
  partyDate: string;
  partyTime: string;
  headcount: number;
}) {
  return {
    type: "flex",
    altText: `【kanpAi】お店が決まりました！${params.restaurantName}`,
    contents: {
      type: "bubble",
      hero: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🍺 kanpAi",
            weight: "bold",
            color: "#FF6B35",
            size: "sm",
          },
          {
            type: "text",
            text: "お店が決まりました！",
            weight: "bold",
            size: "xl",
            wrap: true,
          },
        ],
        paddingAll: "20px",
        backgroundColor: "#FFF9F0",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: params.restaurantName,
            weight: "bold",
            size: "lg",
            wrap: true,
            color: "#1A1A1A",
          },
          {
            type: "separator",
            margin: "md",
          },
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "baseline",
                contents: [
                  { type: "text", text: "📅", size: "sm", flex: 0 },
                  {
                    type: "text",
                    text: `${params.partyDate} ${params.partyTime}`,
                    size: "sm",
                    margin: "sm",
                  },
                ],
              },
              {
                type: "box",
                layout: "baseline",
                contents: [
                  { type: "text", text: "👥", size: "sm", flex: 0 },
                  {
                    type: "text",
                    text: `${params.headcount}名`,
                    size: "sm",
                    margin: "sm",
                  },
                ],
              },
            ],
          },
          {
            type: "text",
            text: params.geminiComment,
            wrap: true,
            size: "sm",
            color: "#555555",
            margin: "md",
          },
        ],
        paddingAll: "20px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#FF6B35",
            action: {
              type: "uri",
              label: "予約ページを開く",
              uri: params.reservationUrl,
            },
          },
        ],
        paddingAll: "12px",
      },
    },
  };
}
