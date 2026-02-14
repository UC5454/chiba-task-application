"use client";

import { Building2, ChevronDown, ChevronUp, ExternalLink, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { useNotionReports } from "@/hooks/useNotionReports";
import { useReadLogs } from "@/hooks/useReadLogs";

const deptColors: Record<string, string> = {
  "マーケティングDX事業部": "bg-blue-100 text-blue-700",
  "業務改善DX事業部": "bg-emerald-100 text-emerald-700",
  "管理部": "bg-purple-100 text-purple-700",
  "AX事業部": "bg-orange-100 text-orange-700",
};

const formatDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${m}/${day}(${weekday})`;
};

export function RealTeamReports() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { reports, isLoading, error } = useNotionReports(date);
  const { markAsRead, markAllAsRead, isRead, getUnreadCount } = useReadLogs();

  const shiftDate = (days: number) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
    setExpandedId(null);
  };

  const reportIds = reports.map((r) => `notion:${r.id}`);
  const reportDates = reports.map(() => date);
  const totalUnread = reports.filter((r) => !isRead(`notion:${r.id}`, date)).length;

  const handleMarkAllRead = () => {
    reports.forEach((r) => markAsRead(`notion:${r.id}`, date));
  };

  return (
    <section className="animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
          <Building2 size={16} className="text-[var(--color-primary)]" />
          社員日報
          {totalUnread > 0 && (
            <span className="text-[10px] font-bold text-white bg-[var(--color-priority-high)] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
              {totalUnread}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={() => shiftDate(-1)} className="p-1 rounded-full hover:bg-[var(--color-surface-hover)] transition-colors">
            <ChevronLeft size={14} className="text-[var(--color-muted)]" />
          </button>
          <span className="text-xs font-medium text-[var(--color-foreground)] min-w-[70px] text-center">{formatDate(date)}</span>
          <button
            onClick={() => shiftDate(1)}
            disabled={date >= today}
            className="p-1 rounded-full hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-30"
          >
            <ChevronRight size={14} className="text-[var(--color-muted)]" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="px-4 py-8 text-center bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-muted)]">読み込み中...</p>
        </div>
      ) : error ? (
        <div className="px-4 py-8 text-center bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-muted)]">取得できませんでした</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="px-4 py-8 text-center bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-muted)]">この日の日報はありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {totalUnread > 0 && (
            <div className="flex justify-end mb-1">
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 active:scale-95 transition-all"
              >
                <CheckCheck size={10} />
                すべて既読
              </button>
            </div>
          )}

          {reports.map((report) => {
            const expanded = expandedId === report.id;
            const read = isRead(`notion:${report.id}`, date);
            return (
              <div
                key={report.id}
                className="bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : report.id)}
                  className="flex items-center gap-3 w-full px-3.5 py-2.5 text-left active:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <div className="relative shrink-0">
                    {report.avatarUrl ? (
                      <img src={report.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--color-primary)]">
                        {report.submitter.charAt(0)}
                      </div>
                    )}
                    {!read && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--color-priority-high)] border-2 border-[var(--color-surface)]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-semibold text-[var(--color-foreground)] ${!read ? "" : "opacity-60"}`}>
                        {report.submitter}
                      </span>
                      {report.department && (
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${deptColors[report.department] ?? "bg-gray-100 text-gray-700"}`}>
                          {report.department}
                        </span>
                      )}
                    </div>
                    {report.gorillaMind && (
                      <p className="text-[10px] text-[var(--color-muted)] truncate mt-0.5">
                        {report.gorillaMind}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-1">
                    {read && <CheckCheck size={12} className="text-[var(--color-muted)]" />}
                    {expanded ? <ChevronUp size={14} className="text-[var(--color-muted)]" /> : <ChevronDown size={14} className="text-[var(--color-muted)]" />}
                  </div>
                </button>

                {expanded && (
                  <div className="px-3.5 pb-3 border-t border-[var(--color-border)]">
                    <div className="flex items-center justify-between mt-2 mb-2">
                      {!read ? (
                        <button
                          onClick={() => markAsRead(`notion:${report.id}`, date)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 active:scale-95 transition-all"
                        >
                          <CheckCheck size={12} />
                          既読にする
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-[var(--color-muted)]">
                          <CheckCheck size={12} />
                          既読
                        </span>
                      )}
                      <a
                        href={report.notionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-[var(--color-primary)] hover:underline"
                      >
                        Notion <ExternalLink size={10} />
                      </a>
                    </div>
                    <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-[var(--color-foreground)]">
                      {report.content || "内容なし"}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
