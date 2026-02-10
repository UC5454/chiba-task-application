"use client";

import * as Dialog from "@radix-ui/react-dialog";

type ConfirmDialogProps = {
  open: boolean;
  onConfirm: () => void;
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
  const confirmClass =
    variant === "danger"
      ? "bg-[var(--color-priority-high)] text-white hover:opacity-90"
      : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]";

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => (!nextOpen ? onCancel() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          className="fixed z-50 left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-lg)] p-5 focus:outline-none"
          aria-label={title}
        >
          <Dialog.Title className="text-sm font-bold text-[var(--color-foreground)]">{title}</Dialog.Title>
          {description && <Dialog.Description className="text-xs text-[var(--color-muted)] mt-2 leading-relaxed">{description}</Dialog.Description>}
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] bg-[var(--color-surface-hover)] text-[var(--color-muted)] hover:bg-[var(--color-border-light)] transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={onConfirm}
              className={`px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] transition-colors ${confirmClass}`}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
