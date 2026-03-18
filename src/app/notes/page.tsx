"use client";

import { Check, Edit3, Hash, Loader2, Plus, Search, Sparkles, StickyNote, Trash2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useNotes } from "@/hooks/useNotes";
import { useToast } from "@/components/ui/ToastProvider";
import type { Memo } from "@/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return "たった今";
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "昨日";
  if (days < 7) return `${days}日前`;
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

// ── Gemini enhance helper ──
async function enhance(content: string, action: "polish" | "summarize" | "actionItems" | "tags") {
  const res = await fetch("/api/notes/enhance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, action }),
  });
  if (!res.ok) throw new Error("AI処理に失敗");
  return (await res.json()) as { result: string | string[] };
}

// ── Memo Card ──
function MemoCard({
  memo,
  onUpdate,
  onDelete,
}: {
  memo: Memo;
  onUpdate: (id: string, data: { content?: string; tags?: string[] }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(memo.content);
  const [editTags, setEditTags] = useState(memo.tags);
  const [tagInput, setTagInput] = useState("");
  const [showActions, setShowActions] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [isEditing]);

  const handleSave = async () => {
    await onUpdate(memo.notionPageId ?? memo.id, { content: editContent, tags: editTags });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(memo.content);
    setEditTags(memo.tags);
    setIsEditing(false);
  };

  const handleAiAction = async (action: "tags") => {
    setAiLoading(action);
    try {
      const { result } = await enhance(editContent || memo.content, action);
      if (Array.isArray(result)) {
        const merged = Array.from(new Set([...editTags, ...result]));
        setEditTags(merged);
        if (!isEditing) setIsEditing(true);
        toast.success("タグを提案しました");
      }
    } catch {
      toast.error("AI処理に失敗しました");
    } finally {
      setAiLoading(null);
    }
  };

  const addEditTag = () => {
    const tag = tagInput.trim().replace(/^#/, "");
    if (tag && !editTags.includes(tag)) {
      setEditTags([...editTags, tag]);
    }
    setTagInput("");
  };

  return (
    <div
      className="group relative bg-[var(--color-surface)] rounded-[var(--radius-xl)] transition-all duration-300 hover:shadow-[var(--shadow-card-hover)]"
      style={{ boxShadow: "var(--shadow-card)" }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { if (!isEditing) setShowActions(false); }}
    >
      {/* ── Action buttons (top-right, on hover) ── */}
      <div className={`absolute top-3 right-3 flex items-center gap-1 transition-opacity duration-200 ${showActions || isEditing ? "opacity-100" : "opacity-0"}`}>
        {!isEditing && (
          <>
            <button
              onClick={() => handleAiAction("tags")}
              disabled={!!aiLoading}
              className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-amber-500 hover:bg-amber-50 transition-colors"
              title="タグ提案"
            >
              {aiLoading === "tags" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            </button>
            <button
              onClick={() => { setIsEditing(true); setShowActions(true); }}
              className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-blue-500 hover:bg-blue-50 transition-colors"
              title="編集"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
              title="削除"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>

      {/* ── Delete confirmation ── */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-[var(--radius-xl)] flex items-center justify-center gap-3 z-10 animate-fade-in-up">
          <span className="text-sm text-[var(--color-foreground)]">削除する？</span>
          <button
            onClick={async () => { await onDelete(memo.notionPageId ?? memo.id); setShowDeleteConfirm(false); }}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-full hover:bg-red-600 transition-colors"
          >
            削除
          </button>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] bg-[var(--color-surface-hover)] rounded-full hover:bg-[var(--color-border)] transition-colors"
          >
            やめる
          </button>
        </div>
      )}

      <div className="p-5">
        {isEditing ? (
          /* ── Edit mode ── */
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => {
                setEditContent(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              className="w-full min-h-[80px] bg-transparent text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] resize-none focus:outline-none leading-relaxed"
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              {editTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setEditTags(editTags.filter((t) => t !== tag))}
                  className="flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                >
                  #{tag} <X size={10} />
                </button>
              ))}
              <form
                onSubmit={(e) => { e.preventDefault(); addEditTag(); }}
                className="inline-flex"
              >
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="+ タグ"
                  className="w-16 px-2 py-1 text-[10px] bg-transparent text-[var(--color-muted)] focus:outline-none focus:text-[var(--color-foreground)] placeholder:text-[var(--color-border)]"
                />
              </form>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={handleCancel} className="px-3 py-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors">
                キャンセル
              </button>
              <button onClick={handleSave} className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium text-white bg-[var(--color-primary)] rounded-full hover:bg-[var(--color-primary-dark)] transition-colors">
                <Check size={12} /> 保存
              </button>
            </div>
          </div>
        ) : (
          /* ── View mode ── */
          <>
            <p className="text-sm text-[var(--color-foreground)] leading-relaxed whitespace-pre-wrap pr-24">{memo.content}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border-light)]">
              <div className="flex items-center gap-1.5 flex-wrap">
                {memo.tags.map((tag) => (
                  <span key={tag} className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    #{tag}
                  </span>
                ))}
                {memo.relatedTaskTitle && (
                  <span className="text-[10px] text-[var(--color-muted)] bg-[var(--color-surface-hover)] px-2 py-0.5 rounded-full">
                    {memo.relatedTaskTitle}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[var(--color-muted)] shrink-0">{formatDate(memo.createdAt)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── New Memo Composer ──
function MemoComposer({
  onSave,
  onClose,
}: {
  onSave: (content: string, tags: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await onSave(content.trim(), tags);
      setContent("");
      setTags([]);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  const suggestTags = async () => {
    if (!content.trim()) return;
    setAiLoading(true);
    try {
      const { result } = await enhance(content, "tags");
      if (Array.isArray(result)) {
        setTags(Array.from(new Set([...tags, ...result])));
        toast.success("タグを提案しました");
      }
    } catch {
      toast.error("タグ提案に失敗");
    } finally {
      setAiLoading(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, "");
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setTagInput("");
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] overflow-hidden animate-fade-in-up" style={{ boxShadow: "var(--shadow-lg)" }}>
      <div className="p-5">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 300) + "px";
          }}
          onKeyDown={handleKeyDown}
          placeholder="メモを書く...  ⌘+Enter で保存"
          className="w-full min-h-[100px] bg-transparent text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] resize-none focus:outline-none leading-relaxed"
        />
      </div>
      <div className="px-5 pb-4 space-y-3">
        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTags(tags.filter((t) => t !== tag))}
              className="flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
            >
              #{tag} <X size={10} />
            </button>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); addTag(); }} className="inline-flex">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="+ タグ"
              className="w-16 px-2 py-1 text-[10px] bg-transparent text-[var(--color-muted)] focus:outline-none focus:text-[var(--color-foreground)] placeholder:text-[var(--color-border)]"
            />
          </form>
        </div>
        {/* Bottom bar */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-light)]">
          <button
            onClick={suggestTags}
            disabled={!content.trim() || aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-purple-600 bg-purple-50 rounded-full hover:bg-purple-100 transition-colors disabled:opacity-40"
          >
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            AIタグ提案
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors">
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={!content.trim() || saving}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium text-white bg-[var(--color-primary)] rounded-full hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
function NotesContent() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const { toast } = useToast();
  const { notes, mutate } = useNotes(selectedTag, searchQuery);
  const allTags = useMemo(() => Array.from(new Set(notes.flatMap((m) => m.tags))), [notes]);

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowComposer(true);
  }, [searchParams]);

  // Keyboard shortcut: Cmd+N to create
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setShowComposer(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleCreate = useCallback(async (content: string, tags: string[]) => {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, tags }),
    });
    if (!res.ok) throw new Error("保存失敗");
    await mutate();
    setShowComposer(false);
    toast.success("メモを保存しました");
  }, [mutate, toast]);

  const handleUpdate = useCallback(async (id: string, data: { content?: string; tags?: string[] }) => {
    const res = await fetch(`/api/notes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("更新失敗");
    await mutate();
    toast.success("更新しました");
  }, [mutate, toast]);

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("削除失敗");
    await mutate();
    toast.success("削除しました");
  }, [mutate, toast]);

  // Filter notes by search (client-side)
  const filtered = useMemo(() => {
    if (!searchQuery) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter((m) => m.content.toLowerCase().includes(q) || m.tags.some((t) => t.toLowerCase().includes(q)));
  }, [notes, searchQuery]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
            <StickyNote size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[var(--color-foreground)]">メモ</h1>
            <p className="text-[11px] text-[var(--color-muted)]">{filtered.length}件</p>
          </div>
        </div>
        <button
          onClick={() => setShowComposer(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[var(--color-primary)] rounded-full hover:bg-[var(--color-primary-dark)] transition-colors shadow-sm btn-press"
        >
          <Plus size={14} />
          新規メモ
        </button>
      </div>

      {/* ── Composer ── */}
      {showComposer && (
        <MemoComposer onSave={handleCreate} onClose={() => setShowComposer(false)} />
      )}

      {/* ── Search ── */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="メモを検索..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border-light)] focus:outline-none focus:border-[var(--color-primary)]/30 focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Tag filter ── */}
      {allTags.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          <button
            onClick={() => setSelectedTag(null)}
            className={`shrink-0 px-3 py-1.5 text-[11px] font-medium rounded-full transition-all duration-200 ${!selectedTag ? "bg-[var(--color-primary)] text-white shadow-sm" : "bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border-light)] hover:border-[var(--color-primary)]/30"}`}
          >
            すべて
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-full transition-all duration-200 ${selectedTag === tag ? "bg-[var(--color-primary)] text-white shadow-sm" : "bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border-light)] hover:border-[var(--color-primary)]/30"}`}
            >
              <Hash size={10} />
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* ── Memo list ── */}
      <div className="space-y-3">
        {filtered.length === 0 && !showComposer && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--color-surface)] flex items-center justify-center" style={{ boxShadow: "var(--shadow-md)" }}>
              <StickyNote size={28} className="text-[var(--color-muted)]" />
            </div>
            <p className="text-sm text-[var(--color-muted)]">
              {searchQuery ? "検索結果がありません" : "メモがありません"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowComposer(true)}
                className="mt-3 text-xs font-medium text-[var(--color-primary)] hover:underline"
              >
                最初のメモを作成する
              </button>
            )}
          </div>
        )}
        {filtered.map((memo, i) => (
          <div key={memo.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.03}s` }}>
            <MemoCard memo={memo} onUpdate={handleUpdate} onDelete={handleDelete} />
          </div>
        ))}
      </div>

      {/* ── FAB (mobile) ── */}
      {!showComposer && (
        <button
          onClick={() => setShowComposer(true)}
          className="fixed bottom-24 right-5 w-14 h-14 bg-[var(--color-primary)] text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-[var(--color-primary-dark)] transition-all active:scale-95 md:hidden z-40"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8"><div className="h-8 w-32 bg-[var(--color-surface-hover)] rounded animate-pulse" /></div>}>
      <NotesContent />
    </Suspense>
  );
}
