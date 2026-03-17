"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useSWRConfig } from "swr";

import { useToast } from "@/components/ui/ToastProvider";
import { useSettings } from "@/hooks/useSettings";
import { useSnooze } from "@/hooks/useSnooze";
import { useTasks } from "@/hooks/useTasks";
import { generateReminders } from "@/lib/reminders";
import type { Reminder, ReminderAction } from "@/types";

export function ReminderBanner() {
  const router = useRouter();
  const { toast } = useToast();
  const { mutate } = useSWRConfig();
  const { tasks, isLoading, error } = useTasks("all");
  const { settings } = useSettings();
  const { snooze, isSnoozed } = useSnooze();

  const reminders = useMemo(() => generateReminders(tasks, settings), [tasks, settings]);

  const visibleReminders = reminders.filter((reminder) => {
    if (reminder.taskId === "__summary__") {
      return true;
    }
    return !isSnoozed(reminder.taskId);
  });

  if (isLoading || error || visibleReminders.length === 0) {
    return null;
  }

  const handleAction = async (reminder: Reminder, action: ReminderAction["action"]) => {
    if (action === "open") {
      router.push("/tasks");
      return;
    }

    if (reminder.taskId === "__summary__") {
      return;
    }

    if (action === "snooze_15m") {
      snooze(reminder.taskId, 15);
      toast.success("15分後に再通知するね。");
      return;
    }

    if (action === "snooze_1h") {
      snooze(reminder.taskId, 60);
      toast.success("1時間後に再通知するね。");
      return;
    }

    if (action === "snooze_3h") {
      snooze(reminder.taskId, 180);
      toast.success("3時間後に再通知するね。");
      return;
    }

    if (action === "snooze_tomorrow") {
      snooze(reminder.taskId, 24 * 60);
      toast.success("明日また確認しよう。");
      return;
    }

    if (action === "reschedule_tomorrow") {
      try {
        const response = await fetch(`/api/tasks/${reminder.taskId}/reschedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newDueDate: "tomorrow" }),
        });

        if (!response.ok) {
          throw new Error("reschedule failed");
        }

        toast.success("明日に変更したよ。");
        mutate("/api/tasks?filter=today");
        mutate("/api/tasks?filter=all");
      } catch {
        toast.error("変更できなかった。もう一度試してみてね。");
      }
    }
  };

  return (
    <div className="space-y-2">
      {visibleReminders.slice(0, 3).map((reminder, index) => (
        <div
          key={`${reminder.taskId}-${reminder.type}`}
          className="card-elevated p-3 animate-fade-in-up"
          style={{ animationDelay: `${0.05 * (index + 1)}s` }}
        >
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-primary)]/10 shrink-0">
              <Bell size={16} className="text-[var(--color-primary)]" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--color-foreground)] leading-relaxed">{reminder.message}</p>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {reminder.actions.map((action) => (
                  <button
                    key={`${reminder.taskId}-${action.action}`}
                    onClick={() => void handleAction(reminder, action.action)}
                    className="rounded-full px-2 py-0.5 text-[10px] bg-[var(--color-background)] text-[var(--color-muted-foreground)] border border-[var(--color-border-light)] hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
