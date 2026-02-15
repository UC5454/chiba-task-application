"use client";

type FilterType = "today" | "all" | "completed";

const filters: { key: FilterType; label: string }[] = [
  { key: "today", label: "今日" },
  { key: "all", label: "すべて" },
  { key: "completed", label: "完了済み" },
];

interface TaskFilterProps {
  current: FilterType;
  onChange: (filter: FilterType) => void;
}

export function TaskFilter({ current, onChange }: TaskFilterProps) {
  return (
    <div className="flex gap-1 p-1 bg-[var(--color-surface)] rounded-[var(--radius-lg)]" style={{ boxShadow: "var(--shadow-card)" }}>
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`flex-1 py-2 text-xs font-medium rounded-[var(--radius-md)] transition-all ${
            current === f.key
              ? "bg-[var(--color-foreground)] text-white shadow-[var(--shadow-md)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
