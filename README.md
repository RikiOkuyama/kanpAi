# kanpAi - AI飲み会幹事代行アプリ

AIが飲み会の幹事業務を全部やってくれるWebアプリ。

## 技術スタック（全て無料）

| レイヤー | 技術 |
|---|---|
| Frontend/BFF | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| デプロイ | Vercel（無料プラン） |
| DB | Firebase Firestore（Sparkプラン） |
| AI | Gemini API（gemini-1.5-flash） |
| グルメ検索 | ホットペッパーグルメAPI |
| 通知 | LINE Messaging API |
| 認証 | なし（URLベースの参加登録） |

## セットアップ

### 1. 環境変数を設定

`.env.local` の各値を設定:

必要なAPIキー:
- **Firebase**: コンソールでプロジェクト作成 → Webアプリを追加 → サービスアカウントJSONをBase64化
- **Gemini**: Google AI Studio でAPIキー取得
- **ホットペッパー**: リクルート Web Service で登録
- **LINE**: LINE Developers でMessaging APIチャネル作成

#### Firebase Admin SDKのBase64化

```bash
cat serviceAccountKey.json | base64 | pbcopy
```

コピーされた文字列を `FIREBASE_ADMIN_SDK_JSON` に貼る。

### 2. 開発サーバー起動

```bash
npm install
npm run dev
```

## ディレクトリ構成

```
app/
  page.tsx                      # 飲み会作成フォーム（ビールスライダーUI）
  party/[partyId]/
    page.tsx                    # 飲み会ダッシュボード
    join/page.tsx               # 参加者登録ページ
    split/page.tsx              # 割り勘計算
    feedback/page.tsx           # フィードバック
  api/
    party/route.ts              # パーティー作成
    party/[partyId]/route.ts    # 取得・更新
    party/[partyId]/join/route.ts # 参加者追加
    restaurants/route.ts        # Hotpepper+Geminiでお店提案
    line/notify/route.ts        # LINE Push通知
    line/webhook/route.ts       # LINE Webhook
    cron/after-party/route.ts   # 2次会自動提案（Vercel Cron）
    split/route.ts              # 割り勘計算（Gemini）
    feedback/route.ts           # フィードバック保存
lib/
  firebase-client.ts
  firebase-admin.ts
  gemini.ts
  hotpepper.ts
  line.ts
types/
  party.ts
```

## 機能一覧

1. **飲み会プランニング** - ビールジョッキUIの予算スライダーで直感的に入力
2. **QRコード生成** - 参加者招待用URLとQRコードを自動生成
3. **AIお店提案** - Hotpepper検索 + Geminiで最適なお店を推薦（過去フィードバックも参考）
4. **LINE通知** - お店確定時・招待時に参加者全員へPush通知
5. **2次会自動提案** - 開始90分後にVercel Cron Jobsが自動起動してLINE通知
6. **割り勘計算** - 「早退」「ソフドリのみ」等の事情をGeminiが考慮
7. **フィードバック** - 飲み会後の評価をFirestoreに蓄積、次回AI提案に活用

## Vercel Cron Jobs

`vercel.json` で10分ごとに `/api/cron/after-party` を実行。
開始90〜100分後のパーティーを検出してLINEで2次会提案を送信。

認証: `Authorization: Bearer <CRON_SECRET>` ヘッダーで保護。

## Firestore セキュリティルール（推奨）

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /parties/{partyId} {
      allow read: if true;
      allow write: if false; // Admin SDKのみ書き込み可
    }
  }
}
```
