# UI修正: 未実装ボタン・データ表示問題・パス不一致の一括修正

## 概要

デプロイ後の動作確認で、UIのボタンが全て未実装（onClickハンドラなし）であること、ダッシュボードのデータ表示に問題があることが判明。本Issueで一括修正する。

## 修正項目

### 1. ボタンのonClickハンドラ実装（最優先）

全て見た目だけ作られており、クリックしても何も起きない。

| ファイル | ボタン | 期待する動作 |
|---------|--------|------------|
| `src/components/dashboard/QuickActions.tsx` | 「タスクを追加...」 | `window.prompt` でタスク名入力 → `POST /api/tasks` で追加 → SWR mutate |
| `src/components/dashboard/QuickActions.tsx` | 「メモを追加」 | `router.push("/notes")` で遷移（メモページのaddモードを活用） |
| `src/components/dashboard/QuickActions.tsx` | 「音声で入力」 | 未対応なら `disabled` 属性追加 + ツールチップ「準備中」表示。対応するなら Web Speech API |
| `src/components/layout/BottomNav.tsx` 中央「+」ボタン | モバイル中央ボタン | `window.prompt` でタスク名入力 → `POST /api/tasks` で追加。現在 `href="#add"` で何もしない |
| `src/components/layout/BottomNav.tsx` サイドバー「新しいタスク」 | PC用サイドバーボタン | 同上のタスク追加処理 |
| `src/components/tasks/TaskCard.tsx` L128 | 「編集」ボタン | タスク編集モーダル or inline編集（タイトル・期限・優先度の `PATCH /api/tasks/:id`） |

**実装方針**: QuickActions と BottomNav はタスク追加用のカスタムフック `useQuickAddTask()` を共通化すると良い。`POST /api/tasks` → `mutate("/api/tasks?filter=today")` + `mutate("/api/tasks?filter=all")` でSWRキャッシュを更新する。

### 2. ダッシュボードのデータ表示修正

#### 2a. タスク表示フィルタ問題
- **現状**: `GreetingHeader` と `TodayTasks` が `useTasks("today")` を使用。`today` フィルタは `dueDate` が今日のタスクのみ表示する
- **問題**: 期限未設定のタスクが全く表示されない → 「タスク0件」になる
- **修正**: `src/app/api/tasks/route.ts` の `filterTasks` 関数で、`filter === "today"` の時に期限未設定タスクも含める。または `GreetingHeader` は `useTasks("all")` を使い、「全タスク X件」と表示する

#### 2b. 空状態UIの改善
- `src/components/dashboard/TodayTasks.tsx`: タスク0件時に「タスクを追加しよう」と誘導するUI追加
- `src/components/dashboard/TodaySchedule.tsx`: 予定0件時に「今日の予定はなし。集中できる日！」的な表示追加

### 3. `src/lib/github.ts` のパス不一致修正

`EMPLOYEES` 配列（L7-21）のパスが実際のリポジトリ構造と一致していない。

**修正対応表**:

| 現在のコード | 正しいパス |
|------------|-----------|
| `"神崎凛"` | `"リン_executive_COO"` |
| `"secretary/白波瀬みなみ"` | `"ミナミ_secretary_エグゼクティブ秘書"` |
| `"note-team/水瀬ことは"` | `"note-team/コトハ_note-team_リサーチャー"` |
| `"note-team/朝日つむぎ"` | `"note-team/ツムギ_note-team_ライター"` |
| `"note-team/橘そら"` | `"note-team/ソラ_note-team_ビジュアルデザイナー"` |
| `"note-team/藤堂蓮"` | `"note-team/レン_note-team_品質管理"` |
| `"web-team/結城颯"` | `"web-team/ソウ_web-team_WEBディレクター"` |
| `"web-team/桐谷凪"` | `"web-team/ナギ_web-team_デザイナー"` |
| `"web-team/真白悠"` | `"web-team/ユウ_web-team_ライター"` |
| `"web-team/蒼月海斗"` | `"web-team/カイト_web-team_エンジニア"` |
| `"prompt-team/白銀司"` | `"prompt-team/ツカサ_prompt-team_プロンプトエンジニア"` |
| `"slides-team/氷室翔"` | `"slides-team/ショウ_slides-team_営業資料スペシャリスト"` |
| `"slides-team/柚木陽菜"` | `"slides-team/ヒナ_slides-team_研修資料スペシャリスト"` |

また `name` も「神崎凛」→「リン」等に更新する。video-teamの2名（ヒカル_video-team_映像ディレクター、カナデ_video-team_映像エディター）も追加する。

### 4. サイドバーのストリーク表示ハードコード修正

`src/components/layout/BottomNav.tsx` L102-108 の「7日連続!」がハードコード。
`useGamification()` フックからデータ取得して動的に表示する。BottomNavは `"use client"` なので hook は使える。

### 5. 技術的な注意事項

- BottomNav の中央「+」ボタンは現在 `<button>` だが onClick がない。`<Link>` ではなく `<button>` のままで onClick を追加する
- QuickActions は props で `onAddTask` / `onAddMemo` を受け取る設計でもOK（親コンポーネントから注入）
- SWR の mutate は global mutate（`import { mutate } from "swr"`）を使えばどこからでもキャッシュ更新可能
- `window.prompt` は最小実装。将来的にはモーダルダイアログに置き換えたい

## 動作確認チェックリスト

- [ ] ダッシュボードの「タスクを追加...」ボタンでタスク追加できる
- [ ] BottomNav の「+」ボタンでタスク追加できる
- [ ] サイドバーの「新しいタスク」でタスク追加できる
- [ ] タスクカードの「編集」ボタンでタスク編集できる
- [ ] ダッシュボードに期限未設定タスクも表示される
- [ ] AI社員の動きセクションに正しいメンバー情報が表示される
- [ ] サイドバーのストリークが動的に表示される
- [ ] `npm run build` が成功する
