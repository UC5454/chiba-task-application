"use client";

import { useState } from "react";

import { OverdueSection } from "@/components/tasks/OverdueSection";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskFilter } from "@/components/tasks/TaskFilter";
import { InputDialog } from "@/components/ui/InputDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { useTasks } from "@/hooks/useTasks";

type FilterType = "today" | "all" | "completed";

export default function TasksPage() {
  const [filter, setFilter] = useState<FilterType>("today");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { tasks, completionStats, mutate } = useTasks(filter);
  const { toast } = useToast();

  const overdueTasks = tasks.filter((task) => !task.completed && (task.overduedays ?? 0) > 0);
  const filteredTasks = filter === "all" ? tasks.filter((task) => !task.completed && (task.overduedays ?? 0) === 0) : tasks;

  const submitQuickAdd = async (values: Record<string, string>) => {
    const title = values.title?.trim();
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
      setQuickAddOpen(false);
      await mutate();
    } catch (error) {
      console.error(error);
      toast.error("追加できなかった。もう一度試してみてね。");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--color-foreground)]">タスク</h1>
        <button
          onClick={() => setQuickAddOpen(true)}
          className="text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/8 px-3 py-1.5 rounded-full hover:bg-[var(--color-primary)]/15 transition-colors"
        >
          + 追加
        </button>
      </div>

      <TaskFilter current={filter} onChange={setFilter} />

      {filter === "completed" && completionStats && (
        <div className="flex items-center gap-4 px-4 py-3 bg-gradient-to-r from-[var(--color-success)]/10 to-[var(--color-primary)]/10 rounded-[var(--radius-lg)] border border-[var(--color-border)]">
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-[var(--color-success)]">{completionStats.todayCount}</p>
            <p className="text-[10px] text-[var(--color-muted)]">今日</p>
          </div>
          <div className="w-px h-8 bg-[var(--color-border)]" />
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-[var(--color-primary)]">{completionStats.thisWeekCount}</p>
            <p className="text-[10px] text-[var(--color-muted)]">今週</p>
          </div>
          <div className="w-px h-8 bg-[var(--color-border)]" />
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-[var(--color-foreground)]">{completionStats.totalCount}</p>
            <p className="text-[10px] text-[var(--color-muted)]">累計</p>
          </div>
        </div>
      )}

      {filter !== "completed" && overdueTasks.length > 0 && <OverdueSection tasks={overdueTasks} onChanged={mutate} />}

      <div className="space-y-2.5">
        {filteredTasks.map((task, i) => (
          <div key={task.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <TaskCard task={task} onChanged={mutate} />
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
            <p className="text-4xl mb-3">{filter === "completed" ? "🎉" : "✨"}</p>
            <p className="text-sm text-[var(--color-muted)]">{filter === "completed" ? "まだ完了タスクはないよ" : "今はタスクがありません。+追加で一歩だけ進めよう"}</p>
          </div>
        )}
      </div>

      <InputDialog
        open={quickAddOpen}
        onCancel={() => setQuickAddOpen(false)}
        onSubmit={submitQuickAdd}
        title="タスクを追加"
        fields={[{ name: "title", label: "タスク名", placeholder: "タスク名を入力", required: true }]}
      />
    </div>
  );
}
