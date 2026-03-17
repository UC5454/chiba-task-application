# SOU Task

千葉勇志のADHD特性に最適化されたタスク管理PWA。AI社員チーム（my-ai-team）のステータス監視・日報閲覧も統合。

**本番URL**: https://chiba-task-application.vercel.app

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript |
| スタイル | Tailwind CSS v4 |
| UIコンポーネント | Radix UI (Dialog, Switch, Slider, Tabs, Toast等) |
| データフェッチ | SWR |
| 認証 | NextAuth.js v4 (Google OAuth) |
| タスクデータ | Google Tasks API |
| メタデータDB | Supabase (PostgreSQL) |
| メモ・日報 | Notion API (SDK v5.9.0 / API 2025-09-03) |
| AI社員ステータス | GitHub Contents API |
| 通知 | Web Push (VAPID) + Slack Webhook |
| ホスティング | Vercel |
| アニメーション | Framer Motion, canvas-confetti |

## 機能一覧

### タスク管理
- Google Tasksと双方向同期
- 3タブ切替: 今日 / すべて / 完了済み
- 優先度(高中低)・カテゴリ(DG/BND/SOU/AI_COMMUNITY/PERSONAL)
- 期限超過タスクの自動検出・リスケジュール・手放し機能
- 完了時のconfettiアニメーション（楽観的UI更新）
- 完了タスク統計バナー（今日/今週/累計）
- 完了日の相対表示（今日完了、X日前に完了）

### AI社員ステータス
- 16名のAI社員のリアルタイム状況表示（GitHub CurrentTask.md / INBOX.md から取得）
- カードクリックで詳細ドロワー表示
  - 現在のタスク・INBOX未処理数
  - 日報内容（Markdownそのまま表示）
  - 日付チップで過去の日報を切替閲覧

### Notion連携
- メモのCRUD（Notion Database）
- タスク完了/手放し履歴の記録
- AI社員日報のNotion同期（`POST /api/team-logs`）

### ゲーミフィケーション
- 連続達成ストリーク（3日/7日/30日バッジ）
- 累計完了数バッジ（10/50/100件）
- 早朝完了・全タスク完了・超過ゼロバッジ

### 通知
- Web Pushリマインド（Vercel Cron: 毎日9時）
- Slack Webhook連携（Block Kit形式、設定でON/OFF可能）
- リマインドタイプ: 明日期限/今日期限/1日超過/3日超過/7日超過/14日超過

### ADHD最適化設定
- ポモドーロ時間・休憩時間のカスタマイズ
- 過集中アラート閾値
- 1日の最大タスク数制限
- 静穏時間帯設定
- やさしいリマインドモード
- 自動手放し（N日超過で自動リリース）
- 設定変更は800msデバウンスで即時反映

## ディレクトリ構成

```
src/
├── app/
│   ├── page.tsx              # ダッシュボード
│   ├── tasks/page.tsx        # タスク一覧
│   ├── focus/page.tsx        # フォーカスモード
│   ├── notes/page.tsx        # メモ
│   ├── settings/page.tsx     # ADHD設定
│   ├── providers.tsx         # SWR設定・テーマ
│   └── api/
│       ├── auth/             # NextAuth
│       ├── tasks/            # タスクCRUD・完了・手放し・リスケ
│       ├── notes/            # メモCRUD
│       ├── settings/         # ADHD設定 GET/PUT
│       ├── team-status/      # AI社員ステータス + 詳細API
│       ├── team-logs/        # AI社員日報取得・Notion同期
│       ├── gamification/     # ゲーミフィケーション
│       ├── calendar/         # Googleカレンダー
│       ├── remind/           # Cronリマインド + Slack通知
│       ├── push/             # Web Push購読管理
│       └── health/           # ヘルスチェック
├── components/
│   ├── dashboard/            # ダッシュボード系（TeamStatus, EmployeeDetailDrawer等）
│   ├── tasks/                # タスク系（TaskCard, TaskFilter, OverdueSection）
│   ├── notes/                # メモ系
│   ├── focus/                # フォーカスモード
│   ├── layout/               # BottomNav, Header
│   ├── pwa/                  # Service Worker登録
│   └── ui/                   # 共通UI（ConfirmDialog, InputDialog, Toast）
├── hooks/
│   ├── useTasks.ts           # タスク + 完了統計
│   ├── useTeamStatus.ts      # AI社員一覧
│   ├── useEmployeeDetail.ts  # AI社員詳細
│   ├── useSettings.ts        # ADHD設定
│   ├── useGamification.ts    # ゲーミフィケーション
│   ├── useNotes.ts           # メモ
│   ├── useCalendar.ts        # カレンダー
│   └── fetcher.ts            # SWR共通fetcher
├── lib/
│   ├── google-tasks.ts       # Google Tasks API操作
│   ├── google-calendar.ts    # Google Calendar API
│   ├── google-auth.ts        # OAuth トークン管理
│   ├── github.ts             # AI社員ステータス・日報取得
│   ├── notion.ts             # メモ・タスク履歴・日報Notion同期
│   ├── reminders.ts          # リマインド生成ロジック
│   ├── push.ts               # Web Push送信
│   ├── gamification.ts       # ストリーク・バッジ計算
│   ├── supabase.ts           # Supabaseクライアント
│   ├── auth.ts               # NextAuth設定
│   └── api-auth.ts           # API認証ヘルパー
└── types/
    └── index.ts              # 全型定義
```

## 外部サービス連携

### Google (OAuth + APIs)
- **認証**: Google OAuthでログイン（許可メール: `ALLOWED_EMAIL`）
- **Tasks API**: タスクのCRUD・完了・削除
- **Calendar API**: 今日の予定取得

### Supabase
- `adhd_settings`: ADHD設定テーブル
- `task_metadata`: タスクメタデータ（優先度・カテゴリ・担当AI・見積時間）
- `gamification`: ストリーク・バッジデータ
- `push_subscriptions`: Web Push購読情報

### Notion (SDK v5.9.0 / API 2025-09-03)
- **メモDB** (`NOTION_MEMO_DB_ID`): メモのCRUD
- **タスク履歴DB** (`NOTION_TASK_HISTORY_DB_ID`): 完了/手放し記録
- **AI社員日報DB** (`NOTION_DAILY_LOG_DB_ID`): data_source_id `473b53d2-...`
  - プロパティ: Name(title), Date(date), Employee(select), Team(select)
  - `pages.create` は `parent: { data_source_id }` で指定（API 2025-09-03のdatabase/data_source二層構造）

### GitHub Contents API
- リポジトリ: `UC5454/my-ai-team`
- 16名のAI社員の `CurrentTask.md`, `INBOX.md`, `daily-logs/*.md` を取得
- キャッシュ: 5分 (`revalidate: 300`)

### Slack
- Webhook URL経由でリマインド通知
- Block Kit形式（タスク名太字 + ステータスラベル）
- `slackNotifyEnabled` 設定で送信ON/OFF制御

### Vercel Cron
- `/api/remind`: 毎日9:00 JST実行
- 認証: `CRON_SECRET` ヘッダー

## セットアップ

### 1. 環境変数

```bash
cp .env.example .env.local
```

`.env.local` に以下を設定:

```env
# NextAuth
NEXTAUTH_SECRET=<ランダム文字列>
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=<Google Cloud Console>
GOOGLE_CLIENT_SECRET=<Google Cloud Console>
GOOGLE_REFRESH_TOKEN=<初回ログイン後に取得>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>

# Notion
NOTION_API_KEY=<Notion Integration Token>
NOTION_MEMO_DB_ID=<メモDB ID>
NOTION_TASK_HISTORY_DB_ID=<タスク履歴DB ID>
NOTION_DAILY_LOG_DB_ID=<AI社員日報 data_source ID>

# GitHub
GITHUB_TOKEN=<GitHub PAT>
GITHUB_OWNER=UC5454
GITHUB_REPO=my-ai-team

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Web Push
VAPID_PUBLIC_KEY=<VAPID公開鍵>
VAPID_PRIVATE_KEY=<VAPID秘密鍵>

# Vercel Cron
CRON_SECRET=<ランダム文字列>

# 許可ユーザー
ALLOWED_EMAIL=y.chiba@digital-gorilla.co.jp
```

### 2. 起動

```bash
npm install
npm run dev
```

http://localhost:3000 でアクセス。

### 3. ビルド・デプロイ

```bash
npm run build    # ローカルビルド確認
vercel --prod    # 本番デプロイ
```

## API一覧

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/tasks?filter=today\|all\|completed` | タスク一覧（completed時は統計付き） |
| POST | `/api/tasks` | タスク作成 |
| PUT | `/api/tasks/[id]` | タスク更新 |
| DELETE | `/api/tasks/[id]` | タスク削除 |
| POST | `/api/tasks/[id]/complete` | タスク完了 |
| POST | `/api/tasks/[id]/release` | タスク手放し |
| POST | `/api/tasks/[id]/reschedule` | タスクリスケジュール |
| GET | `/api/team-status` | AI社員一覧 |
| GET | `/api/team-status/[id]?date=YYYY-MM-DD` | AI社員詳細（日報含む） |
| GET | `/api/team-logs?date=YYYY-MM-DD` | AI社員日報一覧（GitHub） |
| POST | `/api/team-logs` | AI社員日報をNotionに同期 |
| POST | `/api/team-logs/setup` | Notion日報DBセットアップ |
| GET/PUT | `/api/settings` | ADHD設定 |
| GET | `/api/gamification` | ゲーミフィケーションデータ |
| GET | `/api/calendar` | 今日のカレンダー予定 |
| GET/POST/PUT/DELETE | `/api/notes` | メモCRUD |
| GET | `/api/remind` | Cronリマインド（Push+Slack） |
| POST | `/api/push/subscribe` | Web Push購読登録 |

## SWR設定

```typescript
dedupingInterval: 30000      // 30秒間は同一リクエストを重複排除
focusThrottleInterval: 300000 // フォーカス復帰時の再検証は5分間隔
revalidateOnFocus: false      // フォーカス復帰での自動再検証OFF
keepPreviousData: true        // データ更新中は前回データを表示
```

## 注意事項

- **Notion API 2025-09-03**: database と data_source の二層構造。`pages.create` のparentには `data_source_id` を使用
- **Google Tasks completedAt**: RFC 3339形式。完了タスクのソート・表示に使用
- **Service Worker**: API routes (`/api/`) はキャッシュ対象外（HTMLリダイレクトバグ対策済み）
- **デバウンス**: 設定ページの+/-ボタンは800msデバウンスでAPI呼び出しを最適化
