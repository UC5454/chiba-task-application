"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";

import { OverdueSection } from "@/components/tasks/OverdueSection";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskFilter } from "@/components/tasks/TaskFilter";
import { useToast } from "@/components/ui/ToastProvider";
import { useTasks } from "@/hooks/useTasks";

type FilterType = "today" | "all" | "completed";

export default function TasksPage() {
  const [filter, setFilter] = useState<FilterType>("today");
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const inlineInputRef = useRef<HTMLInputElement | null>(null);

  const { tasks, completionStats, mutate } = useTasks(filter);
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutate();
    setIsRefreshing(false);
    toast.success("最新情報に更新したよ。");
  }, [mutate, toast]);

  useEffect(() => {
    if (showInlineAdd) {
      inlineInputRef.current?.focus();
    }
  }, [showInlineAdd]);

  const overdueTasks = tasks.filter((task) => !task.completed && (task.overduedays ?? 0) > 0);
  const filteredTasks = filter === "all" ? tasks.filter((task) => !task.completed && (task.overduedays ?? 0) === 0) : tasks;

  const submitQuickAdd = async () => {
    const title = newTaskTitle.trim();
    if (!title) {
      toast.error("タスク名を入力してね。");
      return;
    }

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) {
        const ct = response.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          throw new Error("サーバーに接続できませんでした");
        }
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "操作に失敗しました");
      }
      toast.success("タスクを追加したよ。");
      setNewTaskTitle("");
      await mutate();
      requestAnimationFrame(() => inlineInputRef.current?.focus());
    } catch (error) {
      console.error(error);
      toast.error("追加できなかった。もう一度試してみてね。");
    }
  };

  const cancelInlineAdd = () => {
    setNewTaskTitle("");
    setShowInlineAdd(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">タスク</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 text-xs font-medium text-[var(--color-muted)] bg-[var(--color-surface)] px-3 py-1.5 rounded-full hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50"
            aria-label="最新情報に更新"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
            更新
          </button>
          <button
            onClick={() => setShowInlineAdd(true)}
            className="text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/8 px-3 py-1.5 rounded-full hover:bg-[var(--color-primary)]/15 transition-colors"
          >
            + 追加
          </button>
        </div>
      </div>

      <TaskFilter current={filter} onChange={setFilter} />

      {filter === "completed" && completionStats && (
        <div className="flex items-center gap-4 px-4 py-3.5 bg-gradient-to-r from-[var(--color-success)]/8 to-[var(--color-primary)]/8 rounded-[var(--radius-xl)]" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-[var(--color-success)]">{completionStats.todayCount}</p>
            <p className="text-[10px] text-[var(--color-muted)]">今日</p>
          </div>
          <div className="w-px h-8 bg-[var(--color-border-light)]" />
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-[var(--color-primary)]">{completionStats.thisWeekCount}</p>
            <p className="text-[10px] text-[var(--color-muted)]">今週</p>
          </div>
          <div className="w-px h-8 bg-[var(--color-border-light)]" />
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-[var(--color-foreground)]">{completionStats.totalCount}</p>
            <p className="text-[10px] text-[var(--color-muted)]">累計</p>
          </div>
        </div>
      )}

      {filter !== "completed" && overdueTasks.length > 0 && <OverdueSection tasks={overdueTasks} onChanged={mutate} />}

      <div className="space-y-2">
        {showInlineAdd && (
          <div className="card-elevated p-3 animate-fade-in-up">
            <input
              ref={inlineInputRef}
              type="text"
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submitQuickAdd();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelInlineAdd();
                }
              }}
              placeholder="タスク名を入力してEnter"
              className="w-full px-3 py-2 text-sm bg-[var(--color-background)] rounded-[var(--radius-md)] border border-[var(--color-border-light)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)]"
            />
          </div>
        )}

        {filteredTasks.map((task, i) => (
          <div key={task.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <TaskCard task={task} onChanged={mutate} />
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12 bg-[var(--color-surface)] rounded-[var(--radius-xl)]" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="text-4xl mb-3">{filter === "completed" ? "🎉" : "✨"}</p>
            <p className="text-sm text-[var(--color-muted)]">{filter === "completed" ? "まだ完了タスクはないよ" : "今はタスクがありません。+追加で一歩だけ進めよう"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
