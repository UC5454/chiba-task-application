"use client";

import { useState } from "react";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskFilter } from "@/components/tasks/TaskFilter";
import { OverdueSection } from "@/components/tasks/OverdueSection";
import type { Task } from "@/types";

// モックデータ
const allTasks: Task[] = [
  // 期限切れ
  { id: "o1", googleTaskId: "go1", title: "東北AI維新 会場手配の最終確認", dueDate: "2026-02-04T23:59:59", completed: false, priority: 1, category: "AI_COMMUNITY", createdAt: "2026-01-28T09:00:00", overduedays: 3 },
  { id: "o2", googleTaskId: "go2", title: "Downstream 登壇後アンケート確認", dueDate: "2026-02-05T23:59:59", completed: false, priority: 2, category: "DG", createdAt: "2026-02-01T09:00:00", overduedays: 2 },
  // 今日
  { id: "1", googleTaskId: "gt1", title: "AI BB東京 登壇資料のレビュー", dueDate: "2026-02-07T23:59:59", completed: false, priority: 1, category: "DG", createdAt: "2026-02-01T09:00:00" },
  { id: "2", googleTaskId: "gt2", title: "東北AI維新 スポンサー候補リスト確認", dueDate: "2026-02-07T23:59:59", completed: false, priority: 1, category: "AI_COMMUNITY", createdAt: "2026-02-01T09:00:00" },
  { id: "3", googleTaskId: "gt3", title: "BND月次レポートへのコメント", dueDate: "2026-02-07T23:59:59", completed: false, priority: 2, category: "BND", createdAt: "2026-02-03T09:00:00" },
  { id: "4", googleTaskId: "gt4", title: "チームMTGアジェンダ確認", dueDate: "2026-02-07T23:59:59", completed: false, priority: 3, category: "DG", createdAt: "2026-02-06T09:00:00" },
  // 今週
  { id: "5", googleTaskId: "gt5", title: "SOU 事業計画書ドラフト作成", dueDate: "2026-02-09T23:59:59", completed: false, priority: 2, category: "SOU", createdAt: "2026-02-01T09:00:00" },
  { id: "6", googleTaskId: "gt6", title: "MDX事業部 KPIレビュー", dueDate: "2026-02-10T23:59:59", completed: false, priority: 2, category: "DG", createdAt: "2026-02-05T09:00:00" },
  // 完了済み
  { id: "c1", googleTaskId: "gc1", title: "週次レポート提出", dueDate: "2026-02-06T23:59:59", completed: true, priority: 2, category: "DG", createdAt: "2026-02-03T09:00:00", completedAt: "2026-02-06T14:00:00" },
];

type FilterType = "today" | "all" | "completed";

export default function TasksPage() {
  const [filter, setFilter] = useState<FilterType>("today");

  const overdueTasks = allTasks.filter(t => !t.completed && t.overduedays && t.overduedays > 0);
  const activeTasks = allTasks.filter(t => !t.completed && !(t.overduedays && t.overduedays > 0));
  const completedTasks = allTasks.filter(t => t.completed);

  const getFilteredTasks = () => {
    switch (filter) {
      case "today":
        return activeTasks.filter(t => {
          if (!t.dueDate) return false;
          const due = new Date(t.dueDate).toDateString();
          return due === new Date().toDateString();
        });
      case "completed":
        return completedTasks;
      default:
        return activeTasks;
    }
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--color-foreground)]">タスク</h1>
        <button className="text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/8 px-3 py-1.5 rounded-full hover:bg-[var(--color-primary)]/15 transition-colors">
          + 追加
        </button>
      </div>

      <TaskFilter current={filter} onChange={setFilter} />

      {/* 期限切れセクション */}
      {filter !== "completed" && overdueTasks.length > 0 && (
        <OverdueSection tasks={overdueTasks} />
      )}

      {/* タスク一覧 */}
      <div className="space-y-2.5">
        {filteredTasks.map((task, i) => (
          <div key={task.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <TaskCard task={task} />
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">
              {filter === "completed" ? "🎉" : "✨"}
            </p>
            <p className="text-sm text-[var(--color-muted)]">
              {filter === "completed" ? "まだ完了タスクはないよ" : "タスクなし！自由時間だ"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
