"use client";

interface Props {
  activeTab: "today" | "reports";
  onTabChange: (tab: "today" | "reports") => void;
  reportsBadge: number;
}

export function DashboardSegmentControl({ activeTab, onTabChange, reportsBadge }: Props) {
  return (
    <div className="sticky top-0 z-40 -mx-4 px-4 pt-2 pb-3 bg-[var(--color-background)]/80 backdrop-blur-sm">
      <div className="flex gap-1 p-1 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)]">
        <button
          onClick={() => onTabChange("today")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-[var(--radius-md)] transition-all ${
            activeTab === "today"
              ? "bg-[var(--color-primary)] text-white shadow-[var(--shadow-sm)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          }`}
        >
          今日
        </button>
        <button
          onClick={() => onTabChange("reports")}
          className={`relative flex-1 py-2.5 text-sm font-medium rounded-[var(--radius-md)] transition-all ${
            activeTab === "reports"
              ? "bg-[var(--color-primary)] text-white shadow-[var(--shadow-sm)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          }`}
        >
          レポート
          {reportsBadge > 0 && activeTab !== "reports" && (
            <span className="absolute -top-1 -right-1 text-[10px] font-bold text-white bg-[var(--color-priority-high)] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
              {reportsBadge}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
