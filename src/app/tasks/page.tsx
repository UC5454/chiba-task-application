"use client";

import { useState } from "react";

import { OverdueSection } from "@/components/tasks/OverdueSection";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskFilter } from "@/components/tasks/TaskFilter";
import { useTasks } from "@/hooks/useTasks";

type FilterType = "today" | "all" | "completed";

export default function TasksPage() {
  const [filter, setFilter] = useState<FilterType>("today");
  const { tasks, mutate } = useTasks(filter === "all" ? "all" : filter);

  const overdueTasks = tasks.filter((task) => !task.completed && (task.overduedays ?? 0) > 0);

  const filteredTasks = filter === "all" ? tasks.filter((t) => !t.completed && (t.overduedays ?? 0) === 0) : tasks;

  const handleQuickAdd = async () => {
    const title = window.prompt("タスク名を入力してください");
    if (!title?.trim()) return;

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });

    await mutate();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--color-foreground)]">タスク</h1>
        <button
          onClick={handleQuickAdd}
          className="text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/8 px-3 py-1.5 rounded-full hover:bg-[var(--color-primary)]/15 transition-colors"
        >
          + 追加
        </button>
      </div>

      <TaskFilter current={filter} onChange={setFilter} />

      {filter !== "completed" && overdueTasks.length > 0 && <OverdueSection tasks={overdueTasks} onChanged={mutate} />}

      <div className="space-y-2.5">
        {filteredTasks.map((task, i) => (
          <div key={task.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <TaskCard task={task} onChanged={mutate} />
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">{filter === "completed" ? "🎉" : "✨"}</p>
            <p className="text-sm text-[var(--color-muted)]">{filter === "completed" ? "まだ完了タスクはないよ" : "タスクなし！自由時間にしよう"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
