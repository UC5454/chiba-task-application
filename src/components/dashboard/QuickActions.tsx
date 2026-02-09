"use client";

import { useRouter } from "next/navigation";
import { Plus, StickyNote, Mic } from "lucide-react";

export function QuickActions() {
  const router = useRouter();

  const handleQuickTask = () => {
    router.push("/tasks?quickAdd=1");
  };

  const handleQuickNote = () => {
    router.push("/notes?new=1");
  };

  const handleVoiceInput = () => {
    window.alert("音声入力は準備中です。いまはテキストで追加してみよう。");
  };

  return (
    <div className="flex gap-3 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
      {/* クイックタスク追加 */}
      <button
        onClick={handleQuickTask}
        className="flex-1 flex items-center gap-3 px-4 py-3.5 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-primary)]/30 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-primary)]/10">
          <Plus size={18} className="text-[var(--color-primary)]" />
        </div>
        <span className="text-sm text-[var(--color-muted)]">タスクを追加...</span>
      </button>

      {/* メモボタン */}
      <button
        onClick={handleQuickNote}
        className="flex items-center justify-center w-12 h-12 bg-[var(--color-memo)] rounded-[var(--radius-lg)] border border-[var(--color-streak)]/20 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all active:scale-[0.98]"
        aria-label="メモを追加"
      >
        <StickyNote size={20} className="text-[var(--color-streak)]" />
      </button>

      {/* 音声入力ボタン */}
      <button
        onClick={handleVoiceInput}
        className="flex items-center justify-center w-12 h-12 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all active:scale-[0.98]"
        aria-label="音声で入力"
      >
        <Mic size={20} className="text-[var(--color-muted)]" />
      </button>
    </div>
  );
}
