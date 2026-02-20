"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink, X, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { useNotionEmployeeDetail } from "@/hooks/useNotionEmployeeDetail";
import type { NotionEmployee } from "@/app/api/notion-reports/employees/route";

const deptColors: Record<string, string> = {
  "マーケティングDX事業部": "bg-blue-100 text-blue-700",
  "業務改善DX事業部": "bg-emerald-100 text-emerald-700",
  "管理部": "bg-purple-100 text-purple-700",
  "AX事業部": "bg-orange-100 text-orange-700",
};

interface Props {
  open: boolean;
  employee: NotionEmployee | null;
  onClose: () => void;
  onMarkRead?: (employeeId: string, date: string) => void;
  onMarkAllRead?: (employeeId: string, dates: string[]) => void;
  isDateRead?: (employeeId: string, date: string) => boolean;
}

export function DGEmployeeDrawer({ open, employee, onClose, onMarkRead, onMarkAllRead, isDateRead }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const currentDate = selectedDate ?? employee?.logDates[0] ?? "";
  const { detail, isLoading } = useNotionEmployeeDetail(
    open && employee ? employee.email : null,
    currentDate || undefined,
  );

  useEffect(() => {
    if (!open) setSelectedDate(undefined);
  }, [open]);

  const employeeId = employee?.id ?? "";
  const dateIsRead = employeeId && currentDate ? isDateRead?.(employeeId, currentDate) : false;

  // Auto-mark as read when daily log content is loaded
  useEffect(() => {
    if (detail?.dailyLog && employeeId && currentDate && !dateIsRead) {
      onMarkRead?.(employeeId, currentDate);
    }
  }, [detail?.dailyLog, employeeId, currentDate, dateIsRead, onMarkRead]);
  const availableDates = employee?.logDates ?? [];

  const unreadCount = employeeId
    ? availableDates.filter((d) => !isDateRead?.(employeeId, d)).length
    : 0;

  const handleMarkThisRead = () => {
    if (employeeId && currentDate) {
      onMarkRead?.(employeeId, currentDate);
    }
  };

  const handleMarkAllRead = () => {
    if (employeeId && availableDates.length > 0) {
      onMarkAllRead?.(employeeId, availableDates);
    }
  };

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
            <Dialog.Title className="text-base font-bold text-[var(--color-foreground)]">
              {employee?.name ?? "読み込み中..."}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-full p-1 hover:bg-[var(--color-surface-hover)]">
                <X size={18} className="text-[var(--color-muted)]" />
              </button>
            </Dialog.Close>
          </div>

          {employee && (
            <div className="space-y-4">
              {/* プロフィール */}
              <div className="flex items-center gap-3">
                {employee.avatarUrl ? (
                  <img src={employee.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-sm font-bold text-[var(--color-primary)]">
                    {employee.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{employee.name}</span>
                    {employee.department && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${deptColors[employee.department] ?? "bg-gray-100 text-gray-700"}`}>
                        {employee.department}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">{employee.email}</p>
                </div>
              </div>

              {/* ゴリラマインド */}
              {detail?.gorillaMind && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[var(--color-muted)]">ゴリラマインド:</span>
                  <span className="font-medium">🦍 {detail.gorillaMind}</span>
                </div>
              )}

              {/* 日付セレクター + 既読状態 */}
              {availableDates.length > 0 && (
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
                    {availableDates.slice(0, 14).map((d) => {
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

              {/* 日報本文 */}
              <div className="border-t border-[var(--color-border)] pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-[var(--color-muted)]">日報</h3>
                  <div className="flex items-center gap-2">
                    {detail?.dailyLog && !dateIsRead && (
                      <button
                        onClick={handleMarkThisRead}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 active:scale-95 transition-all"
                      >
                        <CheckCheck size={12} />
                        既読にする
                      </button>
                    )}
                    {detail?.dailyLog && dateIsRead && (
                      <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] text-[var(--color-muted)]">
                        <CheckCheck size={12} />
                        既読
                      </span>
                    )}
                    {detail?.notionUrl && (
                      <a
                        href={detail.notionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-[var(--color-primary)] hover:underline"
                      >
                        Notion <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
                {isLoading ? (
                  <div className="space-y-2 py-2">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--color-border-light)]" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--color-border-light)]" />
                    <div className="h-16 animate-pulse rounded bg-[var(--color-border-light)]" />
                  </div>
                ) : detail?.dailyLog ? (
                  <div className="max-h-60 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-[var(--color-foreground)] bg-[var(--color-background)] rounded-[var(--radius-md)] p-3">
                    {detail.dailyLog}
                  </div>
                ) : (
                  <p className="py-4 text-center text-xs text-[var(--color-muted)]">この日の日報はありません</p>
                )}
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
