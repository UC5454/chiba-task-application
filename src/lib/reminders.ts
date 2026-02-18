import type { ADHDSettings, Reminder, ReminderAction, Task } from "@/types";

// Vercel serverless runs in UTC. Quiet hours and reminder timing should be in JST.
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const toJST = (date: Date) => new Date(date.getTime() + JST_OFFSET_MS);

const defaultSettings: ADHDSettings = {
  maxDailyTasks: 5,
  idlingSeconds: 60,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  gentleRemind: true,
  celebrationEnabled: true,
  autoReleaseEnabled: true,
  autoReleaseDays: 14,
  overfocusAlert: 120,
  workBreakMinutes: 5,
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

const remindersForTask = (task: Task, now: Date): Reminder[] => {
  if (task.completed || !task.dueDate) {
    return [];
  }

  const due = new Date(task.dueDate);
  const diffDays = toDateOnlyDiff(due, now);

  // --- 今日が期限（最重要） ---
  if (diffDays === 0) {
    return [createReminder(task, "due_today", `今日が期限: ${task.title}。まず15分だけ手をつけてみよう!`)];
  }

  // --- 明日が期限 ---
  if (diffDays === 1) {
    return [createReminder(task, "due_tomorrow", `明日が期限: ${task.title}。今日のうちに少しでも進めておくと楽だよ`)];
  }

  // --- 2〜3日後に期限 ---
  if (diffDays >= 2 && diffDays <= 3) {
    return [createReminder(task, "due_soon", `${task.title}、あと${diffDays}日。早めに片付けちゃおう`)];
  }

  // --- 期限超過: 昨日 ---
  if (diffDays === -1) {
    return [createReminder(task, "overdue_1d", `昨日の ${task.title}、今日やっちゃおう。朝イチが一番やりやすいよ`)];
  }

  // --- 期限超過: 2〜3日 ---
  if (diffDays >= -3 && diffDays <= -2) {
    return [createReminder(task, "overdue_3d", `${task.title}、${Math.abs(diffDays)}日超過中。今日やれそう? 無理なら日程を変えよう`)];
  }

  // --- 期限超過: 4〜6日 ---
  if (diffDays >= -6 && diffDays <= -4) {
    return [createReminder(task, "overdue_3d", `${task.title}、${Math.abs(diffDays)}日経ったね。まだやりたい? リスケか手放しも選べるよ`)];
  }

  // --- 期限超過: 1〜2週間 ---
  if (diffDays >= -13 && diffDays <= -7) {
    return [createReminder(task, "overdue_7d", `${task.title}、1週間以上放置中。本当にやる? 手放してスッキリするのもアリだよ`)];
  }

  // --- 期限超過: 2週間以上 ---
  if (diffDays <= -14) {
    return [createReminder(task, "overdue_14d", `${task.title}、${Math.abs(diffDays)}日放置中。自動で手放しリストに入れるね`)];
  }

  return [];
};

// Summary reminder
const generateSummaryReminder = (tasks: Task[], now: Date): Reminder | null => {
  const activeTasks = tasks.filter((t) => !t.completed);
  const todayTasks = activeTasks.filter((t) => t.dueDate && toDateOnlyDiff(new Date(t.dueDate), now) === 0);
  const overdueTasks = activeTasks.filter((t) => t.dueDate && toDateOnlyDiff(new Date(t.dueDate), now) < 0);

  if (todayTasks.length === 0 && overdueTasks.length === 0) return null;

  const parts: string[] = [];
  if (todayTasks.length > 0) parts.push(`今日のタスク${todayTasks.length}件`);
  if (overdueTasks.length > 0) parts.push(`超過${overdueTasks.length}件`);

  return {
    taskId: "__summary__",
    taskTitle: "今日の概要",
    type: "due_today",
    message: `おはよう! ${parts.join("・")}。まず1つだけ選んで始めよう`,
    actions: [{ label: "タスクを見る", action: "open" }],
  };
};

export const generateReminders = (tasks: Task[], settings?: Partial<ADHDSettings>, now = new Date()): Reminder[] => {
  const mergedSettings = { ...defaultSettings, ...settings };
  const jstNow = toJST(now);

  if (inQuietHours(jstNow, mergedSettings)) {
    return [];
  }

  // Summary first
  const summary = generateSummaryReminder(tasks, jstNow);

  // Per-task reminders (max 8 to avoid flood)
  const taskReminders = tasks.flatMap((task) => remindersForTask(task, jstNow)).slice(0, 8);

  return [...(summary ? [summary] : []), ...taskReminders];
};
