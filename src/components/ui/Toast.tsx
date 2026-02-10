"use client";

import * as RadixToast from "@radix-ui/react-toast";

type ToastProps = {
  message: string;
  type?: "success" | "error" | "info";
  onOpenChange: (open: boolean) => void;
};

export function Toast({ message, type = "info", onOpenChange }: ToastProps) {
  const tone =
    type === "success"
      ? "border-[var(--color-success)]/30 text-[var(--color-success)]"
      : type === "error"
        ? "border-[var(--color-priority-high)]/30 text-[var(--color-priority-high)]"
        : "border-[var(--color-primary)]/30 text-[var(--color-primary)]";

  return (
    <RadixToast.Root
      defaultOpen
      onOpenChange={onOpenChange}
      className={`w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] shadow-[var(--shadow-md)] px-4 py-3 text-sm font-medium ${tone}`}
    >
      <RadixToast.Title>{message}</RadixToast.Title>
    </RadixToast.Root>
  );
}
