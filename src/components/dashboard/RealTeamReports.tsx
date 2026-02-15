"use client";

import { Building2, ChevronDown, ChevronUp, CheckCheck } from "lucide-react";
import { useState } from "react";

import { DGEmployeeDrawer } from "@/components/dashboard/DGEmployeeDrawer";
import { useNotionEmployees } from "@/hooks/useNotionEmployees";
import { useReadLogs } from "@/hooks/useReadLogs";
import type { NotionEmployee } from "@/app/api/notion-reports/employees/route";

const deptColors: Record<string, string> = {
  "マーケティングDX事業部": "bg-blue-100 text-blue-700",
  "業務改善DX事業部": "bg-emerald-100 text-emerald-700",
  "管理部": "bg-purple-100 text-purple-700",
  "AX事業部": "bg-orange-100 text-orange-700",
};

export function RealTeamReports() {
  const [expanded, setExpanded] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<NotionEmployee | null>(null);
  const { employees, isLoading, error } = useNotionEmployees();
  const { getUnreadCount, markAsRead, markAllAsRead, isRead } = useReadLogs();

  const displayEmployees = expanded ? employees : employees.slice(0, 4);

  // 全社員の未読日報の合計
  const totalUnread = employees.reduce(
    (sum, e) => sum + getUnreadCount(e.id, e.logDates),
    0,
  );

  if (isLoading) {
    return (
      <section className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
            <Building2 size={16} className="text-[var(--color-primary)]" />
            社員の動き
          </h2>
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
              <div className="w-8 h-8 rounded-full animate-pulse bg-[var(--color-border-light)]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-20 animate-pulse rounded bg-[var(--color-border-light)]" />
                <div className="h-2.5 w-32 animate-pulse rounded bg-[var(--color-border-light)]" />
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
            <Building2 size={16} className="text-[var(--color-primary)]" />
            社員の動き
          </h2>
        </div>
        <div className="px-4 py-8 text-center bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-muted)]">接続できませんでした</p>
        </div>
      </section>
    );
  }

  return (
    <section className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
          <Building2 size={16} className="text-[var(--color-primary)]" />
          社員の動き
          {totalUnread > 0 && (
            <span className="text-[10px] font-bold text-white bg-[var(--color-priority-high)] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
              {totalUnread}
            </span>
          )}
        </h2>
        <span className="text-xs text-[var(--color-muted)] bg-[var(--color-surface)] px-2.5 py-1 rounded-full">
          {employees.length}名
        </span>
      </div>

      <div className="space-y-2">
        {employees.length === 0 && (
          <div className="px-4 py-8 text-center bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm text-[var(--color-muted)]">日報データがありません</p>
          </div>
        )}

        {displayEmployees.map((emp) => {
          const unread = getUnreadCount(emp.id, emp.logDates);
          const latestDate = emp.logDates[0];

          return (
            <div
              key={emp.id}
              className="flex items-center gap-3 px-3.5 py-2.5 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] cursor-pointer active:bg-[var(--color-surface-hover)] transition-colors hover:shadow-[var(--shadow-md)]"
              onClick={() => setSelectedEmployee(emp)}
            >
              <div className="relative shrink-0">
                {emp.avatarUrl ? (
                  <img src={emp.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--color-primary)]">
                    {emp.name.charAt(0)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[var(--color-foreground)]">{emp.name}</span>
                  {emp.department && (
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${deptColors[emp.department] ?? "bg-gray-100 text-gray-700"}`}>
                      {emp.department}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--color-muted)] truncate mt-0.5">
                  {latestDate ? `最新: ${latestDate.slice(5)}` : "日報なし"}
                </p>
              </div>

              {unread > 0 && (
                <span className="shrink-0 text-[10px] font-bold text-white bg-[var(--color-priority-high)] w-5 h-5 rounded-full flex items-center justify-center">
                  {unread}
                </span>
              )}
              {unread === 0 && emp.logDates.length > 0 && (
                <span className="shrink-0 text-[10px] text-[var(--color-muted)] flex items-center gap-0.5">
                  <CheckCheck size={12} />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {employees.length > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center gap-1 w-full mt-2 py-2 text-xs text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors"
        >
          {expanded ? (
            <>
              <span>折りたたむ</span>
              <ChevronUp size={14} />
            </>
          ) : (
            <>
              <span>全{employees.length}名を表示</span>
              <ChevronDown size={14} />
            </>
          )}
        </button>
      )}

      <DGEmployeeDrawer
        open={!!selectedEmployee}
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        onMarkRead={markAsRead}
        onMarkAllRead={markAllAsRead}
        isDateRead={isRead}
      />
    </section>
  );
}
