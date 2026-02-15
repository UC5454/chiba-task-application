"use client";

import { Plus, Search, StickyNote, Tag } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { useNotes } from "@/hooks/useNotes";
import { useToast } from "@/components/ui/ToastProvider";

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

function NotesContent() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showNewMemo, setShowNewMemo] = useState(false);
  const [newMemoText, setNewMemoText] = useState("");
  const [newMemoTags, setNewMemoTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const { toast } = useToast();

  const { notes, mutate } = useNotes(selectedTag, searchQuery);
  const allTags = useMemo(() => Array.from(new Set(notes.flatMap((m) => m.tags))), [notes]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowNewMemo(true);
    }
  }, [searchParams]);

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, "");
    if (tag && !newMemoTags.includes(tag)) {
      setNewMemoTags([...newMemoTags, tag]);
    }
    setTagInput("");
    setShowTagInput(false);
  };

  const removeTag = (tag: string) => {
    setNewMemoTags(newMemoTags.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    if (!newMemoText.trim()) return;

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMemoText.trim(), tags: newMemoTags }),
      });
      if (!response.ok) {
        const ct = response.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          throw new Error("サーバーに接続できませんでした");
        }
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "操作に失敗しました");
      }

      setNewMemoText("");
      setNewMemoTags([]);
      setShowNewMemo(false);
      await mutate();
      toast.success("メモを保存したよ。");
    } catch (error) {
      console.error(error);
      toast.error("メモを保存できなかった。もう一度試してみてね。");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] flex items-center gap-2">
          <StickyNote size={20} className="text-[var(--color-streak)]" />
          メモ
        </h1>
        <button onClick={() => setShowNewMemo(true)} className="flex items-center gap-1.5 text-xs font-medium text-white bg-[var(--color-streak)] px-3.5 py-2 rounded-full hover:opacity-90 transition-opacity shadow-[var(--shadow-sm)]">
          <Plus size={14} />
          メモ追加
        </button>
      </div>

      {showNewMemo && (
        <div className="bg-[var(--color-memo)] rounded-[var(--radius-xl)] p-5 animate-fade-in-up" style={{ boxShadow: "var(--shadow-card)" }}>
          <textarea value={newMemoText} onChange={(e) => setNewMemoText(e.target.value)} placeholder="思いついたことを書こう..." className="w-full h-28 bg-transparent text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] resize-none focus:outline-none leading-relaxed" autoFocus />
          <div className="mt-2 pt-2 border-t border-[var(--color-streak)]/10 space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {newMemoTags.map((tag) => (
                <button key={tag} onClick={() => removeTag(tag)} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-[var(--color-streak)] bg-[var(--color-streak)]/10 rounded-full hover:bg-[var(--color-streak)]/20 transition-colors">
                  #{tag} ×
                </button>
              ))}
              {showTagInput ? (
                <form onSubmit={(e) => { e.preventDefault(); addTag(); }} className="flex items-center gap-1">
                  <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="タグ名" className="w-20 px-2 py-1 text-[10px] bg-[var(--color-surface)] border border-[var(--color-streak)]/30 rounded-full focus:outline-none focus:border-[var(--color-streak)]" autoFocus />
                  <button type="submit" className="text-[10px] font-medium text-[var(--color-streak)]">追加</button>
                  <button type="button" onClick={() => { setShowTagInput(false); setTagInput(""); }} className="text-[10px] text-[var(--color-muted)]">×</button>
                </form>
              ) : (
                <button onClick={() => setShowTagInput(true)} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-[var(--color-muted)] bg-[var(--color-surface)] rounded-full shadow-[var(--shadow-sm)] hover:border-[var(--color-streak)] transition-colors">
                  <Tag size={10} />
                  タグ追加
                </button>
              )}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => { setShowNewMemo(false); setNewMemoText(""); setNewMemoTags([]); }} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors">キャンセル</button>
              <button onClick={handleSave} className="text-xs font-medium text-white bg-[var(--color-streak)] px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity">保存</button>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="メモを検索..." className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-sm)] border-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button onClick={() => setSelectedTag(null)} className={`shrink-0 px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors ${!selectedTag ? "bg-[var(--color-streak)] text-white" : "bg-[var(--color-surface)] text-[var(--color-muted)] shadow-[var(--shadow-sm)]"}`}>すべて</button>
        {allTags.map((tag) => (
          <button key={tag} onClick={() => setSelectedTag(selectedTag === tag ? null : tag)} className={`shrink-0 px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors ${selectedTag === tag ? "bg-[var(--color-streak)] text-white" : "bg-[var(--color-surface)] text-[var(--color-muted)] shadow-[var(--shadow-sm)]"}`}>#{tag}</button>
        ))}
      </div>

      <div className="space-y-3">
        {notes.map((memo, i) => (
          <div key={memo.id} className="bg-[var(--color-memo)] rounded-[var(--radius-xl)] p-4 transition-all cursor-pointer animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s`, boxShadow: "var(--shadow-card)" }}>
            <p className="text-sm text-[var(--color-foreground)] leading-relaxed line-clamp-3">{memo.content}</p>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1.5">
                {memo.tags.map((tag) => (
                  <span key={tag} className="text-[10px] font-medium text-[var(--color-streak)] bg-[var(--color-streak)]/10 px-1.5 py-0.5 rounded">#{tag}</span>
                ))}
              </div>
              <span className="text-[10px] text-[var(--color-muted)]">{formatDate(memo.createdAt)}</span>
            </div>
            {memo.relatedTaskTitle && (
              <div className="mt-2 pt-2 border-t border-[var(--color-streak)]/10">
                <span className="text-[10px] text-[var(--color-muted)]">関連: {memo.relatedTaskTitle}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-8"><div className="h-8 w-32 bg-[var(--color-surface-hover)] rounded animate-pulse" /></div>}>
      <NotesContent />
    </Suspense>
  );
}
