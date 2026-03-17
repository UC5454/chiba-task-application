"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "sou-task:read-logs";

type ReadLogsMap = Record<string, string[]>; // { employeeId: ["2026-02-14", ...] }

const load = (): ReadLogsMap => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ReadLogsMap) : {};
  } catch {
    return {};
  }
};

const save = (data: ReadLogsMap) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded
  }
};

/** 日報の既読管理フック */
export function useReadLogs() {
  const [readLogs, setReadLogs] = useState<ReadLogsMap>({});

  useEffect(() => {
    setReadLogs(load());

    // Sync when other tabs update localStorage
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setReadLogs(load());
    };
    // Sync when user returns to tab (picks up writes from other hook instances)
    const onFocus = () => setReadLogs(load());

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  /** 特定の社員・日付を既読にする */
  const markAsRead = useCallback((employeeId: string, date: string) => {
    setReadLogs(() => {
      // Always re-read localStorage to avoid overwriting data from other hook instances
      const current = load();
      const dates = current[employeeId] ?? [];
      if (dates.includes(date)) return current;
      const next = { ...current, [employeeId]: [...dates, date] };
      save(next);
      return next;
    });
  }, []);

  /** 特定の社員の全日報を既読にする */
  const markAllAsRead = useCallback((employeeId: string, dates: string[]) => {
    setReadLogs(() => {
      const current = load();
      const existing = new Set(current[employeeId] ?? []);
      dates.forEach((d) => existing.add(d));
      const next = { ...current, [employeeId]: [...existing] };
      save(next);
      return next;
    });
  }, []);

  /** 特定日付が既読かどうか */
  const isRead = useCallback((employeeId: string, date: string): boolean => {
    return (readLogs[employeeId] ?? []).includes(date);
  }, [readLogs]);

  /** 未読の日報数を取得 */
  const getUnreadCount = useCallback((employeeId: string, availableDates: string[]): number => {
    const readDates = new Set(readLogs[employeeId] ?? []);
    return availableDates.filter((d) => !readDates.has(d)).length;
  }, [readLogs]);

  return { readLogs, markAsRead, markAllAsRead, isRead, getUnreadCount };
}
