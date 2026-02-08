"use client";

import Link from "next/link";
import { ArrowLeft, Bell, Brain, Timer } from "lucide-react";
import { useMemo, useState } from "react";

import { useSettings } from "@/hooks/useSettings";
import type { ADHDSettings } from "@/types";



const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const defaultSettings: ADHDSettings = {
  maxDailyTasks: 5,
  focusDuration: 25,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  gentleRemind: true,
  celebrationEnabled: true,
  autoReleaseEnabled: true,
  autoReleaseDays: 14,
};

export default function SettingsPage() {
  const { settings, mutate } = useSettings();
  const current = settings ?? defaultSettings;

  const [overfocusAlert, setOverfocusAlert] = useState(120);
  const [breakDuration] = useState(5);
  const [webPush, setWebPush] = useState(true);
  const [slackNotify, setSlackNotify] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const saveSettings = async (patch: Partial<ADHDSettings>) => {
    const payload = { ...current, ...patch };
    setSaveState("saving");
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await mutate();
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 1200);
  };

  const subscribePush = async () => {
    if (!("serviceWorker" in navigator)) return false;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) return false;

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();

    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }));

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });

    return true;
  };

  const unsubscribePush = async () => {
    if (!("serviceWorker" in navigator)) return false;

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (!existing) return true;

    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: existing.endpoint }),
    });

    await existing.unsubscribe();
    return true;
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
      <div className="flex items-center gap-3">
        <Link href="/" className="p-2 -ml-2 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-hover)] transition-colors md:hidden">
          <ArrowLeft size={20} className="text-[var(--color-muted)]" />
        </Link>
        <h1 className="text-xl font-bold text-[var(--color-foreground)]">設定</h1>
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
              <button onClick={() => setOverfocusAlert(Math.max(60, overfocusAlert - 30))} className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-sm font-bold text-[var(--color-muted)]">-</button>
              <span className="w-12 text-center text-sm font-bold text-[var(--color-primary)]">{overfocusAlert}分</span>
              <button onClick={() => setOverfocusAlert(Math.min(240, overfocusAlert + 30))} className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-sm font-bold text-[var(--color-muted)]">+</button>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-sm font-medium text-[var(--color-foreground)]">休憩時間</p>
            <span className="text-sm font-bold text-[var(--color-primary)]">{breakDuration}分</span>
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
          <ToggleRow label="Slack通知" description="Slackチャンネルにも通知" enabled={slackNotify} onChange={setSlackNotify} />
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">静寂時間</p>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5">この時間帯は通知しません</p>
            </div>
            <span className="text-sm font-medium text-[var(--color-primary)]">{current.quietHoursStart} - {current.quietHoursEnd}</span>
          </div>
        </div>
      </section>

      <div className="text-center py-4">
        <p className="text-xs text-[var(--color-muted)]">SOU Task v0.1.0</p>
        <p className="text-[10px] text-[var(--color-border)] mt-1">Built by 蒼月海斗 / web-team</p>
        {saveState !== "idle" && <p className="text-[10px] text-[var(--color-muted)] mt-2">{saveState === "saving" ? "設定を保存中..." : "設定を保存しました"}</p>}
      </div>
    </div>
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
