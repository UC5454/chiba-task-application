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
      className={`w-full rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] px-5 py-3.5 text-sm font-medium animate-slide-in ${tone}`}
    >
      <RadixToast.Title>{message}</RadixToast.Title>
    </RadixToast.Root>
  );
}
