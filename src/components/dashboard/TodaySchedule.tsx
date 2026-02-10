"use client";

import { Calendar, MapPin } from "lucide-react";

import { useCalendar } from "@/hooks/useCalendar";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function TodaySchedule() {
  const { events, isLoading, error } = useCalendar();

  if (isLoading) {
    return (
      <section className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
            <Calendar size={16} className="text-[var(--color-primary)]" />
            今日のスケジュール
          </h2>
        </div>
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="animate-pulse flex items-start gap-3 px-4 py-3 border-b border-[var(--color-border-light)] last:border-b-0">
              <div className="w-12 shrink-0 pt-0.5 space-y-2">
                <div className="h-3 w-10 rounded bg-[var(--color-border-light)]" />
                <div className="h-2 w-8 rounded bg-[var(--color-border-light)]" />
              </div>
              <div className="flex flex-col items-center shrink-0 pt-1.5">
                <div className="w-2 h-2 rounded-full bg-[var(--color-border-light)]" />
                <div className="w-px h-6 bg-[var(--color-border-light)] mt-1" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-3 w-3/4 rounded bg-[var(--color-border-light)]" />
                <div className="h-2 w-1/2 rounded bg-[var(--color-border-light)]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
            <Calendar size={16} className="text-[var(--color-primary)]" />
            今日のスケジュール
          </h2>
        </div>
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] px-4 py-6 text-center text-sm text-[var(--color-muted)]">
          データを読み込めませんでした
        </div>
      </section>
    );
  }

  return (
    <section className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
          <Calendar size={16} className="text-[var(--color-primary)]" />
          今日のスケジュール
        </h2>
      </div>

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        {events.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-3xl mb-2">🗓️</p>
            <p className="text-sm text-[var(--color-muted)]">今日の予定はありません</p>
          </div>
        ) : (
          events.map((event, idx) => (
            <div key={event.id} className={`flex items-start gap-3 px-4 py-3 ${idx < events.length - 1 ? "border-b border-[var(--color-border-light)]" : ""}`}>
              <div className="w-12 shrink-0 pt-0.5">
                <p className="text-xs font-semibold text-[var(--color-primary)]">{event.isAllDay ? "終日" : formatTime(event.startTime)}</p>
                <p className="text-[10px] text-[var(--color-muted)]">{event.isAllDay ? "" : formatTime(event.endTime)}</p>
              </div>

              <div className="flex flex-col items-center shrink-0 pt-1.5">
                <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                {idx < events.length - 1 && <div className="w-px flex-1 bg-[var(--color-border)] mt-1" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-foreground)]">{event.title}</p>
                {event.location && (
                  <p className="flex items-center gap-1 mt-0.5 text-[10px] text-[var(--color-muted)]">
                    <MapPin size={10} />
                    {event.location}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
