import type { ADHDSettings, Reminder, ReminderAction, Task } from "@/types";

const defaultSettings: ADHDSettings = {
  maxDailyTasks: 5,
  focusDuration: 25,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  gentleRemind: true,
  celebrationEnabled: true,
  autoReleaseEnabled: true,
  autoReleaseDays: 14,
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

const reminderForTask = (task: Task, now: Date): Reminder | null => {
  if (task.completed || !task.dueDate) {
    return null;
  }

  const due = new Date(task.dueDate);
  const diffDays = toDateOnlyDiff(due, now);
  const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffDays === 1 && now.getHours() >= 18) {
    return createReminder(task, "due_tomorrow", `明日が期限だよ: ${task.title}。今日のうちにちょっとだけ手をつけてみる?`);
  }

  if (diffDays === 0 && now.getHours() < 12) {
    return createReminder(task, "due_today", `今日中にやれるといいな: ${task.title}`);
  }

  if (diffHours > 0 && diffHours <= 3) {
    return createReminder(task, "due_soon", `${task.title}、今やっちゃう? 15分だけでもいいよ`);
  }

  if (diffDays === -1) {
    return createReminder(task, "overdue_1d", `昨日のやつ、今日のどこかでやれそう?`);
  }

  if (diffDays === -3) {
    return createReminder(task, "overdue_3d", `${task.title}、3日過ぎたけど気にしないで。いつならできそう?`);
  }

  if (diffDays === -7) {
    return createReminder(task, "overdue_7d", `${task.title}、1週間経ったね。まだやりたい? 手放してもOKだよ`);
  }

  if (diffDays <= -14) {
    return createReminder(task, "overdue_14d", `${task.title}、2週間放置中。自動で手放しリストに入れるね`);
  }

  return null;
};

export const generateReminders = (tasks: Task[], settings?: Partial<ADHDSettings>, now = new Date()): Reminder[] => {
  const mergedSettings = { ...defaultSettings, ...settings };

  if (inQuietHours(now, mergedSettings)) {
    return [];
  }

  return tasks.map((task) => reminderForTask(task, now)).filter((item): item is Reminder => Boolean(item));
};
