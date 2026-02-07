"use client";

import { Calendar, MapPin, Clock } from "lucide-react";
import type { CalendarEvent } from "@/types";

// モックデータ
const mockEvents: CalendarEvent[] = [
  {
    id: "e1", title: "AX事業部 定例MTG",
    startTime: "2026-02-07T10:00:00", endTime: "2026-02-07T11:00:00",
    isAllDay: false,
  },
  {
    id: "e2", title: "クライアント打ち合わせ",
    startTime: "2026-02-07T14:00:00", endTime: "2026-02-07T15:30:00",
    location: "Zoom",
    isAllDay: false,
  },
  {
    id: "e3", title: "東北AIコミュニティ運営会議",
    startTime: "2026-02-07T17:00:00", endTime: "2026-02-07T18:00:00",
    isAllDay: false,
  },
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function TodaySchedule() {
  return (
    <section className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
          <Calendar size={16} className="text-[var(--color-primary)]" />
          今日のスケジュール
        </h2>
      </div>

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        {mockEvents.map((event, idx) => (
          <div
            key={event.id}
            className={`flex items-start gap-3 px-4 py-3 ${
              idx < mockEvents.length - 1 ? "border-b border-[var(--color-border-light)]" : ""
            }`}
          >
            {/* 時刻 */}
            <div className="w-12 shrink-0 pt-0.5">
              <p className="text-xs font-semibold text-[var(--color-primary)]">
                {formatTime(event.startTime)}
              </p>
              <p className="text-[10px] text-[var(--color-muted)]">
                {formatTime(event.endTime)}
              </p>
            </div>

            {/* タイムラインドット */}
            <div className="flex flex-col items-center shrink-0 pt-1.5">
              <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
              {idx < mockEvents.length - 1 && (
                <div className="w-px flex-1 bg-[var(--color-border)] mt-1" />
              )}
            </div>

            {/* イベント情報 */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-foreground)]">
                {event.title}
              </p>
              {event.location && (
                <p className="flex items-center gap-1 mt-0.5 text-[10px] text-[var(--color-muted)]">
                  <MapPin size={10} />
                  {event.location}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
