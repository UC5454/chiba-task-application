"use client";

import { LogIn } from "lucide-react";

export function LoginPrompt() {
  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] px-4 py-6 text-center">
      <LogIn size={24} className="text-[var(--color-primary)] mx-auto mb-2" />
      <p className="text-sm font-medium text-[var(--color-foreground)]">ログインが必要です</p>
      <a
        href="/api/auth/signin"
        className="mt-3 inline-block text-xs font-medium text-white bg-[var(--color-primary)] px-4 py-2 rounded-[var(--radius-md)] hover:bg-[var(--color-primary-dark)] transition-colors"
      >
        Googleでログイン
      </a>
    </div>
  );
}
