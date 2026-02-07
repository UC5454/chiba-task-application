# AGENTS.md - SOU Task Implementation Guide for Codex

## Overview

SOU Task is a **personal task management PWA** designed specifically for a user with ADHD/ASD traits.
The UI mockups are already built with Next.js 14 + Tailwind CSS. Your job is to **wire up the real functionality** and deploy to Vercel.

**IMPORTANT**: The design mockups in `src/` are the source of truth for UI. Do NOT change the visual design, layout, colors, spacing, or component structure unless fixing a bug. All styling decisions have been made with ADHD accessibility in mind.

---

## Tech Stack (already installed)

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS 4 (design tokens in `globals.css`)
- **UI Primitives**: Radix UI (`@radix-ui/react-*`)
- **Data Fetching**: SWR
- **Auth**: NextAuth.js + Google OAuth 2.0
- **Google APIs**: `googleapis` (Tasks API, Calendar API)
- **Notion**: `@notionhq/client` (memo DB, task history DB)
- **Database**: `@supabase/supabase-js` (auxiliary metadata)
- **Push Notifications**: `web-push`
- **Animation**: `canvas-confetti`, `framer-motion`
- **Icons**: `lucide-react`
- **Hosting**: Vercel

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout (BottomNav, fonts, metadata)
│   ├── page.tsx            # Dashboard (main page)
│   ├── focus/page.tsx      # Focus mode (pomodoro timer)
│   ├── tasks/page.tsx      # Task list
│   ├── notes/page.tsx      # Memo list
│   ├── settings/page.tsx   # Settings
│   └── api/                # API Routes (TO BE IMPLEMENTED)
│       ├── auth/[...nextauth]/route.ts
│       ├── tasks/route.ts
│       ├── tasks/[id]/route.ts
│       ├── tasks/[id]/complete/route.ts
│       ├── tasks/[id]/release/route.ts
│       ├── tasks/[id]/reschedule/route.ts
│       ├── calendar/route.ts
│       ├── notes/route.ts
│       ├── notes/[id]/route.ts
│       ├── team-status/route.ts
│       ├── remind/route.ts        # Vercel Cron endpoint
│       ├── settings/route.ts
│       ├── gamification/route.ts
│       └── push/
│           ├── subscribe/route.ts
│           └── unsubscribe/route.ts
├── components/
│   ├── layout/BottomNav.tsx
│   ├── dashboard/          # Dashboard components (MOCK → wire to real data)
│   ├── tasks/              # Task components
│   ├── notes/              # Note components
│   ├── focus/              # Focus mode components
│   └── ui/                 # Shared UI primitives
├── lib/                    # TO BE IMPLEMENTED
│   ├── auth.ts             # NextAuth config
│   ├── google-tasks.ts     # Google Tasks API wrapper
│   ├── google-calendar.ts  # Google Calendar API wrapper
│   ├── notion.ts           # Notion API wrapper
│   ├── supabase.ts         # Supabase client
│   ├── github.ts           # GitHub API (team status)
│   ├── reminders.ts        # Reminder logic
│   ├── gamification.ts     # Streak/badge logic
│   └── push.ts             # Web Push utils
├── hooks/                  # TO BE IMPLEMENTED
│   ├── useTasks.ts
│   ├── useCalendar.ts
│   ├── useNotes.ts
│   ├── useTeamStatus.ts
│   ├── useGamification.ts
│   └── useSettings.ts
└── types/index.ts          # All TypeScript types (DONE)
```

---

## Implementation Tasks (in order)

### Phase 1: Auth + Core APIs

1. **`lib/auth.ts`** — NextAuth.js config with Google OAuth
   - Only allow `ALLOWED_EMAIL` env var to sign in
   - Request scopes: `https://www.googleapis.com/auth/tasks`, `https://www.googleapis.com/auth/calendar.readonly`
   - Store access token in session for API calls

2. **`app/api/auth/[...nextauth]/route.ts`** — NextAuth route handler

3. **`lib/supabase.ts`** — Supabase client (server + client)

4. **`lib/google-tasks.ts`** — Google Tasks API wrapper
   - `listTasks(accessToken, listId?)` → Task[]
   - `createTask(accessToken, task)` → Task
   - `updateTask(accessToken, taskId, updates)` → Task
   - `completeTask(accessToken, taskId)` → void
   - `deleteTask(accessToken, taskId)` → void
   - Task lists: "SOU Task - 個人", "SOU Task - AI委譲", "SOU Task - ルーティン"

5. **`lib/google-calendar.ts`** — Google Calendar API wrapper
   - `getTodayEvents(accessToken)` → CalendarEvent[]

### Phase 2: Task CRUD API Routes

6. **`app/api/tasks/route.ts`**
   - GET: List tasks (filter by today/all/completed, merge with Supabase metadata)
   - POST: Create task (Google Tasks + Supabase metadata)

7. **`app/api/tasks/[id]/route.ts`**
   - PUT: Update task
   - DELETE: Delete task

8. **`app/api/tasks/[id]/complete/route.ts`**
   - POST: Complete task → update Google Tasks → write to Notion task history DB → update gamification

9. **`app/api/tasks/[id]/release/route.ts`**
   - POST: Release (give up) task → write to Notion with status="手放し"

10. **`app/api/tasks/[id]/reschedule/route.ts`**
    - POST: Reschedule task (body: `{ newDueDate: "today" | "tomorrow" | "this_week" | string }`)

### Phase 3: Notion Integration

11. **`lib/notion.ts`** — Notion API wrapper
    - `createMemo(content, tags, relatedTask?)` → write to Memo DB
    - `listMemos(tag?, search?)` → read from Memo DB
    - `updateMemo(pageId, updates)` → update Memo DB
    - `deleteMemo(pageId)` → archive in Memo DB
    - `writeTaskHistory(task, status)` → write to Task History DB
    - Notion DB IDs come from env vars

12. **`app/api/notes/route.ts`** — GET (list) + POST (create)
13. **`app/api/notes/[id]/route.ts`** — PUT (update) + DELETE

### Phase 4: Wire UI to Real Data

14. **Create SWR hooks** in `hooks/`:
    - `useTasks(filter?)` → calls `/api/tasks`
    - `useCalendar()` → calls `/api/calendar`
    - `useNotes(tag?, search?)` → calls `/api/notes`
    - `useTeamStatus()` → calls `/api/team-status`
    - `useGamification()` → calls `/api/gamification`
    - `useSettings()` → calls `/api/settings`

15. **Replace mock data in all components** with SWR hooks
    - Dashboard: `GreetingHeader`, `TodayTasks`, `TodaySchedule`, `OverdueBanner`, `StreakCard`, `TeamStatus`
    - Tasks: `TaskCard`, `TaskFilter`, `OverdueSection`
    - Notes: memo list
    - Settings: read/write settings

16. **Wire up interactive actions**:
    - Task complete → `POST /api/tasks/[id]/complete` → confetti animation (canvas-confetti)
    - Task release → `POST /api/tasks/[id]/release`
    - Task reschedule → `POST /api/tasks/[id]/reschedule`
    - Quick add → `POST /api/tasks` with minimal data
    - Memo save → `POST /api/notes`
    - Settings save → `PUT /api/settings`

### Phase 5: Team Status + GitHub

17. **`lib/github.ts`** — GitHub API wrapper (Octokit)
    - `getTeamStatus()` → read CurrentTask.md + INBOX.md for all 13 AI employees
    - Parse markdown to extract current task text
    - Count unprocessed INBOX items (lines starting with `- [ ]`)
    - Employee config: see `src/types/index.ts` AIEmployee type

18. **`app/api/team-status/route.ts`** — GET: return all employees with status
    - Cache results for 5 minutes (stale-while-revalidate)

### Phase 6: Reminders

19. **`lib/reminders.ts`** — Reminder logic
    - Check all active tasks against current time
    - Generate reminder messages based on overdue status:
      - Due tomorrow evening: "明日が期限だよ: [task]。今日のうちにちょっとだけ手をつけてみる?"
      - Due today morning: "今日中にやれるといいな: [task]"
      - Due in 3 hours: "[task]、今やっちゃう? 15分だけでもいいよ"
      - 1 day overdue: "昨日のやつ、今日のどこかでやれそう?"
      - 3 days overdue: "[task]、3日過ぎたけど気にしないで。いつならできそう?"
      - 7 days overdue: "[task]、1週間経ったね。まだやりたい? 手放してもOKだよ"
      - 14 days overdue: "[task]、2週間放置中。自動で手放しリストに入れるね"
    - Respect quiet hours (default 22:00-07:00)
    - IMPORTANT: Tone must be gentle, never commanding. No pressure.

20. **`lib/push.ts`** — Web Push utilities
    - `sendPushNotification(subscription, message)` → send via web-push

21. **`app/api/remind/route.ts`** — Vercel Cron endpoint
    - Verify CRON_SECRET header
    - Run reminder check
    - Send Web Push + Slack notifications

22. **`vercel.json`** — Configure cron job
    ```json
    { "crons": [{ "path": "/api/remind", "schedule": "*/15 * * * *" }] }
    ```

### Phase 7: Gamification

23. **`lib/gamification.ts`** — Streak and badge logic
    - Update streak on task completion
    - Check badge conditions:
      - "3日連続", "7日連続", "30日連続"
      - "累計10件", "累計50件", "累計100件"
      - "朝イチ完了" (completed before 9 AM)
      - "全部やった！" (all daily tasks completed)
      - "やり残しゼロ！" (all overdue tasks processed)

24. **`app/api/gamification/route.ts`** — GET: current gamification state

### Phase 8: PWA

25. **PWA Configuration**
    - Create `public/manifest.json` with name "SOU Task", theme_color "#2563EB"
    - Create app icons (192x192, 512x512) — use a simple "S" logo with primary color background
    - Configure next-pwa or use `@serwist/next` for service worker
    - Enable offline caching for static assets

26. **Push notification subscription flow**
    - `app/api/push/subscribe/route.ts` — save subscription to Supabase
    - `app/api/push/unsubscribe/route.ts` — remove subscription

### Phase 9: Deploy

27. **Vercel deployment**
    - Ensure all env vars are set
    - Configure Google OAuth redirect URLs for production domain
    - Test cron job execution
    - Verify PWA installability

---

## Supabase Schema

Run this migration on your Supabase project:

```sql
-- Task metadata (linked to Google Task ID)
CREATE TABLE task_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_task_id TEXT NOT NULL UNIQUE,
  priority INTEGER DEFAULT 2 CHECK (priority IN (1, 2, 3)),
  category TEXT CHECK (category IN ('DG','BND','SOU','AI_COMMUNITY','PERSONAL')),
  assigned_ai_employee TEXT,
  remind_at TIMESTAMPTZ[],
  estimated_minutes INTEGER,
  overdue_remind_count INTEGER DEFAULT 0,
  auto_release_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gamification (single row for the user)
CREATE TABLE gamification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  total_released INTEGER DEFAULT 0,
  last_completed_date DATE,
  badges JSONB DEFAULT '[]'
);

-- ADHD Settings (single row)
CREATE TABLE adhd_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  max_daily_tasks INTEGER DEFAULT 5,
  focus_duration INTEGER DEFAULT 25,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  gentle_remind BOOLEAN DEFAULT TRUE,
  celebration_enabled BOOLEAN DEFAULT TRUE,
  auto_release_enabled BOOLEAN DEFAULT TRUE,
  auto_release_days INTEGER DEFAULT 14
);

-- Push subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default rows
INSERT INTO gamification DEFAULT VALUES;
INSERT INTO adhd_settings DEFAULT VALUES;
```

---

## AI Employee Config (for Team Status)

There are 13 AI employees organized in 4 teams + 2 direct reports.
Their files are in the GitHub repo `UC5454/my-ai-team`:

| Name | ID | Team | Role | Path |
|------|-----|------|------|------|
| 神崎凛 | kanzaki-rin | executive | COO | 神崎凛/ |
| 白波瀬みなみ | shirahase-minami | secretary | エグゼクティブ秘書 | secretary/白波瀬みなみ/ |
| 水瀬ことは | minase-kotoha | note-team | リサーチャー | note-team/水瀬ことは/ |
| 朝日つむぎ | asahi-tsumugi | note-team | ライター | note-team/朝日つむぎ/ |
| 橘そら | tachibana-sora | note-team | デザイナー | note-team/橘そら/ |
| 藤堂蓮 | todo-ren | note-team | 品質管理 | note-team/藤堂蓮/ |
| 結城颯 | yuuki-sou | web-team | WEBディレクター | web-team/結城颯/ |
| 桐谷凪 | kiritani-nagi | web-team | デザイナー | web-team/桐谷凪/ |
| 真白悠 | mashiro-yuu | web-team | ライター | web-team/真白悠/ |
| 蒼月海斗 | aotsuki-kaito | web-team | エンジニア | web-team/蒼月海斗/ |
| 白銀司 | shirogane-tsukasa | prompt-team | プロンプトエンジニア | prompt-team/白銀司/ |
| 氷室翔 | himuro-sho | slides-team | 営業資料制作 | slides-team/氷室翔/ |
| 柚木陽菜 | yuzuki-hina | slides-team | 研修資料制作 | slides-team/柚木陽菜/ |

For each employee, read:
- `{path}/CurrentTask.md` — current task description
- `{path}/INBOX.md` — count lines starting with `- [ ]` for unprocessed count

---

## Design Rules (DO NOT CHANGE)

- **Color tokens**: defined in `globals.css` as CSS custom properties
- **Priority colors**: High=#EF4444(red), Mid=#F59E0B(yellow), Low=#22C55E(green)
- **Border radius**: Use `var(--radius-sm/md/lg/xl/full)`
- **Shadows**: Use `var(--shadow-sm/md/lg/xl)`
- **Font**: Inter + Japanese fallbacks
- **Max 5 tasks** displayed at once on dashboard (ADHD consideration)
- **Card-based UI** for task list (not list-based)
- **Swipe gestures**: Right=complete, Left=postpone to tomorrow
- **Bottom navigation** on mobile with center FAB (+) button
- **Sidebar navigation** on desktop (md: breakpoint)
- **Confetti animation** on task completion using `canvas-confetti`

---

## Key Behavioral Rules

1. **Gentle reminders only** — never use commanding language
2. **"Release" is not "failure"** — frame it as "organizing" or "letting go"
3. **One-tap actions** — all reminder notifications must include action buttons
4. **Default values** — quick add defaults to: today, priority=medium, no category
5. **Single user** — no multi-user, no team features. Auth restricts to one Google account.
6. **Notion writes are intentional** — memo saves and task completions write to Notion. This is an approved operation.

---

## Testing Checklist

Before marking as complete:

- [ ] `npm run build` succeeds with no errors
- [ ] Auth flow works (Google sign-in, only allowed email)
- [ ] Dashboard shows real tasks from Google Tasks
- [ ] Dashboard shows real calendar events
- [ ] Quick add creates a task (title only → defaults applied)
- [ ] Task complete triggers confetti + Notion history write
- [ ] Task release writes to Notion with status=手放し
- [ ] Memo save writes to Notion memo DB
- [ ] Focus mode timer works (start/pause/reset)
- [ ] Settings persist in Supabase
- [ ] Team status shows real data from GitHub
- [ ] Reminder cron runs without error
- [ ] PWA installable on mobile
- [ ] Lighthouse Performance ≥ 90
- [ ] Responsive: works on iPhone 14 / iPad / Desktop
