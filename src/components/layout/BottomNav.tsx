"use client";

import Link from "next/link";
import { Home, CheckSquare, Plus, StickyNote, Target, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSWRConfig } from "swr";

import { useGamification } from "@/hooks/useGamification";
import { InputDialog } from "@/components/ui/InputDialog";
import { useToast } from "@/components/ui/ToastProvider";

const navItems = [
  { href: "/", icon: Home, label: "ホーム" },
  { href: "/tasks", icon: CheckSquare, label: "タスク" },
  { href: "#add", icon: Plus, label: "追加", isCenter: true },
  { href: "/notes", icon: StickyNote, label: "メモ" },
  { href: "/focus", icon: Target, label: "集中" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { gamification } = useGamification();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { toast } = useToast();
  const { mutate } = useSWRConfig();

  const handleQuickAdd = () => {
    setQuickAddOpen(true);
  };

  const submitQuickAdd = async (values: Record<string, string>) => {
    const title = values.title?.trim();
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
      setQuickAddOpen(false);
      mutate("/api/tasks?filter=today");
      mutate("/api/tasks?filter=all");
    } catch (error) {
      console.error(error);
      toast.error("追加できなかった。もう一度試してみてね。");
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--color-surface)] border-t border-[var(--color-border)] safe-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            if (item.isCenter) {
              return (
                <button
                  key={item.href}
                  onClick={handleQuickAdd}
                  className="relative -mt-6 flex items-center justify-center w-14 h-14 rounded-full bg-[var(--color-primary)] text-white shadow-[var(--shadow-lg)] active:scale-95 transition-transform"
                  aria-label="タスクまたはメモを追加"
                >
                  <Icon size={28} strokeWidth={2.5} />
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-[var(--radius-md)] transition-colors min-w-[56px] ${
                  isActive ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]"
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)] z-50">
        <div className="p-6 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div>
              <h1 className="font-bold text-lg text-[var(--color-foreground)]">SOU Task</h1>
              <p className="text-xs text-[var(--color-muted)]">Personal Task Manager</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.filter((item) => !item.isCenter).map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] transition-colors font-medium text-sm ${
                  isActive
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <button
            onClick={handleQuickAdd}
            className="flex items-center gap-3 w-full px-4 py-3 mt-4 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white font-medium text-sm hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            <Plus size={20} />
            <span>新しいタスク</span>
          </button>

          <Link
            href="/settings"
            className={`flex items-center gap-3 px-4 py-3 mt-2 rounded-[var(--radius-md)] transition-colors font-medium text-sm ${
              pathname.startsWith("/settings")
                ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <Settings size={20} />
            <span>設定</span>
          </Link>
        </nav>

        <div className="p-4 m-4 rounded-[var(--radius-lg)] bg-[var(--color-priority-mid-bg)] border border-[var(--color-streak)]/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🔥</span>
            <span className="font-bold text-[var(--color-streak)]">{gamification?.currentStreak ?? 0}日連続!</span>
          </div>
          <p className="text-xs text-[var(--color-muted)]">最高 {gamification?.longestStreak ?? 0}日 / 累計 {gamification?.totalCompleted ?? 0}件</p>
        </div>
      </aside>

      <InputDialog
        open={quickAddOpen}
        onCancel={() => setQuickAddOpen(false)}
        onSubmit={submitQuickAdd}
        title="タスクを追加"
        fields={[{ name: "title", label: "タスク名", placeholder: "タスク名を入力", required: true }]}
      />
    </>
  );
}
