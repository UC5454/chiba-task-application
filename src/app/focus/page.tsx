"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Play, Pause, RotateCcw, ChevronRight, Coffee, Monitor, Droplets, ArrowLeft, ChevronDown, PenLine, Check } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { useSettings } from "@/hooks/useSettings";
import { useTasks } from "@/hooks/useTasks";

type FocusState = "idle" | "idling" | "idling_done" | "idling_break" | "working" | "work_break";

const IDLING_SECONDS = 60;
const IDLING_BREAK_SECONDS = 60;
const WORK_BREAK_SECONDS = 300;

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export default function FocusPage() {
  const { tasks } = useTasks("today");
  const { settings } = useSettings();
  const { data: authSession } = useSession();
  void settings;

  const autoFocusTask = useMemo(() => tasks.find((task) => !task.completed) ?? tasks[0], [tasks]);

  // Task selection state
  const [selectedTask, setSelectedTask] = useState<{ title: string; googleTaskId?: string } | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [customTitle, setCustomTitle] = useState("");

  // The effective focus task: user-selected or auto-selected
  const focusTask = selectedTask ?? (autoFocusTask ? { title: autoFocusTask.title, googleTaskId: autoFocusTask.googleTaskId } : null);

  // Focus session tracking
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const [state, setState] = useState<FocusState>("idle");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [workingStartedAt, setWorkingStartedAt] = useState<number | null>(null);
  const [lastWorkDuration, setLastWorkDuration] = useState(0);
  const [showOverfocusAlert, setShowOverfocusAlert] = useState(false);

  // Keep ref in sync for sendBeacon cleanup
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // iOS Safari対策: ユーザータップ時にAudioContextを作成・resume して保持
  const audioCtxRef = useRef<AudioContext | null>(null);

  const ensureAudioContext = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AC = typeof AudioContext !== "undefined" ? AudioContext : (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) audioCtxRef.current = new AC();
      }
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    } catch {
      // Audio API not available on this device
    }
  }, []);

  const playTimerSound = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    try {
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    } catch {
      // Playback failed — no crash
    }

    // Androidバイブレーション（フォールバック）
    try {
      navigator?.vibrate?.([200, 100, 200]);
    } catch {
      // vibrate not supported
    }
  }, []);

  // --- Session tracking helpers ---
  const startSession = useCallback(async () => {
    if (!focusTask) return;
    try {
      const res = await fetch("/api/focus-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_title: focusTask.title,
          google_task_id: focusTask.googleTaskId,
        }),
      });
      if (res.ok) {
        const { id } = (await res.json()) as { id: string };
        setSessionId(id);
      }
    } catch {
      // Session tracking is best-effort
    }
  }, [focusTask]);

  const trackStateChange = useCallback(async (newState: string) => {
    if (!sessionIdRef.current) return;
    try {
      await fetch(`/api/focus-sessions/${sessionIdRef.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: newState }),
      });
    } catch {
      // best-effort
    }
  }, []);

  const endSession = useCallback(async () => {
    if (!sessionIdRef.current) return;
    try {
      await fetch(`/api/focus-sessions/${sessionIdRef.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ end: true }),
      });
    } catch {
      // best-effort
    }
    setSessionId(null);
  }, []);

  // sendBeacon on page unload
  useEffect(() => {
    const handleUnload = () => {
      if (!sessionIdRef.current || !authSession?.user?.email) return;
      const url = `/api/focus-sessions/${sessionIdRef.current}`;
      const body = JSON.stringify({ user_email: authSession.user.email });
      navigator.sendBeacon(url, body);
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [authSession?.user?.email]);

  const startIdling = useCallback(() => {
    setState("idling");
    setTimerSeconds(IDLING_SECONDS);
    setIsRunning(true);
  }, []);

  const startWorking = useCallback(() => {
    setState("working");
    setTimerSeconds(0);
    setIsRunning(true);
    setWorkingStartedAt(Date.now());
    trackStateChange("working");
  }, [trackStateChange]);

  const startIdlingBreak = useCallback(() => {
    setState("idling_break");
    setTimerSeconds(IDLING_BREAK_SECONDS);
    setIsRunning(true);
    trackStateChange("idling_break");
  }, [trackStateChange]);

  const startWorkBreak = useCallback((workedSeconds: number) => {
    setLastWorkDuration(workedSeconds);
    setState("work_break");
    setTimerSeconds(WORK_BREAK_SECONDS);
    setIsRunning(true);
    setWorkingStartedAt(null);
    trackStateChange("work_break");
  }, [trackStateChange]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (state === "idling") {
          if (prev <= 1) {
            playTimerSound();
            setState("idling_done");
            trackStateChange("idling_done");
            return 0;
          }
          return prev - 1;
        }

        if (state === "idling_break") {
          if (prev <= 1) {
            playTimerSound();
            setState("idling");
            trackStateChange("idling");
            return IDLING_SECONDS;
          }
          return prev - 1;
        }

        if (state === "work_break") {
          if (prev <= 1) {
            playTimerSound();
            setState("idling");
            trackStateChange("idling");
            return IDLING_SECONDS;
          }
          return prev - 1;
        }

        if (state === "idling_done" || state === "working") {
          return prev + 1;
        }

        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, state, playTimerSound, trackStateChange]);

  // AudioContext cleanup on unmount
  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // 過集中アラート（2時間）
  useEffect(() => {
    if (state !== "working" || !isRunning || !workingStartedAt) return;
    const check = setInterval(() => {
      if (Date.now() - workingStartedAt > 2 * 60 * 60 * 1000) {
        setShowOverfocusAlert(true);
      }
    }, 60000);
    return () => clearInterval(check);
  }, [state, isRunning, workingStartedAt]);

  const toggleTimer = useCallback(() => {
    ensureAudioContext();
    if (state === "idle") {
      startIdling();
      startSession();
      return;
    }

    setIsRunning((prev) => !prev);
  }, [state, ensureAudioContext, startIdling, startSession]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setState("idle");
    setTimerSeconds(0);
    setWorkingStartedAt(null);
    endSession();
  }, [endSession]);

  const skipPhase = useCallback(() => {
    ensureAudioContext();
    if (state === "idle") {
      startIdling();
      startSession();
      return;
    }

    if (state === "idling") {
      setState("idling_done");
      setTimerSeconds(0);
      setIsRunning(true);
      trackStateChange("idling_done");
      return;
    }

    if (state === "idling_done") {
      startWorking();
      return;
    }

    if (state === "working") {
      startWorkBreak(timerSeconds);
      return;
    }

    if (state === "work_break" || state === "idling_break") {
      startIdling();
      trackStateChange("idling");
    }
  }, [state, timerSeconds, ensureAudioContext, startIdling, startWorking, startWorkBreak, startSession, trackStateChange]);

  const chooseContinue = useCallback(() => {
    ensureAudioContext();
    startWorking();
  }, [ensureAudioContext, startWorking]);

  const chooseBreak = useCallback(() => {
    ensureAudioContext();
    startIdlingBreak();
  }, [ensureAudioContext, startIdlingBreak]);

  // Task selector handlers
  const selectTask = useCallback((task: { title: string; googleTaskId?: string }) => {
    setSelectedTask(task);
    setShowSelector(false);
    setCustomTitle("");
  }, []);

  const selectCustomTitle = useCallback(() => {
    if (!customTitle.trim()) return;
    setSelectedTask({ title: customTitle.trim() });
    setShowSelector(false);
    setCustomTitle("");
  }, [customTitle]);

  const progress = useMemo(() => {
    if (state === "idling") return ((IDLING_SECONDS - timerSeconds) / IDLING_SECONDS) * 100;
    if (state === "idling_break") return ((IDLING_BREAK_SECONDS - timerSeconds) / IDLING_BREAK_SECONDS) * 100;
    if (state === "work_break") return ((WORK_BREAK_SECONDS - timerSeconds) / WORK_BREAK_SECONDS) * 100;
    if (state === "idling_done" || state === "working") return 100;
    return 0;
  }, [state, timerSeconds]);

  const ringColor = state === "idling_break" || state === "work_break" ? "#3B82F6" : state === "idle" ? "var(--color-border)" : "#F97316";
  const ringBgColor = state === "idling_break" || state === "work_break" ? "#BFDBFE" : state === "idle" ? "var(--color-border-light)" : "#FED7AA";

  const stateLabel = useMemo(() => {
    if (state === "idle") return "待機中...";
    if (state === "idling") return "アイドリング中...";
    if (state === "idling_done") return "選択中";
    if (state === "idling_break") return "アイドリング休憩";
    if (state === "working") return "作業中";
    return "休憩中";
  }, [state]);

  const message = useMemo(() => {
    if (state === "idle") {
      return "まずは1分間だけのアイドリング作業を始めましょう！\n1分だけ作業した後は休憩もできるのでまずは1分！";
    }

    if (state === "idling") {
      return "アイドリング作業を1分だけ頑張りましょう...\n終了後にこのまま作業を続けるか休憩するかを選べます。\n（中央のスキップボタンで今すぐ選択可能）";
    }

    if (state === "idling_done") {
      return "アイドリング作業が終了しました。\nこのまま作業を継続するか一度休憩するかを選んでください。";
    }

    if (state === "idling_break") {
      return "1分の休憩を取りましょう。\n休憩終了後に再度1分間のアイドリング作業を行います。";
    }

    if (state === "working") {
      return "ナイス継続です！この調子で気の向くまで存分に作業を実施しましょう。\n中央のスキップボタンを押すと休憩に入ることができます。";
    }

    return `お疲れ様でした！先ほどの作業時間は${formatTime(lastWorkDuration)}でした！\n5分間の休憩です。（中央のボタンでスキップ可能）\nSNSを見ると次動くのが大変なのでストレッチやコーヒー、軽い掃除などがお勧めですよ！`;
  }, [state, lastWorkDuration]);

  const incompleteTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);

  return (
    <div className="max-w-lg mx-auto px-4 py-8 min-h-dvh flex flex-col">
      <div className="flex items-center gap-3 mb-10">
        <Link href="/" className="p-2 -ml-2 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-hover)] transition-colors">
          <ArrowLeft size={20} className="text-[var(--color-muted)]" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-foreground)]">集中モード</h1>
      </div>

      {showOverfocusAlert && (
        <div className="mb-6 p-4 bg-[var(--color-priority-mid-bg)] rounded-[var(--radius-xl)] animate-fade-in-up" style={{ boxShadow: "var(--shadow-card)" }}>
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

      {/* Task selector area */}
      <div className="text-center mb-8 animate-fade-in-up">
        <p className="text-xs text-[var(--color-muted)] mb-1">今集中していること</p>
        {state === "idle" ? (
          <>
            <button
              onClick={() => setShowSelector((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xl font-bold text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors"
            >
              <span>{focusTask?.title ?? "タスクを選んで集中しよう"}</span>
              <ChevronDown size={18} className={`text-[var(--color-muted)] transition-transform ${showSelector ? "rotate-180" : ""}`} />
            </button>

            {showSelector && (
              <div className="mt-3 mx-auto max-w-sm bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border-light)] overflow-hidden animate-fade-in-up" style={{ boxShadow: "var(--shadow-card)" }}>
                {/* Custom title input */}
                <div className="p-3 border-b border-[var(--color-border-light)]">
                  <div className="flex items-center gap-2">
                    <PenLine size={14} className="text-[var(--color-muted)] shrink-0" />
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") selectCustomTitle(); }}
                      placeholder="自由入力..."
                      className="flex-1 text-sm bg-transparent outline-none text-[var(--color-foreground)] placeholder:text-[var(--color-muted)]"
                    />
                    {customTitle.trim() && (
                      <button onClick={selectCustomTitle} className="p-1 rounded-full bg-[var(--color-primary)] text-white">
                        <Check size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Task list */}
                <div className="max-h-48 overflow-y-auto">
                  {incompleteTasks.length === 0 ? (
                    <p className="p-3 text-xs text-[var(--color-muted)] text-center">今日のタスクはありません</p>
                  ) : (
                    incompleteTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => selectTask({ title: task.title, googleTaskId: task.googleTaskId })}
                        className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)] transition-colors border-b border-[var(--color-border-light)] last:border-b-0"
                      >
                        {task.title}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <h2 className="text-xl font-bold text-[var(--color-foreground)]">{focusTask?.title ?? "今日のタスクを選んで集中しよう"}</h2>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <div className="relative w-64 h-64 mb-10">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 224 224">
            <circle cx="112" cy="112" r="100" fill="none" stroke={ringBgColor} strokeWidth="6" />
            <circle
              cx="112"
              cy="112"
              r="100"
              fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 100}`}
              strokeDashoffset={`${2 * Math.PI * 100 * (1 - Math.max(0, Math.min(100, progress)) / 100)}`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-extrabold tracking-tight text-[var(--color-foreground)]">{formatTime(timerSeconds)}</span>
            <span className="text-xs font-medium mt-1" style={{ color: state === "idle" ? "var(--color-muted)" : ringColor }}>
              {stateLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={toggleTimer}
            className="w-[72px] h-[72px] rounded-full bg-orange-500 flex items-center justify-center active:scale-95 transition-transform"
            style={{ boxShadow: "0 4px 16px rgba(249,115,22,0.35)" }}
            aria-label={isRunning ? "一時停止" : "開始"}
          >
            {isRunning ? <Pause size={30} className="text-white" fill="white" /> : <Play size={30} className="text-white ml-1" fill="white" />}
          </button>
          <button
            onClick={skipPhase}
            className="w-12 h-12 rounded-full bg-[var(--color-surface)] flex items-center justify-center hover:bg-[var(--color-surface-hover)] transition-colors"
            style={{ boxShadow: "var(--shadow-card)" }}
            aria-label="スキップ"
          >
            <ChevronRight size={18} className="text-[var(--color-muted)]" />
          </button>
          <button
            onClick={resetTimer}
            className="w-12 h-12 rounded-full bg-[var(--color-surface)] flex items-center justify-center hover:bg-[var(--color-surface-hover)] transition-colors"
            style={{ boxShadow: "var(--shadow-card)" }}
            aria-label="リセット"
          >
            <RotateCcw size={18} className="text-[var(--color-muted)]" />
          </button>
        </div>
      </div>

      <div className="mt-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
        <div className="p-4 bg-[var(--color-surface)] rounded-[var(--radius-xl)]" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-sm text-[var(--color-foreground)] leading-relaxed whitespace-pre-line">{message}</p>
        </div>

        {state === "idling_done" && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={chooseContinue} className="bg-orange-500 text-white rounded-xl p-4 text-left active:scale-[0.98] transition-transform">
              <Monitor size={18} className="mb-2" />
              <p className="text-sm font-bold">続行</p>
              <p className="text-xs mt-1 opacity-90">このまま作業を続行します</p>
            </button>
            <button
              onClick={chooseBreak}
              className="bg-white border border-[var(--color-border)] rounded-xl p-4 text-left active:scale-[0.98] transition-transform"
            >
              <Coffee size={18} className="mb-2 text-[var(--color-muted)]" />
              <p className="text-sm font-bold text-[var(--color-foreground)]">休憩</p>
              <p className="text-xs mt-1 text-[var(--color-muted)]">1分の休憩を挟んで再度アイドリング作業を実施します</p>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
