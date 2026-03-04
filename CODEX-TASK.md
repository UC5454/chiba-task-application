# CODEX-TASK: SOU Task アプリ大幅改善

## 概要
SOU Task（ADHD配慮タスク管理PWA）の5つの改善を実施する。
技術スタック: Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + Radix UI + SWR + Framer Motion + Lucide React

**重要**: ビルドが通ること（`npm run build` が成功すること）を必ず確認すること。

---

## Task 1: タスク登録の簡易化（インライン入力）

### 現状
- ダッシュボードの `QuickActions` と `BottomNav` の「+」ボタンは `InputDialog`（モーダル）を開く
- タスクページの「+ 追加」ボタンも同様にモーダル
- モーダルを開く→入力→保存の3ステップが必要

### 要件
**ダッシュボードのQuickActionsをインライン入力に変更する**:
1. `src/components/dashboard/QuickActions.tsx` の「タスクを追加...」ボタンをクリックすると、**その場でテキスト入力に切り替わる**（モーダルではなく）
2. テキスト入力フィールドはボタンと同じ位置・サイズで表示される
3. Enterキーで即座に送信、Escapeキーでキャンセル
4. 送信後は入力フィールドを維持し、連続追加可能にする（フォーカスを維持）
5. 3秒間操作がなければ自動的にボタン表示に戻る（blur時）
6. InputDialogのインポートと使用を削除し、代わりにインラインstateで管理する

**タスクページも同様にインライン化**:
1. `src/app/tasks/page.tsx` のヘッダー横の「+ 追加」ボタンをクリックすると、タスクリストの先頭にインライン入力行が表示される
2. カード風のスタイル（`card-elevated` class使用）で入力フィールドを表示
3. Enterで送信、Escapeでキャンセル
4. placeholder: 「タスク名を入力してEnter」

**BottomNavの+ボタンはそのまま**（モーダルのまま維持。モバイルでは画面下部からのモーダルが自然なため）

### 対象ファイル
- `src/components/dashboard/QuickActions.tsx` — インライン入力に書き換え
- `src/app/tasks/page.tsx` — インライン入力行を追加

---

## Task 2: リマインド強化 & スヌーズ機能

### 現状
- `src/lib/reminders.ts` でリマインダーを生成するが、スヌーズ機能がない
- `ReminderAction` は `reschedule_today` | `reschedule_tomorrow` | `reschedule_week` | `release` | `open` のみ
- リマインダーはUIに表示されるがスヌーズ不可

### 要件

**1. Reminder型にスヌーズアクションを追加**:
`src/types/index.ts` の `ReminderAction.action` に以下を追加:
```typescript
action: 'reschedule_today' | 'reschedule_tomorrow' | 'reschedule_week' | 'release' | 'open' | 'snooze_15m' | 'snooze_1h' | 'snooze_3h' | 'snooze_tomorrow';
```

**2. reminders.ts のアクションを強化**:
`src/lib/reminders.ts` の `actions` 配列を以下に変更:
```typescript
const actions: ReminderAction[] = [
  { label: "15分後", action: "snooze_15m" },
  { label: "1時間後", action: "snooze_1h" },
  { label: "明日にする", action: "reschedule_tomorrow" },
  { label: "開く", action: "open" },
];
```

**3. スヌーズ状態管理用hookを新規作成**:
`src/hooks/useSnooze.ts` を新規作成:
```typescript
"use client";
import { useState, useCallback, useEffect } from "react";

type SnoozedReminder = {
  taskId: string;
  until: number; // Unix timestamp (ms)
};

const STORAGE_KEY = "sou-task:snoozed";

export function useSnooze() {
  const [snoozed, setSnoozed] = useState<SnoozedReminder[]>([]);

  // localStorage から復元
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as SnoozedReminder[];
      // 期限切れを除外
      const active = parsed.filter((s) => s.until > Date.now());
      setSnoozed(active);
    }
  }, []);

  const snooze = useCallback((taskId: string, minutes: number) => {
    const until = Date.now() + minutes * 60 * 1000;
    setSnoozed((prev) => {
      const next = [...prev.filter((s) => s.taskId !== taskId), { taskId, until }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isSnoozed = useCallback(
    (taskId: string) => snoozed.some((s) => s.taskId === taskId && s.until > Date.now()),
    [snoozed],
  );

  return { snooze, isSnoozed };
}
```

**4. リマインダー表示コンポーネントを新規作成**:
`src/components/dashboard/ReminderBanner.tsx` を新規作成:
- `generateReminders()` の結果を表示するバナーコンポーネント
- 各リマインダーにスヌーズボタン（15分後、1時間後）を表示
- スヌーズ中のリマインダーは非表示にする（`useSnooze` の `isSnoozed` で判定）
- デザイン: `card-elevated` ベース、左にアイコン（Bell）、右にアクションボタン群
- アニメーション: `animate-fade-in-up`
- スヌーズボタンはコンパクトなpill型（`rounded-full px-2 py-0.5 text-[10px]`）

**5. ダッシュボードに組み込み**:
`src/components/dashboard/DashboardTabs.tsx` の `activeTab === "today"` 内の `<OverdueBanner />` の直後に `<ReminderBanner />` を追加

### 対象ファイル
- `src/types/index.ts` — ReminderAction.action にスヌーズ追加
- `src/lib/reminders.ts` — actionsをスヌーズ対応に変更
- `src/hooks/useSnooze.ts` — 新規作成
- `src/components/dashboard/ReminderBanner.tsx` — 新規作成
- `src/components/dashboard/DashboardTabs.tsx` — ReminderBanner追加

---

## Task 3: チームOverviewの数値を動的更新

### 現状
- `useTeamMetrics.ts` が `/team-metrics.json` 静的ファイルをfetchしている
- データが古いまま更新されない

### 要件

**1. APIエンドポイントを新規作成**:
`src/app/api/team-metrics/route.ts` を新規作成:
```typescript
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // public/team-metrics.json を読み込む（ビルド時にコピーされるため）
    const filePath = path.join(process.cwd(), "public", "team-metrics.json");
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "team-metrics.json not found" },
      { status: 404 },
    );
  }
}
```

注意: `src/app/api/team-metrics/detail/route.ts` が既に存在する。新規の `route.ts` は `src/app/api/team-metrics/route.ts`（detailとは別パス）に作成すること。

**2. useTeamMetrics hookを更新**:
`src/hooks/useTeamMetrics.ts` のfetch先を変更:
```typescript
// 変更前:
const { data, error, isLoading } = useSWR<TeamMetrics>("/team-metrics.json", fetcher, {
  dedupingInterval: 300_000,
  revalidateOnFocus: false,
});

// 変更後:
const { data, error, isLoading } = useSWR<TeamMetrics>("/api/team-metrics", fetcher, {
  dedupingInterval: 60_000,         // 1分に短縮
  revalidateOnFocus: true,          // フォーカス時に再取得
  refreshInterval: 300_000,         // 5分おきに自動更新
});
```

**3. TeamOverviewに更新日時を表示**:
`src/components/dashboard/TeamOverview.tsx` のヘッダー部分（「タップで詳細」のテキスト位置）に `generatedAt` を表示:
```tsx
<span className="text-[9px] text-[var(--color-muted)]">
  {metrics.generatedAt
    ? `更新: ${new Date(metrics.generatedAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
    : "タップで詳細"}
</span>
```

### 対象ファイル
- `src/app/api/team-metrics/route.ts` — 新規作成
- `src/hooks/useTeamMetrics.ts` — fetch先とオプション変更
- `src/components/dashboard/TeamOverview.tsx` — 更新日時表示追加

---

## Task 4: UI全面リデザイン（洗練・モダン化）

### 現状のデザインシステム
- Apple/Linear inspired CSS variables（`globals.css`）
- 角丸（`--radius-xl: 20px`）多用
- shadow-card でカード浮遊感
- 青（`#2563EB`）をprimary color

### 要件

**デザインコンセプト: "Calm Productivity" — 静謐で集中力を促すUI**

**1. globals.css のデザイントークン更新** (`src/app/globals.css`):
以下の変数を `@theme inline` ブロック内に追加する（既存変数は変更しない、追加のみ）:
```css
--color-gradient-start: #2563EB;
--color-gradient-end: #7C3AED;
--color-card-border: rgba(0, 0, 0, 0.04);
```

背景色を更新:
```css
--color-background: #F8F9FB;
```

シャドウを更新（既存を上書き）:
```css
--shadow-card: 0 1px 2px rgba(0,0,0,0.02), 0 2px 8px rgba(0,0,0,0.03);
--shadow-card-hover: 0 2px 4px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.05);
```

`.glass` クラスを更新:
```css
.glass {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(24px) saturate(200%);
  -webkit-backdrop-filter: blur(24px) saturate(200%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}
```

**2. BottomNav のリデザイン** (`src/components/layout/BottomNav.tsx`):
- デスクトップサイドバーのロゴ部分: 現在のグラデーション背景に「S」テキストを `<img src="/logo.png" alt="SOU Task" className="w-10 h-10 rounded-[var(--radius-md)]" />` に変更
- モバイルのボトムナビの中央ボタン（+）にグラデーション: `from-[var(--color-gradient-start)] to-[var(--color-gradient-end)]`（`from-[var(--color-primary-light)] to-[var(--color-primary)]` を置き換え）

**3. DashboardTabs の画面構成改善** (`src/components/dashboard/DashboardTabs.tsx`):
- `max-w-3xl` → `max-w-2xl`（モバイルでの余白を確保）
- セクション間の `space-y-8` → `space-y-6`（コンパクトに）

**4. GreetingHeader の改善**:
- `src/components/dashboard/GreetingHeader.tsx` を確認し、挨拶テキストのフォントサイズを `text-2xl` → `text-xl` に変更（存在する場合のみ）。日付部分を `text-xs text-[var(--color-muted)]` に統一

**5. QuickActions のデザイン改善** (`src/components/dashboard/QuickActions.tsx`):
- メモボタンと音声ボタンのサイズを `w-12 h-12` → `w-11 h-11` に統一
- カードに `border border-[var(--color-card-border)]` を追加

**6. TeamOverview のデザイン改善** (`src/components/dashboard/TeamOverview.tsx`):
- メトリクスカードの `bg-[var(--color-surface-hover)]` → `bg-[var(--color-background)]` に変更
- グリッド: `grid-cols-3` → `grid-cols-2 sm:grid-cols-3` に変更（小さい画面で見やすく）
- カード内数値: `text-lg` → `text-xl` に変更

**7. タスクページの微調整** (`src/app/tasks/page.tsx`):
- `space-y-2.5` → `space-y-2`

**重要な制約**:
- 既存の CSS variables を壊さない。上書きは明記されたもののみ
- Tailwind CSS 4 の `@theme inline` ブロック内に追加する
- `btn-press`, `card-elevated`, `animate-*` クラスは変更しない

### 対象ファイル
- `src/app/globals.css` — デザイントークン追加・更新
- `src/components/layout/BottomNav.tsx` — ロゴ・グラデーション
- `src/components/dashboard/DashboardTabs.tsx` — レイアウト微調整
- `src/components/dashboard/GreetingHeader.tsx` — テキストサイズ調整（存在する場合）
- `src/components/dashboard/QuickActions.tsx` — デザイン微調整
- `src/app/tasks/page.tsx` — カード間隔調整
- `src/components/dashboard/TeamOverview.tsx` — グリッド・カラー調整

---

## Task 5: ロゴの適用

### 要件
1. `/public/logo.png` にロゴファイルが配置されていることを想定する
2. `src/components/layout/BottomNav.tsx` のデスクトップサイドバーロゴを `<img>` タグに変更（Task 4で実施済み）
3. `src/app/layout.tsx` の metadata に icons を設定:
```typescript
icons: {
  icon: "/logo.png",
  apple: "/logo.png",
},
```
4. 既存の favicon 設定があれば `/logo.png` に置き換え

### 対象ファイル
- `src/components/layout/BottomNav.tsx` — Task 4で対応済み
- `src/app/layout.tsx` — favicon/icon設定

---

## 実装順序
1. Task 1（インライン入力化）
2. Task 2（スヌーズ機能）
3. Task 3（チーム数値動的更新）
4. Task 4（UIリデザイン）
5. Task 5（ロゴ適用）

## ビルド確認
全タスク完了後、`npm run build` が成功することを確認する。TypeScriptエラー、import不足、未使用変数がないこと。
