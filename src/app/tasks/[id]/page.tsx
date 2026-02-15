"use client";

import confetti from "canvas-confetti";
import { ArrowLeft, Calendar, Check, Clock, Loader2, StickyNote, Tag, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import type { Category, Memo, Priority, Task } from "@/types";

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 1, label: "高", color: "bg-[var(--color-priority-high)]" },
  { value: 2, label: "中", color: "bg-[var(--color-priority-mid)]" },
  { value: 3, label: "低", color: "bg-[var(--color-priority-low)]" },
];

const categoryOptions: { value: Category; label: string }[] = [
  { value: "DG", label: "DG" },
  { value: "BND", label: "BND" },
  { value: "SOU", label: "SOU" },
  { value: "AI_COMMUNITY", label: "AI" },
  { value: "PERSONAL", label: "個人" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "たった今";
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "昨日";
  return `${days}日前`;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [relatedNotes, setRelatedNotes] = useState<Memo[]>([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [showNewNote, setShowNewNote] = useState(false);

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch task
  useEffect(() => {
    const fetchTask = async () => {
      try {
        const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error("Failed to fetch task");
        const data = (await res.json()) as { task: Task };
        setTask(data.task);
      } catch (err) {
        console.error(err);
        toast.error("タスクの読み込みに失敗した。");
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [id, toast]);

  // Fetch related notes
  useEffect(() => {
    if (!id) return;
    const fetchNotes = async () => {
      try {
        const res = await fetch(`/api/notes?taskId=${encodeURIComponent(id)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { notes: Memo[] };
        setRelatedNotes(data.notes);
      } catch {
        // silent
      }
    };
    fetchNotes();
  }, [id]);

  // Auto-save with debounce
  const saveTask = useCallback(
    async (updates: Record<string, unknown>) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error("Save failed");
      } catch {
        toast.error("保存に失敗した。");
      } finally {
        setSaving(false);
      }
    },
    [id, toast],
  );

  const debouncedSave = useCallback(
    (updates: Record<string, unknown>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => saveTask(updates), 500);
    },
    [saveTask],
  );

  const updateField = <K extends keyof Task>(field: K, value: Task[K]) => {
    if (!task) return;
    setTask({ ...task, [field]: value });
    debouncedSave({ [field]: value });
  };

  const handleComplete = async () => {
    if (!task || task.completed) return;
    setTask({ ...task, completed: true });
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
    toast.success("完了したよ！");
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(id)}/complete`, { method: "POST" });
      if (!res.ok) throw new Error("Complete failed");
      setTimeout(() => router.back(), 600);
    } catch {
      setTask({ ...task, completed: false });
      toast.error("完了できなかった。もう一度試してみてね。");
    }
  };

  const confirmDelete = async () => {
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("削除したよ。");
      setDeleteOpen(false);
      router.back();
    } catch {
      toast.error("削除できなかった。もう一度試してみてね。");
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim() || !task) return;
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newNoteText.trim(),
          tags: [],
          relatedTaskId: task.id,
          relatedTaskTitle: task.title,
        }),
      });
      if (!res.ok) throw new Error("Note creation failed");
      const data = (await res.json()) as { note: Memo };
      setRelatedNotes([data.note, ...relatedNotes]);
      setNewNoteText("");
      setShowNewNote(false);
      toast.success("メモを追加したよ。");
    } catch {
      toast.error("メモの追加に失敗した。");
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 size={24} className="animate-spin text-[var(--color-muted)]" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-sm text-[var(--color-muted)]">タスクが見つかりませんでした。</p>
        <button onClick={() => router.back()} className="mt-4 text-xs text-[var(--color-primary)]">
          戻る
        </button>
      </div>
    );
  }

  const dueDateValue = task.dueDate ? task.dueDate.split("T")[0] : "";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-surface)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-surface-hover)] transition-colors"
          aria-label="戻る"
        >
          <ArrowLeft size={16} className="text-[var(--color-muted)]" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          {saving && <Loader2 size={14} className="animate-spin text-[var(--color-muted)]" />}
        </div>
      </div>

      {/* Title */}
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <input
          type="text"
          value={task.title}
          onChange={(e) => updateField("title", e.target.value)}
          className="w-full text-lg font-bold text-[var(--color-foreground)] bg-transparent border-none focus:outline-none"
          placeholder="タスク名"
        />
      </div>

      {/* Fields */}
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-5 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
        {/* Due Date */}
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-[var(--color-muted)] shrink-0" />
          <span className="text-xs text-[var(--color-muted)] w-16 shrink-0">期限</span>
          <input
            type="date"
            value={dueDateValue}
            onChange={(e) => updateField("dueDate", e.target.value || undefined)}
            className="flex-1 text-sm text-[var(--color-foreground)] bg-transparent border border-[var(--color-border-light)] rounded-[var(--radius-md)] px-3 py-1.5 focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        {/* Category */}
        <div className="flex items-center gap-3">
          <Tag size={16} className="text-[var(--color-muted)] shrink-0" />
          <span className="text-xs text-[var(--color-muted)] w-16 shrink-0">カテゴリ</span>
          <div className="flex gap-1.5 flex-wrap">
            {categoryOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateField("category", task.category === opt.value ? undefined : opt.value)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                  task.category === opt.value
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-surface-hover)] text-[var(--color-muted)] hover:bg-[var(--color-border-light)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div className="flex items-center gap-3">
          <span className="text-[var(--color-muted)] shrink-0 w-4 text-center text-xs">⚡</span>
          <span className="text-xs text-[var(--color-muted)] w-16 shrink-0">優先度</span>
          <div className="flex gap-1.5">
            {priorityOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateField("priority", opt.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                  task.priority === opt.value
                    ? `${opt.color} text-white`
                    : "bg-[var(--color-surface-hover)] text-[var(--color-muted)] hover:bg-[var(--color-border-light)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Estimated Minutes */}
        <div className="flex items-center gap-3">
          <Clock size={16} className="text-[var(--color-muted)] shrink-0" />
          <span className="text-xs text-[var(--color-muted)] w-16 shrink-0">見積時間</span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={task.estimatedMinutes ?? ""}
              onChange={(e) => updateField("estimatedMinutes", e.target.value ? Number(e.target.value) : undefined)}
              className="w-20 text-sm text-[var(--color-foreground)] bg-transparent border border-[var(--color-border-light)] rounded-[var(--radius-md)] px-3 py-1.5 focus:outline-none focus:border-[var(--color-primary)]"
              placeholder="—"
              min={0}
            />
            <span className="text-xs text-[var(--color-muted)]">分</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-[var(--color-foreground)]">メモ</span>
        </div>
        <textarea
          value={task.notes ?? ""}
          onChange={(e) => updateField("notes", e.target.value || undefined)}
          className="w-full min-h-[100px] text-sm text-[var(--color-foreground)] bg-transparent border border-[var(--color-border-light)] rounded-[var(--radius-md)] px-3 py-2 focus:outline-none focus:border-[var(--color-primary)] resize-y leading-relaxed"
          placeholder="メモを入力..."
        />
      </div>

      {/* Related Notes (Notion) */}
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StickyNote size={14} className="text-[var(--color-streak)]" />
            <span className="text-xs font-medium text-[var(--color-foreground)]">関連メモ</span>
            {relatedNotes.length > 0 && (
              <span className="text-[10px] text-[var(--color-muted)] bg-[var(--color-surface-hover)] px-1.5 py-0.5 rounded-full">{relatedNotes.length}</span>
            )}
          </div>
          <button
            onClick={() => setShowNewNote(!showNewNote)}
            className="text-[11px] font-medium text-[var(--color-streak)] hover:opacity-80 transition-opacity"
          >
            + 追加
          </button>
        </div>

        {showNewNote && (
          <div className="mb-3 space-y-2">
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              className="w-full h-20 text-sm text-[var(--color-foreground)] bg-[var(--color-memo)] border border-[var(--color-streak)]/20 rounded-[var(--radius-md)] px-3 py-2 focus:outline-none focus:border-[var(--color-streak)] resize-none leading-relaxed"
              placeholder="メモを入力..."
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowNewNote(false); setNewNoteText(""); }}
                className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddNote}
                className="text-xs font-medium text-white bg-[var(--color-streak)] px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity"
              >
                保存
              </button>
            </div>
          </div>
        )}

        {relatedNotes.length === 0 && !showNewNote && (
          <p className="text-xs text-[var(--color-muted)] text-center py-4">関連メモはまだないよ</p>
        )}

        <div className="space-y-2">
          {relatedNotes.map((note) => (
            <div key={note.id} className="bg-[var(--color-memo)] rounded-[var(--radius-md)] p-3">
              <p className="text-xs text-[var(--color-foreground)] leading-relaxed">{note.content}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5">
                  {note.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-medium text-[var(--color-streak)] bg-[var(--color-streak)]/10 px-1.5 py-0.5 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-[var(--color-muted)]">{formatDate(note.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {!task.completed && (
          <button
            onClick={handleComplete}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-[var(--color-success)] rounded-[var(--radius-xl)] hover:opacity-90 transition-opacity shadow-[var(--shadow-sm)]"
          >
            <Check size={16} />
            完了する
          </button>
        )}
        <button
          onClick={() => setDeleteOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-[var(--color-priority-high)] bg-[var(--color-priority-high)]/8 rounded-[var(--radius-xl)] hover:bg-[var(--color-priority-high)]/15 transition-colors"
        >
          <Trash2 size={16} />
          削除
        </button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="タスクを削除しますか？"
        description={`「${task.title}」を削除します。あとで戻せません。`}
        confirmLabel="削除する"
        variant="danger"
      />
    </div>
  );
}
