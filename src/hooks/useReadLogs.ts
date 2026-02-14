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
  }, []);

  /** 特定の社員・日付を既読にする */
  const markAsRead = useCallback((employeeId: string, date: string) => {
    setReadLogs((prev) => {
      const dates = prev[employeeId] ?? [];
      if (dates.includes(date)) return prev;
      const next = { ...prev, [employeeId]: [...dates, date] };
      save(next);
      return next;
    });
  }, []);

  /** 特定の社員の全日報を既読にする */
  const markAllAsRead = useCallback((employeeId: string, dates: string[]) => {
    setReadLogs((prev) => {
      const existing = new Set(prev[employeeId] ?? []);
      dates.forEach((d) => existing.add(d));
      const next = { ...prev, [employeeId]: [...existing] };
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
