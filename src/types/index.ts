// ============================================
// SOU Task - 型定義
// ============================================

// タスク優先度
export type Priority = 1 | 2 | 3; // 1:高 2:中 3:低

// タスクカテゴリ
export type Category = 'DG' | 'BND' | 'SOU' | 'AI_COMMUNITY' | 'PERSONAL';

// タスクステータス
export type TaskStatus = 'active' | 'completed' | 'released';

// タスク（Google Tasks + Supabase メタデータ結合）
export interface Task {
  id: string;
  googleTaskId: string;
  title: string;
  notes?: string;
  dueDate?: string; // ISO 8601
  completed: boolean;
  completedAt?: string;
  priority: Priority;
  category?: Category;
  assignedAiEmployee?: string;
  estimatedMinutes?: number;
  subtasks?: Subtask[];
  createdAt: string;
  overduedays?: number; // 期限超過日数
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

// メモ
export interface Memo {
  id: string;
  notionPageId?: string;
  content: string;
  tags: string[];
  relatedTaskId?: string;
  relatedTaskTitle?: string;
  createdAt: string;
}

// カレンダーイベント
export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  isAllDay: boolean;
}

// AI社員
export interface AIEmployee {
  name: string;
  id: string;
  team: 'executive' | 'coach' | 'hr' | 'secretary' | 'note-team' | 'web-team' | 'prompt-team' | 'slides-team' | 'video-team';
  role: string;
  avatarUrl: string;
  currentTask?: string;
  inboxCount?: number;
}

// ゲーミフィケーション
export interface Gamification {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  totalReleased: number;
  lastCompletedDate?: string;
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

// ADHD設定
export interface ADHDSettings {
  maxDailyTasks: number;
  focusDuration: number;
  overfocusAlert: number;
  breakDuration: number;
  slackNotifyEnabled: boolean;
  quietHoursStart: string; // "HH:mm"
  quietHoursEnd: string;
  gentleRemind: boolean;
  celebrationEnabled: boolean;
  autoReleaseEnabled: boolean;
  autoReleaseDays: number;
}

// リマインドメッセージ
export interface Reminder {
  taskId: string;
  taskTitle: string;
  type: 'due_tomorrow' | 'due_today' | 'due_soon' | 'overdue_1d' | 'overdue_3d' | 'overdue_7d' | 'overdue_14d';
  message: string;
  actions: ReminderAction[];
}

export interface ReminderAction {
  label: string;
  action: 'reschedule_today' | 'reschedule_tomorrow' | 'reschedule_week' | 'release' | 'open';
}

// AI社員日報
export interface DailyLog {
  employeeId: string;
  employeeName: string;
  team: AIEmployee["team"];
  date: string; // YYYY-MM-DD
  content: string; // Markdown本文
}

// ダッシュボード表示用
export interface DashboardData {
  greeting: string;
  todayDate: string;
  todayTasks: Task[];
  overdueTasks: Task[];
  upcomingTasks: Task[];
  todayEvents: CalendarEvent[];
  teamStatus: AIEmployee[];
  gamification: Gamification;
}

// タスク追加フォーム
export interface TaskCreateInput {
  title: string;
  dueDate?: string;
  priority?: Priority;
  category?: Category;
  notes?: string;
  subtasks?: string[];
}

// メモ追加フォーム
export interface MemoCreateInput {
  content: string;
  tags?: string[];
  relatedTaskId?: string;
}
