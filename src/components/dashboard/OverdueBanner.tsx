"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";

import { useTasks } from "@/hooks/useTasks";

export function OverdueBanner() {
  const { tasks, isLoading } = useTasks("all");

  const overdueCount = tasks.filter((task) => (task.overduedays ?? 0) > 0).length;

  if (isLoading) return null;
  if (overdueCount === 0) return null;

  return (
    <Link href="/tasks" className="block">
      <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-overdue-bg)] rounded-[var(--radius-lg)] border border-[var(--color-priority-high)]/15 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-priority-high)]/10 shrink-0">
          <AlertCircle size={18} className="text-[var(--color-priority-high)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-priority-high)]">やり残し {overdueCount}件</p>
          <p className="text-xs text-[var(--color-muted)]">今日やる？明日に延ばす？気にしないでOK</p>
        </div>
        <ArrowRight size={16} className="text-[var(--color-priority-high)]/50 shrink-0" />
      </div>
    </Link>
  );
}
