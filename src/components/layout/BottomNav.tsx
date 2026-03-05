"use client";

import Image from "next/image";
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
  { href: "/focus", icon: Target, label: "集中" },
  { href: "/settings", icon: Settings, label: "設定" },
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
      {/* Mobile Bottom Nav — glass morphism */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass safe-bottom" style={{ boxShadow: "var(--shadow-nav)" }}>
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            if (item.isCenter) {
              return (
                <button
                  key={item.href}
                  onClick={handleQuickAdd}
                  className="relative -mt-6 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-b from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] text-white active:scale-95 transition-transform"
                  style={{ boxShadow: "0 4px 16px rgba(37,99,235,0.3)" }}
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
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-[var(--radius-md)] transition-all min-w-[56px] ${
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

      {/* Desktop Sidebar — subtle shadow, no border */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-[var(--color-surface)] z-50" style={{ boxShadow: "var(--shadow-sidebar)" }}>
        <div className="p-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="SOU Task" width={40} height={40} className="rounded-[var(--radius-md)]" priority />
            <div>
              <h1 className="font-bold text-lg text-[var(--color-foreground)]">SOU Task</h1>
              <p className="text-xs text-[var(--color-muted)]">Personal Task Manager</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.filter((item) => !item.isCenter).map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius-md)] transition-all font-medium text-sm ${
                  isActive
                    ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--color-primary)]" />
                )}
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <button
            onClick={handleQuickAdd}
            className="flex items-center gap-3 w-full px-4 py-2.5 mt-6 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={20} />
            <span>新しいタスク</span>
          </button>
        </nav>

        <div className="p-3 m-3 rounded-[var(--radius-lg)] bg-gradient-to-br from-amber-50 to-orange-50" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🔥</span>
            <span className="font-bold text-[var(--color-streak)]">{gamification?.currentStreak ?? 0}日連続!</span>
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)]">最高 {gamification?.longestStreak ?? 0}日 / 累計 {gamification?.totalCompleted ?? 0}件</p>
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
