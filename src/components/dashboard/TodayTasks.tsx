"use client";

import { Check, ChevronRight, Clock } from "lucide-react";
import type { Priority, Task } from "@/types";

import { useTasks } from "@/hooks/useTasks";

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
  const { tasks, mutate } = useTasks("today");

  const handleComplete = async (taskId: string) => {
    await fetch(`/api/tasks/${encodeURIComponent(taskId)}/complete`, { method: "POST" });
    await mutate();
  };

  return (
    <section className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-[var(--color-foreground)]">今日やること</h2>
        <span className="text-xs text-[var(--color-muted)] bg-[var(--color-surface)] px-2.5 py-1 rounded-full">{tasks.length}件</span>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] px-4 py-8 text-center">
          <p className="text-3xl mb-2">🌿</p>
          <p className="text-sm text-[var(--color-muted)]">今日のタスクはまだありません</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tasks.slice(0, 5).map((task) => (
            <TaskCard key={task.id} task={task} onComplete={handleComplete} />
          ))}
        </div>
      )}
    </section>
  );
}

function TaskCard({ task, onComplete }: { task: Task; onComplete: (taskId: string) => void }) {
  return (
    <div className="group flex items-center gap-3 px-4 py-3.5 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all cursor-pointer active:scale-[0.99]">
      <div className={`w-1 h-10 rounded-full shrink-0 ${priorityColors[task.priority]}`} />

      <button
        className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-[var(--color-border)] hover:border-[var(--color-success)] hover:bg-[var(--color-success)]/10 transition-colors shrink-0 group/check"
        aria-label={`${task.title}を完了`}
        onClick={() => onComplete(task.id)}
      >
        <Check size={14} className="text-transparent group-hover/check:text-[var(--color-success)]" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-foreground)] truncate">{task.title}</p>
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

      <ChevronRight size={16} className="text-[var(--color-border)] group-hover:text-[var(--color-muted)] transition-colors shrink-0" />
    </div>
  );
}
