"use client";

import * as RadixToast from "@radix-ui/react-toast";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { Toast } from "@/components/ui/Toast";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, type: ToastType) => {
    const id = createId();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const api = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push(message, "success"),
      error: (message) => push(message, "error"),
      info: (message) => push(message, "info"),
    }),
    [push],
  );

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={api}>
      <RadixToast.Provider duration={3000}>
        {children}
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onOpenChange={(open) => (!open ? remove(toast.id) : undefined)} />
        ))}
        <RadixToast.Viewport className="fixed z-[60] bottom-4 left-1/2 -translate-x-1/2 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 md:left-auto md:right-4 md:translate-x-0 md:items-end" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return { toast: ctx };
}
