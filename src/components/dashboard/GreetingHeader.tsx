"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { RefreshCw } from "lucide-react";

import { useCalendar } from "@/hooks/useCalendar";
import { useTasks } from "@/hooks/useTasks";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "おつかれ、千葉さん";
  if (hour < 12) return "おはよう、千葉さん";
  if (hour < 18) return "お疲れ様、千葉さん";
  return "こんばんは、千葉さん";
}

function getDateString(): string {
  const now = new Date();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${now.getMonth() + 1}月${now.getDate()}日（${weekdays[now.getDay()]}）`;
}

export function GreetingHeader() {
  const { tasks, isLoading: tasksLoading, error: tasksError, mutate: mutateTasks } = useTasks("today");
  const { events, isLoading: eventsLoading, error: eventsError, mutate: mutateEvents } = useCalendar();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([mutateTasks(), mutateEvents()]);
    setIsRefreshing(false);
  }, [mutateTasks, mutateEvents]);

  const hasError = Boolean(tasksError || eventsError);
  const taskCount = tasksLoading && !hasError ? "..." : `${tasks.length}`;
  const eventCount = eventsLoading && !hasError ? "..." : `${events.length}`;

  return (
    <div className="animate-fade-in-up flex items-center gap-3">
      <Image src="/logo.png" alt="SOU Task" width={40} height={40} className="rounded-[var(--radius-md)] md:hidden" priority />
      <div className="flex-1">
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-foreground)]">{getGreeting()}</h1>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {getDateString()} ・ タスク{taskCount}件 ・ 予定{eventCount}件
        </p>
      </div>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-1 text-xs font-medium text-[var(--color-muted)] bg-[var(--color-surface)] px-3 py-1.5 rounded-full hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50"
        aria-label="最新情報に更新"
      >
        <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
        更新
      </button>
    </div>
  );
}
