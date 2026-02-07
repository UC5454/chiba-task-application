"use client";

import { AlertCircle, CalendarClock, ArrowRight, X } from "lucide-react";
import type { Task } from "@/types";

interface OverdueSectionProps {
  tasks: Task[];
}

export function OverdueSection({ tasks }: OverdueSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2.5">
        <AlertCircle size={14} className="text-[var(--color-priority-high)]" />
        <h3 className="text-sm font-bold text-[var(--color-priority-high)]">
          やり残し ({tasks.length}件)
        </h3>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="bg-[var(--color-overdue-bg)] rounded-[var(--radius-lg)] border border-[var(--color-priority-high)]/12 p-3.5"
          >
            <div className="flex items-start gap-3">
              <div className="w-1 h-8 rounded-full bg-[var(--color-priority-high)] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  {task.title}
                </p>
                <p className="text-[10px] text-[var(--color-priority-high)] mt-0.5 font-medium">
                  {task.overduedays}日超過
                </p>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex items-center gap-2 mt-3 ml-4">
              <button className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-white bg-[var(--color-primary)] rounded-full hover:bg-[var(--color-primary-dark)] transition-colors">
                <CalendarClock size={12} />
                今日やる
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-[var(--color-foreground)] bg-[var(--color-surface)] rounded-full border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors">
                <ArrowRight size={12} />
                明日に延期
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors">
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
