"use client";

import { useState, type MouseEvent } from "react";
import { Check, ChevronRight, Clock } from "lucide-react";
import type { Task, Priority } from "@/types";
import { useToast } from "@/components/ui/ToastProvider";

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

function formatDueDate(dueDate?: string): string {
  if (!dueDate) return "";
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}日超過`;
  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "明日";
  return `${diffDays}日後`;
}

function formatCompletedAt(completedAt: string): string {
  const date = new Date(completedAt);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const completed = new Date(date);
  completed.setHours(0, 0, 0, 0);
  const diffDays = Math.round((now.getTime() - completed.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "今日完了";
  if (diffDays === 1) return "昨日完了";
  if (diffDays < 7) return `${diffDays}日前に完了`;
  return `${date.getMonth() + 1}/${date.getDate()} 完了`;
}

interface TaskCardProps {
  task: Task;
  onChanged?: () => Promise<unknown> | unknown;
}

export function TaskCard({ task, onChanged }: TaskCardProps) {
  const [completed, setCompleted] = useState(task.completed);
  const { toast } = useToast();

  const handleComplete = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (completed) return;
    setCompleted(true);
    import("canvas-confetti").then((mod) => {
      mod.default({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
    });
    toast.success("完了したよ！");
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/complete`, { method: "POST" });
      if (!response.ok) {
        const ct = response.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          throw new Error("サーバーに接続できませんでした");
        }
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "操作に失敗しました");
      }
      await onChanged?.();
    } catch (error) {
      console.error(error);
      setCompleted(false);
      toast.error("完了できなかった。もう一度試してみてね。");
    }
  };

  const detailHref = `/tasks/detail?id=${encodeURIComponent(task.id)}`;

  return (
    <a
      href={detailHref}
      className={`block bg-[var(--color-surface)] rounded-[var(--radius-xl)] overflow-hidden transition-all no-underline ${
        completed ? "opacity-50" : ""
      }`}
      style={{ boxShadow: "var(--shadow-card)", color: "inherit", textDecoration: "none" }}
    >
      <div className="flex items-center gap-3 px-4 py-3.5 active:bg-[var(--color-surface-hover)]">
        <div className={`w-0.5 h-8 rounded-full shrink-0 ${priorityColors[task.priority]}`} />

        <button
          onClick={handleComplete}
          className={`flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all shrink-0 ${
            completed
              ? "bg-[var(--color-success)] border-[var(--color-success)]"
              : "border-[var(--color-border)] hover:border-[var(--color-success)] hover:bg-[var(--color-success)]/10"
          }`}
          aria-label={completed ? "完了済み" : `${task.title}を完了`}
        >
          <Check size={14} className={completed ? "text-white" : "text-transparent"} />
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${completed ? "line-through text-[var(--color-muted)]" : "text-[var(--color-foreground)]"}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {task.category && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--color-primary)]/8 text-[var(--color-primary)]">
                {categoryLabels[task.category] || task.category}
              </span>
            )}
            {task.dueDate && (
              <span className={`flex items-center gap-1 text-[10px] ${(task.overduedays ?? 0) > 0 ? "text-[var(--color-priority-high)] font-semibold" : "text-[var(--color-muted)]"}`}>
                <Clock size={10} />
                {formatDueDate(task.dueDate)}
              </span>
            )}
            {task.completed && task.completedAt && (
              <span className="flex items-center gap-1 text-[10px] text-[var(--color-success)]">
                <Check size={10} />
                {formatCompletedAt(task.completedAt)}
              </span>
            )}
          </div>
        </div>

        <ChevronRight size={16} className="text-[var(--color-border)] shrink-0" />
      </div>
    </a>
  );
}
