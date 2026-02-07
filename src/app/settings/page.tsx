"use client";

import { useState } from "react";
import { Brain, Bell, Timer, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const [maxTasks, setMaxTasks] = useState(5);
  const [focusDuration, setFocusDuration] = useState(25);
  const [overfocusAlert, setOverfocusAlert] = useState(120);
  const [breakDuration, setBreakDuration] = useState(5);
  const [gentleRemind, setGentleRemind] = useState(true);
  const [celebration, setCelebration] = useState(true);
  const [webPush, setWebPush] = useState(true);
  const [slackNotify, setSlackNotify] = useState(true);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");
  const [autoRelease, setAutoRelease] = useState(true);
  const [autoReleaseDays, setAutoReleaseDays] = useState(14);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link href="/" className="p-2 -ml-2 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-hover)] transition-colors md:hidden">
          <ArrowLeft size={20} className="text-[var(--color-muted)]" />
        </Link>
        <h1 className="text-xl font-bold text-[var(--color-foreground)]">設定</h1>
      </div>

      {/* ADHD設定 */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} className="text-[var(--color-primary)]" />
          <h2 className="text-sm font-bold text-[var(--color-foreground)]">ADHD サポート</h2>
        </div>
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] divide-y divide-[var(--color-border-light)]">
          {/* 表示タスク上限 */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">1日の表示タスク上限</p>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5">認知負荷を下げるために制限します</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMaxTasks(Math.max(1, maxTasks - 1))}
                className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-sm font-bold text-[var(--color-muted)]"
              >-</button>
              <span className="w-8 text-center text-sm font-bold text-[var(--color-primary)]">{maxTasks}</span>
              <button
                onClick={() => setMaxTasks(Math.min(10, maxTasks + 1))}
                className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-sm font-bold text-[var(--color-muted)]"
              >+</button>
            </div>
          </div>

          {/* やさしいリマインド */}
          <ToggleRow
            label="やさしいリマインド"
            description="プレッシャーのない優しい言葉で通知します"
            enabled={gentleRemind}
            onChange={setGentleRemind}
          />

          {/* お祝いアニメーション */}
          <ToggleRow
            label="完了時のお祝い"
            description="タスク完了時にconfettiアニメーションを表示"
            enabled={celebration}
            onChange={setCelebration}
          />

          {/* 自動手放し */}
          <ToggleRow
            label="自動手放し"
            description={`${autoReleaseDays}日放置されたタスクを自動で整理`}
            enabled={autoRelease}
            onChange={setAutoRelease}
          />
          {autoRelease && (
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm text-[var(--color-muted)]">手放しまでの日数</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoReleaseDays(Math.max(7, autoReleaseDays - 1))}
                  className="w-7 h-7 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-xs font-bold text-[var(--color-muted)]"
                >-</button>
                <span className="w-8 text-center text-sm font-medium text-[var(--color-foreground)]">{autoReleaseDays}日</span>
                <button
                  onClick={() => setAutoReleaseDays(Math.min(30, autoReleaseDays + 1))}
                  className="w-7 h-7 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-xs font-bold text-[var(--color-muted)]"
                >+</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 集中モード設定 */}
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
              <button
                onClick={() => setFocusDuration(Math.max(5, focusDuration - 5))}
                className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-sm font-bold text-[var(--color-muted)]"
              >-</button>
              <span className="w-12 text-center text-sm font-bold text-[var(--color-primary)]">{focusDuration}分</span>
              <button
                onClick={() => setFocusDuration(Math.min(60, focusDuration + 5))}
                className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-sm font-bold text-[var(--color-muted)]"
              >+</button>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">過集中アラート</p>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5">連続作業の上限時間</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOverfocusAlert(Math.max(60, overfocusAlert - 30))}
                className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-sm font-bold text-[var(--color-muted)]"
              >-</button>
              <span className="w-12 text-center text-sm font-bold text-[var(--color-primary)]">{overfocusAlert}分</span>
              <button
                onClick={() => setOverfocusAlert(Math.min(240, overfocusAlert + 30))}
                className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-sm font-bold text-[var(--color-muted)]"
              >+</button>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-sm font-medium text-[var(--color-foreground)]">休憩時間</p>
            <span className="text-sm font-bold text-[var(--color-primary)]">{breakDuration}分</span>
          </div>
        </div>
      </section>

      {/* 通知設定 */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-[var(--color-primary)]" />
          <h2 className="text-sm font-bold text-[var(--color-foreground)]">通知</h2>
        </div>
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] divide-y divide-[var(--color-border-light)]">
          <ToggleRow label="Web Push通知" description="ブラウザのプッシュ通知" enabled={webPush} onChange={setWebPush} />
          <ToggleRow label="Slack通知" description="Slackチャンネルにも通知" enabled={slackNotify} onChange={setSlackNotify} />
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">静寂時間</p>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5">この時間帯は通知しません</p>
            </div>
            <span className="text-sm font-medium text-[var(--color-primary)]">{quietStart} - {quietEnd}</span>
          </div>
        </div>
      </section>

      {/* バージョン情報 */}
      <div className="text-center py-4">
        <p className="text-xs text-[var(--color-muted)]">SOU Task v0.1.0</p>
        <p className="text-[10px] text-[var(--color-border)] mt-1">Built by 蒼月海斗 / web-team</p>
      </div>
    </div>
  );
}

// トグルスイッチ行
function ToggleRow({
  label, description, enabled, onChange
}: {
  label: string; description: string; enabled: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div>
        <p className="text-sm font-medium text-[var(--color-foreground)]">{label}</p>
        <p className="text-[11px] text-[var(--color-muted)] mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-[var(--shadow-sm)] transition-transform ${
          enabled ? "left-[22px]" : "left-0.5"
        }`} />
      </button>
    </div>
  );
}
