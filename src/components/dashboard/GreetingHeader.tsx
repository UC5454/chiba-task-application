"use client";

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
  const { tasks, isLoading: tasksLoading, error: tasksError } = useTasks("today");
  const { events, isLoading: eventsLoading, error: eventsError } = useCalendar();

  const hasError = Boolean(tasksError || eventsError);
  const taskCount = tasksLoading && !hasError ? "..." : `${tasks.length}`;
  const eventCount = eventsLoading && !hasError ? "..." : `${events.length}`;

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-2xl font-bold text-[var(--color-foreground)]">{getGreeting()}</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {getDateString()} ・ タスク{taskCount}件 ・ 予定{eventCount}件
      </p>
    </div>
  );
}
