"use client";

import { useState, useCallback, useEffect } from "react";

type SnoozedReminder = {
  taskId: string;
  until: number;
};

const STORAGE_KEY = "sou-task:snoozed";

export function useSnooze() {
  const [snoozed, setSnoozed] = useState<SnoozedReminder[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as SnoozedReminder[];
      const active = parsed.filter((s) => s.until > Date.now());
      setSnoozed(active);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const snooze = useCallback((taskId: string, minutes: number) => {
    const until = Date.now() + minutes * 60 * 1000;
    setSnoozed((prev) => {
      const next = [...prev.filter((s) => s.taskId !== taskId), { taskId, until }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isSnoozed = useCallback(
    (taskId: string) => snoozed.some((s) => s.taskId === taskId && s.until > Date.now()),
    [snoozed],
  );

  return { snooze, isSnoozed };
}
