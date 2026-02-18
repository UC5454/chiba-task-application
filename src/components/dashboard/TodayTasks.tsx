"use client";

import { useState, useCallback } from "react";
import { Check, ChevronRight, Clock } from "lucide-react";
import type { Priority, Task } from "@/types";

import { useTasks } from "@/hooks/useTasks";
import { useToast } from "@/components/ui/ToastProvider";
import { LoginPrompt } from "@/components/ui/LoginPrompt";

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
  const { tasks, mutate, isLoading, error } = useTasks("today");
  const { toast } = useToast();
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  const handleComplete = useCallback(async (taskId: string) => {
    // 楽観的更新: UIを即座に反映
    setCompletingIds((prev) => new Set(prev).add(taskId));

    // confettiは動的インポート（初回ロード軽量化）
    import("canvas-confetti").then((mod) => {
      mod.default({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
    });
    toast.success("完了したよ！");

    // SWR楽観的更新: キャッシュを即座に書き換え
    mutate(
      (current) => {
        if (!current) return current;
        return { ...current, tasks: current.tasks.filter((t) => t.id !== taskId) };
      },
      { revalidate: false },
    );

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/complete`, { method: "POST" });
      if (!response.ok) {
        const ct = response.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          throw new Error("サーバーに接続できませんでした");
        }
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "操作に失敗しました");
      }
      // 成功: バックグラウンドで最新データに同期
      mutate();
    } catch (err) {
      console.error(err);
      toast.error("完了できなかった。もう一度試してみてね。");
      // 失敗: ロールバック（サーバーから最新を再取得）
      mutate();
    } finally {
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }, [mutate, toast]);

  if (isLoading) {
    return (
      <section className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[var(--color-foreground)]">今日やること</h2>
          <span className="text-xs text-[var(--color-muted)] bg-[var(--color-surface)] px-2.5 py-1 rounded-full">...</span>
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="animate-pulse flex items-center gap-3 px-4 py-3.5 bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-card)]">
              <div className="w-1 h-10 rounded-full bg-[var(--color-border-light)]" />
              <div className="w-6 h-6 rounded-full bg-[var(--color-border-light)]" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-3 w-3/4 rounded bg-[var(--color-border-light)]" />
                <div className="h-2 w-1/3 rounded bg-[var(--color-border-light)]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    if (error instanceof Error && error.message === "ログインが必要です") {
      return (
        <section className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[var(--color-foreground)]">今日やること</h2>
          </div>
          <LoginPrompt />
        </section>
      );
    }

    return (
      <section className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[var(--color-foreground)]">今日やること</h2>
        </div>
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] px-4 py-6 text-center text-sm text-[var(--color-muted)]">
          データを読み込めませんでした
        </div>
      </section>
    );
  }

  return (
    <section className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-[var(--color-foreground)]">今日やること</h2>
        <span className="text-xs text-[var(--color-muted)] bg-[var(--color-surface)] px-2.5 py-1 rounded-full">{tasks.length}件</span>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] px-4 py-8 text-center">
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
    <a
      href={`/tasks/detail?id=${encodeURIComponent(task.id)}`}
      className="group flex items-center gap-3 px-4 py-3.5 bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all cursor-pointer active:scale-[0.99]"
      style={{ color: "inherit", textDecoration: "none" }}
    >
      <div className={`w-0.5 h-8 rounded-full shrink-0 ${priorityColors[task.priority]}`} />

      <button
        className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-[var(--color-border)] hover:border-[var(--color-success)] hover:bg-[var(--color-success)]/10 transition-colors shrink-0 group/check"
        aria-label={`${task.title}を完了`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onComplete(task.id); }}
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
    </a>
  );
}
