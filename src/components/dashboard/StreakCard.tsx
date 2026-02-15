"use client";

import { Flame, Star, Trophy } from "lucide-react";

import { useGamification } from "@/hooks/useGamification";

export function StreakCard() {
  const { gamification, isLoading } = useGamification();

  const streak = gamification?.currentStreak ?? 0;
  const totalCompleted = gamification?.totalCompleted ?? 0;

  if (isLoading) {
    return (
      <section className="animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
        <div className="animate-pulse bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-card)] shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 w-20 rounded bg-[var(--color-border-light)]" />
            <div className="h-6 w-20 rounded-full bg-[var(--color-border-light)]" />
          </div>
          <div className="flex items-end gap-6">
            <div>
              <div className="h-10 w-12 rounded bg-[var(--color-border-light)]" />
              <div className="h-3 w-10 rounded bg-[var(--color-border-light)] mt-2" />
            </div>
            <div className="flex-1 flex gap-4">
              <div className="h-6 w-16 rounded bg-[var(--color-border-light)]" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--color-border-light)]">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-6 h-6 rounded-full bg-[var(--color-border-light)]" />
                <div className="h-2 w-4 rounded bg-[var(--color-border-light)]" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
      <div className="bg-gradient-to-br from-[#4F46E5] via-[var(--color-primary)] to-[#0EA5E9] rounded-[var(--radius-2xl)] p-6 text-white shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame size={20} className="text-orange-300" />
            <span className="text-sm font-medium opacity-90">継続記録</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 bg-white/15 rounded-full">
            <Trophy size={12} />
            <span className="text-xs font-medium">最高 {gamification?.longestStreak ?? 0}日</span>
          </div>
        </div>

        <div className="flex items-end gap-6">
          <div>
            <p className="text-4xl font-extrabold tracking-tight">{streak}</p>
            <p className="text-sm opacity-75 mt-0.5">日連続</p>
          </div>

          <div className="flex-1 flex gap-4">
            <div className="text-center">
              <p className="text-lg font-bold">{totalCompleted}</p>
              <p className="text-[10px] opacity-60">累計完了</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/15">
          {["月", "火", "水", "木", "金", "土", "日"].map((day, i) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${i < Math.min(streak, 7) ? "bg-white/20" : "bg-white/5"}`}>
                {i < Math.min(streak, 7) && <Star size={12} className="text-yellow-300" fill="currentColor" />}
              </div>
              <span className="text-[9px] opacity-50">{day}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
