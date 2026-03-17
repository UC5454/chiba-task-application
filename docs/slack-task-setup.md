# Slack絵文字リアクション → タスク自動追加 セットアップガイド

## 概要

Slackメッセージに特定の絵文字（デフォルト: `:task:`）をリアクションすると、
そのメッセージ内容がSOU Taskアプリ + Google Tasksに自動でタスク追加されます。

```
Slackメッセージに :task: リアクション
  → Slack Events API (reaction_added)
  → /api/slack/events (Vercel)
  → Google Tasks APIでタスク作成
  → Supabaseにメタデータ保存
  → Slackスレッドに「タスク追加しました」と返信
```

---

## 千葉さんがやること（所要時間: 約10分）

### Step 1: Slack Appを作成する

1. https://api.slack.com/apps にアクセス
2. **「Create New App」** → **「From scratch」** を選択
3. App名: `SOU Task Bot`（任意）
4. ワークスペース: 自分のSlackワークスペースを選択
5. **「Create App」** をクリック

### Step 2: Bot Token Scopes を設定する

1. 左メニュー **「OAuth & Permissions」** をクリック
2. **「Scopes」** セクションまでスクロール
3. **「Bot Token Scopes」** に以下を追加:

| Scope | 用途 |
|-------|------|
| `channels:history` | パブリックチャンネルのメッセージ取得 |
| `groups:history` | プライベートチャンネルのメッセージ取得 |
| `reactions:read` | リアクション検知 |
| `chat:write` | スレッドに返信 |
| `users:read` | ユーザー名の取得 |

### Step 3: アプリをワークスペースにインストール

1. 左メニュー **「OAuth & Permissions」** の上部
2. **「Install to Workspace」** をクリック
3. 権限を許可する
4. 表示される **「Bot User OAuth Token」** (`xoxb-` で始まる) をコピーして保存

### Step 4: Event Subscriptionsを有効化

1. 左メニュー **「Event Subscriptions」** をクリック
2. **「Enable Events」** をONにする
3. **「Request URL」** に以下を入力:

```
https://chiba-task-application.vercel.app/api/slack/events
```

4. Slackが自動でURL検証（challenge）を送信し、緑のチェックマーク ✓ が表示されるのを確認
   - ※ 先にStep 5の環境変数設定 & デプロイを完了してからこのステップを行うこと

5. **「Subscribe to bot events」** セクションで以下を追加:

| Event | 用途 |
|-------|------|
| `reaction_added` | リアクション追加の検知 |

6. **「Save Changes」** をクリック

### Step 5: Signing Secretを取得

1. 左メニュー **「Basic Information」** をクリック
2. **「App Credentials」** セクションの **「Signing Secret」** をコピー

### Step 6: カスタム絵文字を追加（任意）

1. Slackの **「設定」→「カスタマイズ」→「絵文字」** を開く
2. `:task:` という名前で好きな画像（チェックマーク等）を追加
3. ※ `:task:` を追加しない場合、デフォルトで `:white_check_mark:` ✅ と `:memo:` でも動作します

### Step 7: Vercel環境変数を設定

Vercelダッシュボード（https://vercel.com）→ プロジェクト → Settings → Environment Variables に以下を追加:

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `SLACK_BOT_TOKEN` | `xoxb-xxxxx...` | Step 3で取得したBot Token |
| `SLACK_SIGNING_SECRET` | `xxxxxxxx...` | Step 5で取得したSigning Secret |
| `SLACK_TASK_EMOJI` | `task` | タスク追加トリガーの絵文字名（コロン不要） |
| `SLACK_TASK_EMOJI_ALIASES` | `white_check_mark,memo` | 代替絵文字（カンマ区切り、任意） |

設定後、**「Redeploy」** ボタンでデプロイし直す。

### Step 8: Botをチャンネルに招待

タスク追加したいSlackチャンネルで以下を入力:

```
/invite @SOU Task Bot
```

※ Botが参加していないチャンネルではメッセージを取得できません。

### Step 9: 動作確認

1. Slackの任意のチャンネルで適当なメッセージを投稿
2. そのメッセージに `:task:` (または `:white_check_mark:`) をリアクション
3. 数秒後にスレッドで「SOU Task に追加しました」と返信が来ることを確認
4. https://chiba-task-application.vercel.app/ でタスクが追加されていることを確認
5. Google Tasks アプリでもタスクが表示されることを確認

---

## 推奨ワークフロー（設定後）

### Step 4のURL検証の順序について

Slackの「Request URL」検証は、実際にそのURLにHTTPリクエストを送って確認します。
そのため、以下の順序で進めてください:

1. Step 1〜3, 5 を完了
2. **Step 7** でVercel環境変数を設定 & Redeploy
3. デプロイ完了後に **Step 4** のRequest URLを設定

---

## 使い方

| やりたいこと | 操作 |
|-------------|------|
| メッセージをタスクにする | `:task:` リアクションを付ける |
| 代替方法 | `:white_check_mark:` ✅ または `:memo:` を付ける |
| タスクの確認・編集 | https://chiba-task-application.vercel.app/ |
| Google Tasksで確認 | Google Tasks モバイルアプリ |

### タスクに含まれる情報

| 項目 | 内容 |
|------|------|
| タイトル | メッセージ本文（200文字まで） |
| メモ | チャンネル名、Slackリンク、追加者名、元メッセージ |
| 期限 | リアクションした日（当日） |
| 優先度 | 中（デフォルト） |
| タスクリスト | SOU Task - 個人 |

---

## トラブルシューティング

| 症状 | 原因・対処 |
|------|-----------|
| リアクションしても何も起きない | Botがチャンネルに参加していない → `/invite @SOU Task Bot` |
| 「Google認証エラー」と返信される | Vercelの `GOOGLE_REFRESH_TOKEN` が期限切れ → アプリに再ログイン |
| URL検証が通らない | デプロイが完了していない → Vercelでデプロイ状態を確認 |
| 二重にタスクが作成される | Slack側のリトライ → 実装にdedup処理あり。通常は発生しない |

---

## 技術メモ（カイト用）

- APIルート: `src/app/api/slack/events/route.ts`
- Slackヘルパー: `src/lib/slack-events.ts`
- 認証: リクエスト署名検証（HMAC-SHA256）+ Refresh Token経由でGoogle API
- トリガー絵文字は環境変数で変更可能
- Vercelのサーバーレス関数のタイムアウト（10秒）内に収まるよう、Slackへの即レスポンス後にバックグラウンド処理
