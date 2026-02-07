"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Target, Plus, StickyNote, Settings } from "lucide-react";

const navItems = [
  { href: "/", icon: Home, label: "ホーム" },
  { href: "/focus", icon: Target, label: "集中" },
  { href: "#add", icon: Plus, label: "追加", isCenter: true },
  { href: "/notes", icon: StickyNote, label: "メモ" },
  { href: "/settings", icon: Settings, label: "設定" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* モバイル ボトムナビ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--color-surface)] border-t border-[var(--color-border)] safe-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            if (item.isCenter) {
              return (
                <button
                  key={item.href}
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
                  isActive
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-muted)]"
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* PC サイドバー */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)] z-50">
        {/* ロゴ */}
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

        {/* ナビリンク */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.filter(item => !item.isCenter).map((item) => {
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

          {/* 追加ボタン */}
          <button className="flex items-center gap-3 w-full px-4 py-3 mt-4 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white font-medium text-sm hover:bg-[var(--color-primary-dark)] transition-colors">
            <Plus size={20} />
            <span>新しいタスク</span>
          </button>
        </nav>

        {/* ストリーク */}
        <div className="p-4 m-4 rounded-[var(--radius-lg)] bg-[var(--color-priority-mid-bg)] border border-[var(--color-streak)]/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🔥</span>
            <span className="font-bold text-[var(--color-streak)]">7日連続!</span>
          </div>
          <p className="text-xs text-[var(--color-muted)]">この調子でいこう</p>
        </div>
      </aside>
    </>
  );
}
