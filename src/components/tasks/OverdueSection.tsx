"use client";

import { useState } from "react";
import { AlertCircle, ArrowRight, CalendarClock, X } from "lucide-react";
import type { Task } from "@/types";

interface OverdueSectionProps {
  tasks: Task[];
  onChanged?: () => Promise<unknown> | unknown;
}

export function OverdueSection({ tasks, onChanged }: OverdueSectionProps) {
  // 楽観的更新: 操作済みタスクをローカルで即座に非表示
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const dismissTask = (taskId: string) => {
    setDismissedIds((prev) => new Set(prev).add(taskId));
  };

  const rollbackTask = (taskId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  };

  const handleReschedule = async (taskId: string, newDueDate: "today" | "tomorrow") => {
    dismissTask(taskId);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newDueDate }),
      });
      if (!res.ok) throw new Error();
      onChanged?.();
    } catch {
      rollbackTask(taskId);
    }
  };

  const handleRelease = async (taskId: string) => {
    dismissTask(taskId);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/release`, { method: "POST" });
      if (!res.ok) throw new Error();
      onChanged?.();
    } catch {
      rollbackTask(taskId);
    }
  };

  const visibleTasks = tasks.filter((t) => !dismissedIds.has(t.id));

  if (visibleTasks.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-2.5">
        <AlertCircle size={14} className="text-[var(--color-priority-high)]" />
        <h3 className="text-sm font-bold text-[var(--color-priority-high)]">やり残し ({visibleTasks.length}件)</h3>
      </div>

      <div className="space-y-2">
        {visibleTasks.map((task) => (
          <div key={task.id} className="bg-[var(--color-overdue-bg)] rounded-[var(--radius-xl)] p-4 animate-fade-in-up" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-start gap-3">
              <div className="w-1 h-8 rounded-full bg-[var(--color-priority-high)] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-foreground)]">{task.title}</p>
                <p className="text-[10px] text-[var(--color-priority-high)] mt-0.5 font-medium">{task.overduedays}日超過</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3 ml-4">
              <button
                onClick={() => handleReschedule(task.id, "today")}
                className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-white bg-[var(--color-primary)] rounded-full hover:bg-[var(--color-primary-dark)] transition-colors"
              >
                <CalendarClock size={12} />
                今日やる
              </button>
              <button
                onClick={() => handleReschedule(task.id, "tomorrow")}
                className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-[var(--color-foreground)] bg-[var(--color-surface)] rounded-full shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all"
              >
                <ArrowRight size={12} />
                明日に延期
              </button>
              <button
                onClick={() => handleRelease(task.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
              >
                <X size={12} />
                手放す
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
