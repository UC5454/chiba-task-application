"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

type ConfirmDialogProps = {
  open: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: "danger" | "default";
};

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = "OK",
  variant = "default",
}: ConfirmDialogProps) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  };

  const confirmClass =
    variant === "danger"
      ? "bg-[var(--color-priority-high)] text-white hover:opacity-90"
      : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]";

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => (!nextOpen ? onCancel() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
        <Dialog.Content
          className="fixed z-50 left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-2xl)] bg-[var(--color-surface)] shadow-[var(--shadow-xl)] p-6 focus:outline-none animate-slide-in"
          aria-label={title}
        >
          <Dialog.Title className="text-base font-bold text-[var(--color-foreground)]">{title}</Dialog.Title>
          {description && <Dialog.Description className="text-xs text-[var(--color-muted)] mt-2 leading-relaxed">{description}</Dialog.Description>}
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={onCancel}
              disabled={confirming}
              className="px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] bg-[var(--color-surface-hover)] text-[var(--color-muted)] hover:bg-[var(--color-border-light)] transition-colors btn-press"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className={`px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] transition-colors btn-press ${confirmClass}`}
            >
              {confirming ? "処理中..." : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
