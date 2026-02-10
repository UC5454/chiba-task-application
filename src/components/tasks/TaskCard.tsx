"use client";

import confetti from "canvas-confetti";
import { useState, type MouseEvent } from "react";
import { Check, ChevronDown, ChevronUp, Clock, Pencil, Trash2 } from "lucide-react";
import type { Task, Priority } from "@/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InputDialog } from "@/components/ui/InputDialog";
import { useToast } from "@/components/ui/ToastProvider";

const priorityColors: Record<Priority, string> = {
  1: "bg-[var(--color-priority-high)]",
  2: "bg-[var(--color-priority-mid)]",
  3: "bg-[var(--color-priority-low)]",
};

const priorityLabels: Record<Priority, string> = {
  1: "高",
  2: "中",
  3: "低",
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

interface TaskCardProps {
  task: Task;
  onChanged?: () => Promise<unknown> | unknown;
}

export function TaskCard({ task, onChanged }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [completed, setCompleted] = useState(task.completed);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { toast } = useToast();

  const handleComplete = async (e: MouseEvent) => {
    e.stopPropagation();
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
      setCompleted(true);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
      toast.success("完了したよ！");
      await onChanged?.();
    } catch (error) {
      console.error(error);
      toast.error("完了できなかった。もう一度試してみてね。");
    }
  };

  const handleEdit = (e: MouseEvent) => {
    e.stopPropagation();
    setEditOpen(true);
  };

  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation();
    setDeleteOpen(true);
  };

  const submitEdit = async (values: Record<string, string>) => {
    const title = values.title?.trim();
    if (!title) {
      toast.error("タスク名を入力してね。");
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, notes: values.notes?.trim() || undefined }),
      });
      if (!response.ok) {
        const ct = response.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          throw new Error("サーバーに接続できませんでした");
        }
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "操作に失敗しました");
      }
      toast.success("更新したよ。");
      setEditOpen(false);
      await onChanged?.();
    } catch (error) {
      console.error(error);
      toast.error("更新できなかった。もう一度試してみてね。");
    }
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, { method: "DELETE" });
      if (!response.ok) {
        const ct = response.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          throw new Error("サーバーに接続できませんでした");
        }
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "操作に失敗しました");
      }
      toast.success("削除したよ。");
      setDeleteOpen(false);
      await onChanged?.();
    } catch (error) {
      console.error(error);
      toast.error("削除できなかった。もう一度試してみてね。");
    }
  };

  return (
    <>
      <div
        className={`bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden transition-all hover:shadow-[var(--shadow-md)] ${
          completed ? "opacity-50" : ""
        }`}
      >
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-[var(--color-surface-hover)]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-1 h-10 rounded-full shrink-0 ${priorityColors[task.priority]}`} />

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
          </div>
        </div>

        {expanded ? <ChevronUp size={16} className="text-[var(--color-muted)] shrink-0" /> : <ChevronDown size={16} className="text-[var(--color-border)] shrink-0" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-[var(--color-border-light)]">
          {task.notes && <p className="text-xs text-[var(--color-muted)] mt-3 mb-3 leading-relaxed">{task.notes}</p>}
          <div className="flex items-center gap-2 mt-3">
            <span
              className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                task.priority === 1
                  ? "bg-[var(--color-priority-high-bg)] text-[var(--color-priority-high)]"
                  : task.priority === 2
                    ? "bg-[var(--color-priority-mid-bg)] text-[var(--color-priority-mid)]"
                    : "bg-[var(--color-priority-low-bg)] text-[var(--color-priority-low)]"
              }`}
            >
              優先度: {priorityLabels[task.priority]}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={handleEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/8 rounded-[var(--radius-md)] hover:bg-[var(--color-primary)]/15 transition-colors">
              <Pencil size={12} />
              編集
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-priority-high)] bg-[var(--color-priority-high)]/8 rounded-[var(--radius-md)] hover:bg-[var(--color-priority-high)]/15 transition-colors"
            >
              <Trash2 size={12} />
              削除
            </button>
          </div>
        </div>
      )}
      </div>

      <InputDialog
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onSubmit={submitEdit}
        title="タスクを編集"
        fields={[
          { name: "title", label: "タスク名", defaultValue: task.title, placeholder: "タスク名", required: true },
          { name: "notes", label: "メモ", defaultValue: task.notes ?? "", placeholder: "メモ（任意）", multiline: true },
        ]}
      />

      <ConfirmDialog
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="タスクを削除しますか？"
        description={`「${task.title}」を削除します。あとで戻せません。`}
        confirmLabel="削除する"
        variant="danger"
      />
    </>
  );
}
