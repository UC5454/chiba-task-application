import type { ADHDSettings, Reminder, ReminderAction, Task } from "@/types";

// Vercel serverless runs in UTC. Quiet hours and reminder timing should be in JST.
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const toJST = (date: Date) => new Date(date.getTime() + JST_OFFSET_MS);

const defaultSettings: ADHDSettings = {
  maxDailyTasks: 5,
  focusDuration: 25,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  gentleRemind: true,
  celebrationEnabled: true,
  autoReleaseEnabled: true,
  autoReleaseDays: 14,
  overfocusAlert: 120,
  breakDuration: 5,
  slackNotifyEnabled: true,
};

const actions: ReminderAction[] = [
  { label: "今日にする", action: "reschedule_today" },
  { label: "明日にする", action: "reschedule_tomorrow" },
  { label: "開く", action: "open" },
];

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const inQuietHours = (now: Date, settings: ADHDSettings) => {
  const current = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(settings.quietHoursStart);
  const end = toMinutes(settings.quietHoursEnd);

  if (start <= end) {
    return current >= start && current < end;
  }

  return current >= start || current < end;
};

const toDateOnlyDiff = (target: Date, now: Date) => {
  const a = new Date(target);
  a.setHours(0, 0, 0, 0);
  const b = new Date(now);
  b.setHours(0, 0, 0, 0);
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
};

const createReminder = (task: Task, type: Reminder["type"], message: string): Reminder => ({
  taskId: task.id,
  taskTitle: task.title,
  type,
  message,
  actions,
});

// Time-of-day slots (JST hours):
//   morning  = 9:00  (UTC 0:00)
//   midday   = 12:00 (UTC 3:00)
//   afternoon= 15:00 (UTC 6:00)
//   evening  = 18:00 (UTC 9:00)
//   night    = 21:00 (UTC 12:00)
type TimeSlot = "morning" | "midday" | "afternoon" | "evening" | "night";

const getTimeSlot = (hour: number): TimeSlot => {
  if (hour < 11) return "morning";
  if (hour < 14) return "midday";
  if (hour < 17) return "afternoon";
  if (hour < 20) return "evening";
  return "night";
};

const remindersForTask = (task: Task, now: Date, slot: TimeSlot): Reminder[] => {
  if (task.completed || !task.dueDate) {
    return [];
  }

  const due = new Date(task.dueDate);
  const diffDays = toDateOnlyDiff(due, now);
  const results: Reminder[] = [];

  // --- 今日が期限のタスク（最も重要 → 全スロットでリマインド） ---
  if (diffDays === 0) {
    const msgs: Record<TimeSlot, string> = {
      morning: `おはよう！今日が期限: ${task.title}。まず15分だけ手をつけてみよう`,
      midday: `${task.title}、今日中だよ。午後イチでやっちゃおう`,
      afternoon: `${task.title}、まだ間に合う！今から30分だけ集中してみない?`,
      evening: `${task.title}、今日中に終わらせたいね。あとひと踏ん張り!`,
      night: `${task.title}、今日の期限だけどまだ未完了。明日に回す? それとも今やる?`,
    };
    results.push(createReminder(task, "due_today", msgs[slot]));
    return results;
  }

  // --- 明日が期限 ---
  if (diffDays === 1) {
    const msgs: Partial<Record<TimeSlot, string>> = {
      morning: `明日が期限: ${task.title}。今日のうちに少しでも進めておくと楽だよ`,
      afternoon: `${task.title}、明日が期限。今日中にちょっとだけ手をつけておこう`,
      evening: `明日やることになる ${task.title}、今のうちに準備だけでもしておく?`,
    };
    if (msgs[slot]) {
      results.push(createReminder(task, "due_tomorrow", msgs[slot]!));
    }
    return results;
  }

  // --- 2〜3日後に期限 ---
  if (diffDays >= 2 && diffDays <= 3) {
    if (slot === "morning") {
      results.push(createReminder(task, "due_soon", `${task.title}、あと${diffDays}日。早めに片付けちゃおう`));
    }
    return results;
  }

  // --- 期限超過: 昨日 ---
  if (diffDays === -1) {
    const msgs: Partial<Record<TimeSlot, string>> = {
      morning: `昨日の ${task.title}、今日やっちゃおう。朝イチが一番やりやすいよ`,
      afternoon: `${task.title}、昨日の分だけど今からでも遅くない!`,
      evening: `${task.title}、1日超過中。明日の朝にやる? それともリスケする?`,
    };
    if (msgs[slot]) {
      results.push(createReminder(task, "overdue_1d", msgs[slot]!));
    }
    return results;
  }

  // --- 期限超過: 2〜3日 ---
  if (diffDays >= -3 && diffDays <= -2) {
    const msgs: Partial<Record<TimeSlot, string>> = {
      morning: `${task.title}、${Math.abs(diffDays)}日超過中。今日やれそう? 無理なら日程を変えよう`,
      evening: `${task.title}が${Math.abs(diffDays)}日溜まってる。小さく分割してみるのもアリだよ`,
    };
    if (msgs[slot]) {
      results.push(createReminder(task, "overdue_3d", msgs[slot]!));
    }
    return results;
  }

  // --- 期限超過: 4〜6日 ---
  if (diffDays >= -6 && diffDays <= -4) {
    if (slot === "morning") {
      results.push(createReminder(task, "overdue_3d", `${task.title}、${Math.abs(diffDays)}日経ったね。まだやりたい? リスケか手放しも選べるよ`));
    }
    return results;
  }

  // --- 期限超過: 1週間 ---
  if (diffDays >= -13 && diffDays <= -7) {
    if (slot === "morning") {
      results.push(createReminder(task, "overdue_7d", `${task.title}、1週間以上。本当にやる? 手放してスッキリするのもアリだよ`));
    }
    return results;
  }

  // --- 期限超過: 2週間以上 ---
  if (diffDays <= -14) {
    if (slot === "morning") {
      results.push(createReminder(task, "overdue_14d", `${task.title}、${Math.abs(diffDays)}日放置中。自動で手放しリストに入れるね`));
    }
    return results;
  }

  return results;
};

// Summary reminder: 朝の概要・午後の進捗・夜の振り返り
const generateSummaryReminders = (tasks: Task[], now: Date, slot: TimeSlot): Reminder[] => {
  const activeTasks = tasks.filter((t) => !t.completed);
  const todayTasks = activeTasks.filter((t) => t.dueDate && toDateOnlyDiff(new Date(t.dueDate), now) === 0);
  const overdueTasks = activeTasks.filter((t) => t.dueDate && toDateOnlyDiff(new Date(t.dueDate), now) < 0);
  const results: Reminder[] = [];

  if (slot === "morning" && (todayTasks.length > 0 || overdueTasks.length > 0)) {
    const parts: string[] = [];
    if (todayTasks.length > 0) parts.push(`今日のタスク${todayTasks.length}件`);
    if (overdueTasks.length > 0) parts.push(`超過${overdueTasks.length}件`);
    results.push({
      taskId: "__summary__",
      taskTitle: "今日の概要",
      type: "due_today",
      message: `おはよう! ${parts.join("・")}。まず1つだけ選んで始めよう`,
      actions: [{ label: "タスクを見る", action: "open" }],
    });
  }

  if (slot === "afternoon" && todayTasks.length > 0) {
    results.push({
      taskId: "__summary__",
      taskTitle: "午後の進捗",
      type: "due_today",
      message: `今日のタスクまだ${todayTasks.length}件残ってるよ。1つ片付けるだけでも気分が変わる!`,
      actions: [{ label: "タスクを見る", action: "open" }],
    });
  }

  if (slot === "night" && overdueTasks.length >= 3) {
    results.push({
      taskId: "__summary__",
      taskTitle: "溜まりアラート",
      type: "overdue_3d",
      message: `超過タスクが${overdueTasks.length}件。明日の朝、1つだけ片付けよう。全部やろうとしなくてOK`,
      actions: [{ label: "タスクを見る", action: "open" }],
    });
  }

  return results;
};

export const generateReminders = (tasks: Task[], settings?: Partial<ADHDSettings>, now = new Date()): Reminder[] => {
  const mergedSettings = { ...defaultSettings, ...settings };
  const jstNow = toJST(now);

  if (inQuietHours(jstNow, mergedSettings)) {
    return [];
  }

  const slot = getTimeSlot(jstNow.getHours());

  // Per-task reminders
  const taskReminders = tasks.flatMap((task) => remindersForTask(task, jstNow, slot));

  // Summary reminders
  const summaryReminders = generateSummaryReminders(tasks, jstNow, slot);

  // Dedupe: summary first, then per-task (max 5 per-task to avoid notification flood)
  return [...summaryReminders, ...taskReminders.slice(0, 5)];
};
