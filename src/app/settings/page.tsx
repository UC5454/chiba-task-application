"use client";

import Link from "next/link";
import { ArrowLeft, Bell, Brain, Timer, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";

import { useSettings } from "@/hooks/useSettings";
import type { ADHDSettings } from "@/types";
import { useToast } from "@/components/ui/ToastProvider";



const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const defaultSettings: ADHDSettings = {
  maxDailyTasks: 5,
  focusDuration: 25,
  overfocusAlert: 120,
  breakDuration: 5,
  slackNotifyEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  gentleRemind: true,
  celebrationEnabled: true,
  autoReleaseEnabled: true,
  autoReleaseDays: 14,
};

export default function SettingsPage() {
  const { settings, mutate } = useSettings();
  const { toast } = useToast();

  // ローカルステートで即時UI反映。SWRデータが届いたら同期
  const [local, setLocal] = useState<ADHDSettings>(defaultSettings);
  const localRef = useRef(local);
  localRef.current = local;

  useEffect(() => {
    if (settings) setLocal(settings);
  }, [settings]);

  const current = local;

  const [webPush, setWebPush] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSave = useCallback(async () => {
    const payload = localRef.current;
    setSaveState("saving");
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const ct = response.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          throw new Error("サーバーに接続できませんでした");
        }
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "操作に失敗しました");
      }
      await mutate();
      setSaveState("saved");
      toast.success("設定を保存したよ。");
      setTimeout(() => setSaveState("idle"), 1200);
    } catch (error) {
      console.error(error);
      setSaveState("idle");
      toast.error("設定を保存できなかった。もう一度試してみてね。");
    }
  }, [mutate, toast]);

  const saveSettings = useCallback((patch: Partial<ADHDSettings>) => {
    setLocal((prev) => ({ ...prev, ...patch }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { flushSave(); }, 800);
  }, [flushSave]);

  // アンマウント時にペンディングの保存をフラッシュ
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        flushSave();
      }
    };
  }, [flushSave]);

  const subscribePush = async () => {
    if (!("serviceWorker" in navigator)) {
      toast.error("このブラウザではプッシュ通知が使えません。");
      return false;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      toast.error("プッシュ通知の設定が見つかりません。");
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();

      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!response.ok) {
        const ct = response.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          throw new Error("サーバーに接続できませんでした");
        }
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "操作に失敗しました");
      }

      toast.success("プッシュ通知を有効にしたよ。");
      return true;
    } catch (error) {
      console.error(error);
      toast.error("プッシュ通知を有効にできなかった。");
      return false;
    }
  };

  const unsubscribePush = async () => {
    if (!("serviceWorker" in navigator)) {
      toast.error("このブラウザではプッシュ通知が使えません。");
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (!existing) return true;

      const response = await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: existing.endpoint }),
      });
      if (!response.ok) {
        const ct = response.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          throw new Error("サーバーに接続できませんでした");
        }
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "操作に失敗しました");
      }

      await existing.unsubscribe();
      toast.success("プッシュ通知をオフにしたよ。");
      return true;
    } catch (error) {
      console.error(error);
      toast.error("プッシュ通知をオフにできなかった。");
      return false;
    }
  };

  const toggleWebPush = async (enabled: boolean) => {
    setWebPush(enabled);
    if (enabled) {
      await subscribePush();
    } else {
      await unsubscribePush();
    }
  };

  const autoReleaseDescription = useMemo(
    () => `${current.autoReleaseDays}日放置されたタスクを自動で整理`,
    [current.autoReleaseDays],
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-hover)] transition-colors md:hidden">
            <ArrowLeft size={20} className="text-[var(--color-muted)]" />
          </Link>
          <h1 className="text-xl font-bold text-[var(--color-foreground)]">設定</h1>
        </div>
        <button
          onClick={() => {
            const el = document.getElementById("danger-zone");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-[var(--radius-md)] transition-colors"
        >
          <Trash2 size={14} />
          <span>データ消去</span>
        </button>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} className="text-[var(--color-primary)]" />
          <h2 className="text-sm font-bold text-[var(--color-foreground)]">ADHD サポート</h2>
        </div>
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] divide-y divide-[var(--color-border-light)]">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">1日の表示タスク上限</p>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5">認知負荷を下げるために制限します</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => saveSettings({ maxDailyTasks: Math.max(1, current.maxDailyTasks - 1) })} className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-sm font-bold text-[var(--color-muted)]">-</button>
              <span className="w-8 text-center text-sm font-bold text-[var(--color-primary)]">{current.maxDailyTasks}</span>
              <button onClick={() => saveSettings({ maxDailyTasks: Math.min(10, current.maxDailyTasks + 1) })} className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-sm font-bold text-[var(--color-muted)]">+</button>
            </div>
          </div>

          <ToggleRow label="やさしいリマインド" description="プレッシャーのない優しい言葉で通知します" enabled={current.gentleRemind} onChange={(value) => saveSettings({ gentleRemind: value })} />
          <ToggleRow label="完了時のお祝い" description="タスク完了時にconfettiアニメーションを表示" enabled={current.celebrationEnabled} onChange={(value) => saveSettings({ celebrationEnabled: value })} />
          <ToggleRow label="自動手放し" description={autoReleaseDescription} enabled={current.autoReleaseEnabled} onChange={(value) => saveSettings({ autoReleaseEnabled: value })} />
          {current.autoReleaseEnabled && (
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm text-[var(--color-muted)]">手放しまでの日数</p>
              <div className="flex items-center gap-2">
                <button onClick={() => saveSettings({ autoReleaseDays: Math.max(7, current.autoReleaseDays - 1) })} className="w-7 h-7 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-xs font-bold text-[var(--color-muted)]">-</button>
                <span className="w-8 text-center text-sm font-medium text-[var(--color-foreground)]">{current.autoReleaseDays}日</span>
                <button onClick={() => saveSettings({ autoReleaseDays: Math.min(30, current.autoReleaseDays + 1) })} className="w-7 h-7 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-xs font-bold text-[var(--color-muted)]">+</button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Timer size={16} className="text-[var(--color-primary)]" />
          <h2 className="text-sm font-bold text-[var(--color-foreground)]">集中モード</h2>
        </div>
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] divide-y divide-[var(--color-border-light)]">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">ポモドーロ時間</p>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5">集中する時間の長さ</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => saveSettings({ focusDuration: Math.max(5, current.focusDuration - 5) })} className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-sm font-bold text-[var(--color-muted)]">-</button>
              <span className="w-12 text-center text-sm font-bold text-[var(--color-primary)]">{current.focusDuration}分</span>
              <button onClick={() => saveSettings({ focusDuration: Math.min(60, current.focusDuration + 5) })} className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-sm font-bold text-[var(--color-muted)]">+</button>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">過集中アラート</p>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5">連続作業の上限時間</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => saveSettings({ overfocusAlert: Math.max(60, current.overfocusAlert - 30) })} className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-sm font-bold text-[var(--color-muted)]">-</button>
              <span className="w-12 text-center text-sm font-bold text-[var(--color-primary)]">{current.overfocusAlert}分</span>
              <button onClick={() => saveSettings({ overfocusAlert: Math.min(240, current.overfocusAlert + 30) })} className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-sm font-bold text-[var(--color-muted)]">+</button>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-sm font-medium text-[var(--color-foreground)]">休憩時間</p>
            <div className="flex items-center gap-2">
              <button onClick={() => saveSettings({ breakDuration: Math.max(3, current.breakDuration - 1) })} className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-sm font-bold text-[var(--color-muted)]">-</button>
              <span className="w-12 text-center text-sm font-bold text-[var(--color-primary)]">{current.breakDuration}分</span>
              <button onClick={() => saveSettings({ breakDuration: Math.min(20, current.breakDuration + 1) })} className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-sm font-bold text-[var(--color-muted)]">+</button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-[var(--color-primary)]" />
          <h2 className="text-sm font-bold text-[var(--color-foreground)]">通知</h2>
        </div>
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] divide-y divide-[var(--color-border-light)]">
          <ToggleRow label="Web Push通知" description="ブラウザのプッシュ通知" enabled={webPush} onChange={toggleWebPush} />
          <ToggleRow label="Slack通知" description="Slackチャンネルにも通知" enabled={current.slackNotifyEnabled} onChange={(value) => saveSettings({ slackNotifyEnabled: value })} />
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">静寂時間</p>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5">この時間帯は通知しません</p>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)]">
              <input
                type="time"
                value={current.quietHoursStart}
                onChange={(e) => saveSettings({ quietHoursStart: e.target.value })}
                className="bg-[var(--color-surface-hover)] rounded-[var(--radius-md)] px-2 py-1 text-sm text-[var(--color-primary)] border-none outline-none"
              />
              <span className="text-[var(--color-muted)]">-</span>
              <input
                type="time"
                value={current.quietHoursEnd}
                onChange={(e) => saveSettings({ quietHoursEnd: e.target.value })}
                className="bg-[var(--color-surface-hover)] rounded-[var(--radius-md)] px-2 py-1 text-sm text-[var(--color-primary)] border-none outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      <DangerZone />

      <div className="text-center py-4">
        <p className="text-xs text-[var(--color-muted)]">SOU Task v0.1.0</p>
        <p className="text-[10px] text-[var(--color-border)] mt-1">Built by 蒼月海斗 / web-team</p>
        {saveState !== "idle" && <p className="text-[10px] text-[var(--color-muted)] mt-2">{saveState === "saving" ? "設定を保存中..." : "設定を保存しました"}</p>}
      </div>
    </div>
  );
}

function DangerZone() {
  const { toast } = useToast();
  const [step, setStep] = useState<"idle" | "confirm" | "deleting">("idle");

  const handleDelete = async () => {
    setStep("deleting");
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (!response.ok) {
        const ct = response.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          throw new Error("サーバーに接続できませんでした");
        }
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "操作に失敗しました");
      }
      toast.success("データを削除しました。ログアウトします。");
      setTimeout(() => signOut({ callbackUrl: "/" }), 1500);
    } catch (error) {
      console.error(error);
      toast.error("データの削除に失敗しました。");
      setStep("idle");
    }
  };

  return (
    <section id="danger-zone">
      <div className="flex items-center gap-2 mb-3">
        <Trash2 size={16} className="text-red-500" />
        <h2 className="text-sm font-bold text-red-500">データ消去</h2>
      </div>
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-red-200 dark:border-red-900/30">
        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">ユーザーデータの消去</p>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5">設定・連続記録・バッジ・メタデータを全て削除</p>
            </div>
            {step === "idle" && (
              <button
                onClick={() => setStep("confirm")}
                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-[var(--radius-md)] hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
              >
                削除
              </button>
            )}
          </div>
          {step === "confirm" && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setStep("idle")}
                className="flex-1 px-3 py-2 text-xs font-medium text-[var(--color-muted)] bg-[var(--color-surface-hover)] rounded-[var(--radius-md)] hover:bg-[var(--color-border-light)] transition-colors"
              >
                やめる
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-3 py-2 text-xs font-medium text-white bg-red-500 rounded-[var(--radius-md)] hover:bg-red-600 transition-colors"
              >
                本当に削除する
              </button>
            </div>
          )}
          {step === "deleting" && (
            <p className="text-xs text-red-500 mt-2">削除中...</p>
          )}
        </div>
      </div>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div>
        <p className="text-sm font-medium text-[var(--color-foreground)]">{label}</p>
        <p className="text-[11px] text-[var(--color-muted)] mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"}`}
        role="switch"
        aria-checked={enabled}
      >
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-[var(--shadow-sm)] transition-transform ${enabled ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
