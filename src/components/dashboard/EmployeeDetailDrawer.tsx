"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Inbox, X, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { useEmployeeDetail } from "@/hooks/useEmployeeDetail";

const teamLabels: Record<string, string> = {
  executive: "直轄",
  coach: "コーチ",
  hr: "人事",
  secretary: "秘書",
  "note-team": "Note",
  "web-team": "Web",
  "prompt-team": "Prompt",
  "slides-team": "Slides",
  "video-team": "Video",
};

const teamColors: Record<string, string> = {
  executive: "bg-purple-100 text-purple-700",
  coach: "bg-teal-100 text-teal-700",
  hr: "bg-indigo-100 text-indigo-700",
  secretary: "bg-pink-100 text-pink-700",
  "note-team": "bg-emerald-100 text-emerald-700",
  "web-team": "bg-blue-100 text-blue-700",
  "prompt-team": "bg-amber-100 text-amber-700",
  "slides-team": "bg-orange-100 text-orange-700",
  "video-team": "bg-red-100 text-red-700",
};

interface Props {
  open: boolean;
  employeeId: string | null;
  onClose: () => void;
  onMarkRead?: (employeeId: string, date: string) => void;
  onMarkAllRead?: (employeeId: string, dates: string[]) => void;
  isDateRead?: (employeeId: string, date: string) => boolean;
}

export function EmployeeDetailDrawer({ open, employeeId, onClose, onMarkRead, onMarkAllRead, isDateRead }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const { detail, isLoading } = useEmployeeDetail(employeeId, selectedDate);

  useEffect(() => {
    if (!open) setSelectedDate(undefined);
  }, [open]);

  const currentDate = selectedDate ?? detail?.availableDates[0] ?? "";
  const dateIsRead = employeeId && currentDate ? isDateRead?.(employeeId, currentDate) : false;

  const handleMarkThisRead = () => {
    if (employeeId && currentDate) {
      onMarkRead?.(employeeId, currentDate);
    }
  };

  const handleMarkAllRead = () => {
    if (employeeId && detail?.availableDates) {
      onMarkAllRead?.(employeeId, detail.availableDates);
    }
  };

  const unreadCount = employeeId && detail?.availableDates
    ? detail.availableDates.filter((d) => !isDateRead?.(employeeId, d)).length
    : 0;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-black/50" />
        <Dialog.Content className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-lg focus:outline-none md:bottom-auto md:left-1/2 md:top-1/2 md:w-[90vw] md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-base font-bold text-[var(--color-foreground)]">{detail?.employee.name ?? "読み込み中..."}</Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-full p-1 hover:bg-[var(--color-surface-hover)]">
                <X size={18} className="text-[var(--color-muted)]" />
              </button>
            </Dialog.Close>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-surface-hover)]" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--color-surface-hover)]" />
              <div className="h-20 animate-pulse rounded bg-[var(--color-surface-hover)]" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-sm font-bold text-[var(--color-primary)]">
                  {detail.employee.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{detail.employee.name}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${teamColors[detail.employee.team] ?? "bg-gray-100 text-gray-700"}`}>
                      {teamLabels[detail.employee.team] ?? detail.employee.team}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">{detail.employee.role}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-[var(--color-muted)]">現在: </span>
                  <span className="font-medium">{detail.currentTask}</span>
                </div>
                {detail.inboxCount > 0 && (
                  <span className="flex items-center gap-1 text-[var(--color-priority-high)]">
                    <Inbox size={12} />
                    {detail.inboxCount}件
                  </span>
                )}
              </div>

              {/* 日付セレクター + 既読状態 */}
              {detail.availableDates.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-[var(--color-muted)]">
                      {unreadCount > 0 ? `未読 ${unreadCount}件` : "すべて既読"}
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 active:scale-95 transition-all"
                      >
                        <CheckCheck size={10} />
                        すべて既読
                      </button>
                    )}
                  </div>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-2">
                    {detail.availableDates.slice(0, 14).map((d) => {
                      const active = currentDate === d;
                      const read = employeeId ? isDateRead?.(employeeId, d) : false;
                      return (
                        <button
                          key={d}
                          onClick={() => setSelectedDate(d)}
                          className={`relative shrink-0 rounded-full px-3 py-1.5 text-xs transition-colors ${
                            active
                              ? "bg-[var(--color-primary)] text-white"
                              : read
                                ? "bg-[var(--color-surface-hover)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                                : "bg-[var(--color-surface-hover)] text-[var(--color-foreground)] font-semibold hover:text-[var(--color-foreground)]"
                          }`}
                        >
                          {d.slice(5)}
                          {!read && !active && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--color-priority-high)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 日報 + 既読ボタン */}
              <div className="border-t border-[var(--color-border)] pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-[var(--color-muted)]">日報</h3>
                  {detail.dailyLog && !dateIsRead && (
                    <button
                      onClick={handleMarkThisRead}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 active:scale-95 transition-all"
                    >
                      <CheckCheck size={12} />
                      既読にする
                    </button>
                  )}
                  {detail.dailyLog && dateIsRead && (
                    <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] text-[var(--color-muted)]">
                      <CheckCheck size={12} />
                      既読
                    </span>
                  )}
                </div>
                {detail.dailyLog ? (
                  <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-[var(--color-foreground)]">{detail.dailyLog}</pre>
                ) : (
                  <p className="py-4 text-center text-xs text-[var(--color-muted)]">この日の日報はありません</p>
                )}
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
