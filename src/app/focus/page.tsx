"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Play, Pause, RotateCcw, Check, Coffee, Droplets, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { useSettings } from "@/hooks/useSettings";
import { useTasks } from "@/hooks/useTasks";
import type { Subtask } from "@/types";

const parseSubtasksFromNotes = (notes?: string): Subtask[] => {
  if (!notes) return [];

  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- [ ]") || line.startsWith("- [x]") || line.startsWith("- [X]"))
    .map((line, index) => ({
      id: `note-subtask-${index}`,
      title: line.replace(/^- \[[ xX]\]\s*/, "").trim(),
      completed: /^- \[[xX]\]/.test(line),
    }))
    .filter((item) => item.title);
};

export default function FocusPage() {
  const { tasks } = useTasks("today");
  const { settings } = useSettings();
  const focusMinutes = settings?.focusDuration ?? 25;
  const breakMinutes = settings?.breakDuration ?? 5;

  const focusTask = useMemo(() => tasks.find((task) => !task.completed) ?? tasks[0], [tasks]);
  const subtasks = useMemo(() => parseSubtasksFromNotes(focusTask?.notes), [focusTask?.notes]);

  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [focusStartTime, setFocusStartTime] = useState<number | null>(null);
  const [showOverfocusAlert, setShowOverfocusAlert] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState(false);

  const totalSeconds = (isBreak ? breakMinutes : focusMinutes) * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  // settings読み込み完了時にタイマー初期値を反映
  useEffect(() => {
    if (settings && !initialized && !isRunning) {
      setTimeLeft(focusMinutes * 60);
      setInitialized(true);
    }
  }, [settings, initialized, isRunning, focusMinutes]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (!focusStartTime) return;
    const check = setInterval(() => {
      if (Date.now() - focusStartTime > 2 * 60 * 60 * 1000) {
        setShowOverfocusAlert(true);
      }
    }, 60000);
    return () => clearInterval(check);
  }, [focusStartTime]);

  const toggleTimer = useCallback(() => {
    if (!isRunning && !focusStartTime) {
      setFocusStartTime(Date.now());
    }
    setIsRunning(!isRunning);
  }, [isRunning, focusStartTime]);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft((isBreak ? breakMinutes : focusMinutes) * 60);
  };

  const switchMode = () => {
    setIsBreak(!isBreak);
    setIsRunning(false);
    setTimeLeft((!isBreak ? breakMinutes : focusMinutes) * 60);
  };

  const toggleSubtask = (id: string, current: boolean) => {
    setOverrides((prev) => ({ ...prev, [id]: !current }));
  };

  const displaySubtasks = subtasks.map((subtask) => ({
    ...subtask,
    completed: overrides[subtask.id] ?? subtask.completed,
  }));

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 min-h-dvh flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="p-2 -ml-2 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-hover)] transition-colors">
          <ArrowLeft size={20} className="text-[var(--color-muted)]" />
        </Link>
        <h1 className="text-lg font-bold text-[var(--color-foreground)]">集中モード</h1>
      </div>

      {showOverfocusAlert && (
        <div className="mb-6 p-4 bg-[var(--color-priority-mid-bg)] rounded-[var(--radius-lg)] border border-[var(--color-priority-mid)]/20 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-2">
            <Coffee size={18} className="text-[var(--color-priority-mid)]" />
            <span className="text-sm font-bold text-[var(--color-priority-mid)]">2時間経過！一度休もう</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
            <span className="flex items-center gap-1"><Droplets size={12} /> 水を飲もう</span>
            <span>首を回そう</span>
            <span>深呼吸しよう</span>
          </div>
          <button onClick={() => setShowOverfocusAlert(false)} className="mt-2 text-xs text-[var(--color-primary)] font-medium">OK、もう少しだけ</button>
        </div>
      )}

      <div className="text-center mb-8 animate-fade-in-up">
        <p className="text-xs text-[var(--color-muted)] mb-1">今集中していること</p>
        <h2 className="text-xl font-bold text-[var(--color-foreground)]">{focusTask?.title ?? "今日のタスクを選んで集中しよう"}</h2>
        {focusTask?.notes && <p className="text-xs text-[var(--color-muted)] mt-2 max-w-sm mx-auto leading-relaxed">{focusTask.notes}</p>}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <div className="relative w-56 h-56 mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 224 224">
            <circle cx="112" cy="112" r="100" fill="none" stroke="var(--color-border-light)" strokeWidth="8" />
            <circle cx="112" cy="112" r="100" fill="none" stroke={isBreak ? "var(--color-success)" : "var(--color-primary)"} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 100}`} strokeDashoffset={`${2 * Math.PI * 100 * (1 - progress / 100)}`} className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-extrabold tracking-tight text-[var(--color-foreground)]">{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>
            <span className={`text-xs font-medium mt-1 ${isBreak ? "text-[var(--color-success)]" : "text-[var(--color-primary)]"}`}>{isBreak ? "休憩中" : "集中中"}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={resetTimer} className="w-12 h-12 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-surface-hover)] transition-colors" aria-label="リセット"><RotateCcw size={18} className="text-[var(--color-muted)]" /></button>
          <button onClick={toggleTimer} className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[var(--shadow-lg)] active:scale-95 transition-transform ${isBreak ? "bg-[var(--color-success)]" : "bg-[var(--color-primary)]"}`} aria-label={isRunning ? "一時停止" : "開始"}>{isRunning ? <Pause size={28} className="text-white" fill="white" /> : <Play size={28} className="text-white ml-1" fill="white" />}</button>
          <button onClick={switchMode} className="w-12 h-12 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-surface-hover)] transition-colors" aria-label={isBreak ? "集中に戻る" : "休憩する"}><Coffee size={18} className={isBreak ? "text-[var(--color-success)]" : "text-[var(--color-muted)]"} /></button>
        </div>
      </div>

      {displaySubtasks.length > 0 && (
        <div className="mt-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <h3 className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider mb-3">チェックリスト ({displaySubtasks.filter((subtask) => subtask.completed).length}/{displaySubtasks.length})</h3>
          <div className="space-y-2">
            {displaySubtasks.map((subtask) => (
              <button key={subtask.id} onClick={() => toggleSubtask(subtask.id, subtask.completed)} className="flex items-center gap-3 w-full px-3.5 py-2.5 bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)] text-left transition-all hover:shadow-[var(--shadow-sm)]">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${subtask.completed ? "bg-[var(--color-success)] border-[var(--color-success)]" : "border-[var(--color-border)]"}`}>{subtask.completed && <Check size={12} className="text-white" />}</div>
                <span className={`text-sm ${subtask.completed ? "line-through text-[var(--color-muted)]" : "text-[var(--color-foreground)]"}`}>{subtask.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
