# Slack Events API連携のバグ修正

全て実装してください。確認や質問は不要です。
具体的な提案・修正案・コード例まで自主的に出力してください。
完了後 npm run build で成功することを確認してください。

## 絶対に変更しないファイル
- src/lib/google-auth.ts
- src/lib/google-tasks.ts
- src/lib/supabase.ts
- src/lib/api-auth.ts
- 上記以外のsrc/app/api/配下のファイル（slack/events以外）

## 技術スタック
- Next.js 16.1.6 + React 19 + TypeScript
- Vercel Serverless Functions (デプロイ先)
- Slack Events API (reaction_added)
- Google Tasks API
- Supabase

## 環境変数（参照のみ、値は変更不要）
- SLACK_USER_TOKEN (xoxp-) — ユーザートークン。全チャンネルのメッセージ読み取り用
- SLACK_BOT_TOKEN (xoxb-) — ボットトークン。スレッド返信用
- SLACK_SIGNING_SECRET — リクエスト署名検証用
- SLACK_TASK_EMOJI — トリガー絵文字名（デフォルト: "task"）
- SLACK_TASK_EMOJI_ALIASES — 代替絵文字（デフォルト: "white_check_mark,memo")

---

## 問題の概要

Slackメッセージに絵文字リアクション（:task:等）を付けると、タスクをGoogle Tasks + Supabaseに作成してSlackスレッドに返信する機能。

**一度は動作したが、コード変更後に動かなくなった。** Vercelのランタイムログにリクエストが記録されない。

## 対象ファイル

### 1. src/app/api/slack/events/route.ts
- Slack Events APIのエンドポイント
- URL verification (challenge) + reaction_added イベント処理
- HMAC-SHA256署名検証

### 2. src/lib/slack-events.ts
- Slack APIヘルパー関数群
- getSlackMessage: メッセージ取得（トップレベル + スレッドリプライ対応）
- postSlackReply: スレッド返信
- その他ユーティリティ

## やってほしいこと

### 1. route.tsの全体レビューと修正
- ファイル: `src/app/api/slack/events/route.ts`
- 以前 `@vercel/functions` の `waitUntil` を使っていて壊れた。現在は `await` に戻したが、まだ動かない
- Next.js 16 App Router の Route Handler として正しい形式か確認
- **最重要**: Slackは非200レスポンスが連続するとイベント配信を停止する。全てのコードパスで必ず200を返すこと
- エラーが握りつぶされていないか確認
- try/catchで全体（POST関数のbody全体）を囲み、例外時にも必ず200/JSONを返す
- console.logを追加して、リクエスト受信時・処理開始時・完了時にログを出すこと（デバッグ用）
- `@vercel/functions` のimportが残っていないことを確認

### 2. slack-events.tsのレビューと修正
- ファイル: `src/lib/slack-events.ts`
- getSlackMessage のfetch呼び出しでエラーハンドリングが適切か確認
- fetch自体が例外を投げた場合にcatchしているか確認
- 全ての関数でtry/catchを入れること

### 3. package.jsonから@vercel/functionsを削除
- `npm uninstall @vercel/functions` に相当する変更を行う（package.jsonとpackage-lock.jsonから削除）

## 実装上の注意
- Slackは3秒以内にレスポンスがないとリトライする。ただしVercelの関数タイムアウトは10秒なので、awaitで同期処理してOK
- **最重要**: 全てのパスで200を返すこと。500エラーは絶対に返さない
- console.logでリクエスト受信・処理ステップ・完了のログを出す
- `@vercel/functions` は使わないこと
