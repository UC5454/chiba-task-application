"use client";

import { Check, ChevronRight, Clock } from "lucide-react";
import type { Task, Priority } from "@/types";

// モックデータ
const mockTasks: Task[] = [
  {
    id: "1", googleTaskId: "gt1", title: "AI BB東京 登壇資料のレビュー",
    dueDate: new Date().toISOString(), completed: false, priority: 1,
    category: "DG", createdAt: new Date().toISOString(),
  },
  {
    id: "2", googleTaskId: "gt2", title: "東北AI維新 スポンサー候補リスト確認",
    dueDate: new Date().toISOString(), completed: false, priority: 1,
    category: "AI_COMMUNITY", createdAt: new Date().toISOString(),
  },
  {
    id: "3", googleTaskId: "gt3", title: "BND月次レポートへのコメント",
    dueDate: new Date().toISOString(), completed: false, priority: 2,
    category: "BND", createdAt: new Date().toISOString(),
  },
  {
    id: "4", googleTaskId: "gt4", title: "チームMTGアジェンダ確認",
    dueDate: new Date().toISOString(), completed: false, priority: 3,
    category: "DG", createdAt: new Date().toISOString(),
  },
];

const priorityColors: Record<Priority, string> = {
  1: "bg-[var(--color-priority-high)]",
  2: "bg-[var(--color-priority-mid)]",
  3: "bg-[var(--color-priority-low)]",
};

const categoryLabels: Record<string, string> = {
  DG: "DG",
  BND: "BND",
  SOU: "SOU",
  AI_COMMUNITY: "AI",
  PERSONAL: "個人",
};

export function TodayTasks() {
  return (
    <section className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-[var(--color-foreground)]">
          今日やること
        </h2>
        <span className="text-xs text-[var(--color-muted)] bg-[var(--color-surface)] px-2.5 py-1 rounded-full">
          {mockTasks.length}件
        </span>
      </div>

      <div className="space-y-2.5">
        {mockTasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </section>
  );
}

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="group flex items-center gap-3 px-4 py-3.5 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all cursor-pointer active:scale-[0.99]">
      {/* 優先度カラーバー */}
      <div className={`w-1 h-10 rounded-full shrink-0 ${priorityColors[task.priority]}`} />

      {/* チェックボタン */}
      <button
        className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-[var(--color-border)] hover:border-[var(--color-success)] hover:bg-[var(--color-success)]/10 transition-colors shrink-0 group/check"
        aria-label={`${task.title}を完了`}
      >
        <Check size={14} className="text-transparent group-hover/check:text-[var(--color-success)]" />
      </button>

      {/* タスク情報 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {task.category && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
              {categoryLabels[task.category] || task.category}
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] text-[var(--color-muted)]">
            <Clock size={10} />
            今日中
          </span>
        </div>
      </div>

      {/* 矢印 */}
      <ChevronRight size={16} className="text-[var(--color-border)] group-hover:text-[var(--color-muted)] transition-colors shrink-0" />
    </div>
  );
}
