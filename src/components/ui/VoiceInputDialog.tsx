"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Mic, MicOff, Check, X } from "lucide-react";
import { useEffect } from "react";
import { useVoiceInput } from "@/hooks/useVoiceInput";

type VoiceInputDialogProps = {
  open: boolean;
  onSubmit: (transcript: string) => void;
  onCancel: () => void;
  title?: string;
};

export function VoiceInputDialog({
  open,
  onSubmit,
  onCancel,
  title = "音声でタスクを追加",
}: VoiceInputDialogProps) {
  const {
    state,
    transcript,
    interimTranscript,
    start,
    stop,
    reset,
  } = useVoiceInput({
    lang: "ja-JP",
  });

  // ダイアログが開いたら自動で録音開始
  useEffect(() => {
    if (open) {
      // 少し遅延させてダイアログの描画後に開始
      const timer = setTimeout(() => start(), 300);
      return () => clearTimeout(timer);
    } else {
      reset();
    }
  }, [open, start, reset]);

  const handleSubmit = () => {
    const text = transcript.trim();
    if (text) {
      stop();
      onSubmit(text);
    }
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const handleToggle = () => {
    if (state === "listening") {
      stop();
    } else {
      start();
    }
  };

  const displayText = transcript || interimTranscript;
  const isListening = state === "listening";

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && handleCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
        <Dialog.Content
          className="fixed z-50 left-1/2 top-1/2 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-2xl)] bg-[var(--color-surface)] shadow-[var(--shadow-xl)] p-6 focus:outline-none animate-slide-in"
          aria-label={title}
        >
          <Dialog.Title className="text-base font-bold text-[var(--color-foreground)] text-center">
            {title}
          </Dialog.Title>

          {/* マイクアニメーション */}
          <div className="flex flex-col items-center mt-6 mb-4">
            <button
              onClick={handleToggle}
              className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all active:scale-95 ${
                isListening
                  ? "bg-[var(--color-priority-high)]/10"
                  : "bg-[var(--color-surface-hover)]"
              }`}
              aria-label={isListening ? "録音停止" : "録音開始"}
            >
              {/* パルスリング */}
              {isListening && (
                <>
                  <span className="absolute inset-0 rounded-full bg-[var(--color-priority-high)]/20 animate-ping" />
                  <span className="absolute inset-[-6px] rounded-full border-2 border-[var(--color-priority-high)]/30 animate-pulse" />
                </>
              )}
              {isListening ? (
                <Mic size={32} className="text-[var(--color-priority-high)] relative z-10" />
              ) : (
                <MicOff size={32} className="text-[var(--color-muted)] relative z-10" />
              )}
            </button>

            <p className="mt-3 text-xs text-[var(--color-muted)]">
              {isListening
                ? "話してください..."
                : transcript
                  ? "タップで再録音"
                  : "タップで録音開始"}
            </p>
          </div>

          {/* 認識テキスト表示 */}
          <div className="min-h-[60px] rounded-[var(--radius-lg)] bg-[var(--color-background)] px-4 py-3 mb-5">
            {displayText ? (
              <p className="text-sm text-[var(--color-foreground)] leading-relaxed">
                {transcript && <span>{transcript}</span>}
                {interimTranscript && (
                  <span className="text-[var(--color-muted)]">{interimTranscript}</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-[var(--color-muted)]/50 text-center">
                音声がここに表示されます
              </p>
            )}
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-[var(--radius-lg)] bg-[var(--color-surface-hover)] text-[var(--color-muted)] hover:bg-[var(--color-border-light)] transition-colors btn-press"
            >
              <X size={14} />
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              disabled={!transcript.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] transition-colors btn-press disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check size={14} />
              タスクに追加
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
