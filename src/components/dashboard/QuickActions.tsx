"use client";

import { useRouter } from "next/navigation";
import { Plus, StickyNote, Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";

import { VoiceInputDialog } from "@/components/ui/VoiceInputDialog";
import { useToast } from "@/components/ui/ToastProvider";

export function QuickActions() {
  const router = useRouter();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [isInlineInput, setIsInlineInput] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { toast } = useToast();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    if (!isInlineInput) {
      return;
    }
    inputRef.current?.focus();
  }, [isInlineInput]);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
      }
    };
  }, []);

  const handleQuickTask = () => {
    setIsInlineInput(true);
  };

  const handleQuickNote = () => {
    router.push("/notes?new=1");
  };

  const handleVoiceInput = () => {
    setVoiceOpen(true);
  };

  const submitVoiceTask = async (transcript: string) => {
    const title = transcript.trim();
    if (!title) return;

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
      toast.success(`「${title}」を追加したよ。`);
      setVoiceOpen(false);
      mutate("/api/tasks?filter=today");
      mutate("/api/tasks?filter=all");
    } catch (error) {
      console.error(error);
      toast.error("追加できなかった。もう一度試してみてね。");
    }
  };

  const submitQuickTask = async () => {
    const title = quickTitle.trim();
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
      setQuickTitle("");
      mutate("/api/tasks?filter=today");
      mutate("/api/tasks?filter=all");
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (error) {
      console.error(error);
      toast.error("追加できなかった。もう一度試してみてね。");
    }
  };

  const closeInlineInput = () => {
    setQuickTitle("");
    setIsInlineInput(false);
  };

  return (
    <>
      <div className="flex gap-3 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        {isInlineInput ? (
          <input
            ref={inputRef}
            type="text"
            value={quickTitle}
            onChange={(event) => setQuickTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void submitQuickTask();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                closeInlineInput();
              }
            }}
            onFocus={() => {
              if (blurTimerRef.current) {
                clearTimeout(blurTimerRef.current);
                blurTimerRef.current = null;
              }
            }}
            onBlur={() => {
              blurTimerRef.current = setTimeout(() => {
                closeInlineInput();
              }, 3000);
            }}
            placeholder="タスク名を入力してEnter"
            className="flex-1 px-4 py-3.5 bg-[var(--color-surface)] border border-[var(--color-card-border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)]"
          />
        ) : (
          <button
            onClick={handleQuickTask}
            className="flex-1 flex items-center gap-3 px-4 py-3.5 bg-[var(--color-surface)] border border-[var(--color-card-border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-primary)]/10">
              <Plus size={18} className="text-[var(--color-primary)]" />
            </div>
            <span className="text-sm text-[var(--color-muted)]">タスクを追加...</span>
          </button>
        )}

        <button
          onClick={handleQuickNote}
          className="flex items-center justify-center w-11 h-11 bg-[var(--color-memo)] rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all active:scale-[0.98]"
          aria-label="メモを追加"
        >
          <StickyNote size={20} className="text-[var(--color-streak)]" />
        </button>

        <button
          onClick={handleVoiceInput}
          className="flex items-center justify-center w-11 h-11 bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all active:scale-[0.98]"
          aria-label="音声で入力"
        >
          <Mic size={20} className="text-[var(--color-muted)]" />
        </button>
      </div>

      <VoiceInputDialog
        open={voiceOpen}
        onCancel={() => setVoiceOpen(false)}
        onSubmit={submitVoiceTask}
      />
    </>
  );
}
