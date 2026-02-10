"use client";

import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { useState } from "react";

import { useTeamStatus } from "@/hooks/useTeamStatus";

const teamLabels: Record<string, string> = {
  executive: "直轄",
  secretary: "秘書",
  "note-team": "Note",
  "web-team": "Web",
  "prompt-team": "Prompt",
  "slides-team": "Slides",
};

const teamColors: Record<string, string> = {
  executive: "bg-purple-100 text-purple-700",
  secretary: "bg-pink-100 text-pink-700",
  "note-team": "bg-emerald-100 text-emerald-700",
  "web-team": "bg-blue-100 text-blue-700",
  "prompt-team": "bg-amber-100 text-amber-700",
  "slides-team": "bg-orange-100 text-orange-700",
};

const getInitial = (name: string): string => name.charAt(0);

export function TeamStatus() {
  const [expanded, setExpanded] = useState(false);
  const { team, isLoading, error } = useTeamStatus();

  const displayTeam = expanded ? team : team.slice(0, 4);
  const activeCount = team.filter((m) => m.currentTask && !m.currentTask.includes("待機")).length;

  if (isLoading) {
    return (
      <section className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
            <Users size={16} className="text-[var(--color-primary)]" />
            AI社員の動き
          </h2>
        </div>
        <div className="px-4 py-8 text-center bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-muted)]">読み込み中...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
            <Users size={16} className="text-[var(--color-primary)]" />
            AI社員の動き
          </h2>
        </div>
        <div className="px-4 py-8 text-center bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-muted)]">AI社員ステータスを取得できませんでした</p>
        </div>
      </section>
    );
  }

  return (
    <section className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
          <Users size={16} className="text-[var(--color-primary)]" />
          AI社員の動き
        </h2>
        <span className="text-xs text-[var(--color-muted)] bg-[var(--color-surface)] px-2.5 py-1 rounded-full">{activeCount}名稼働中</span>
      </div>

      <div className="space-y-2">
        {team.length === 0 && (
          <div className="px-4 py-8 text-center bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
            <p className="text-3xl mb-2">🤝</p>
            <p className="text-sm text-[var(--color-muted)]">AI社員ステータスがありません</p>
          </div>
        )}

        {displayTeam.map((member) => (
          <div key={member.id} className="flex items-center gap-3 px-3.5 py-2.5 bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-sm)]">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--color-primary)]">
                {getInitial(member.name)}
              </div>
              {member.currentTask && !member.currentTask.includes("待機") && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--color-success)] border-2 border-[var(--color-surface)]" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[var(--color-foreground)]">{member.name}</span>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${teamColors[member.team]}`}>{teamLabels[member.team]}</span>
              </div>
              <p className="text-[11px] text-[var(--color-muted)] truncate mt-0.5">{member.currentTask || "待機中"}</p>
            </div>

            {(member.inboxCount ?? 0) > 0 && <span className="shrink-0 text-[10px] font-bold text-white bg-[var(--color-priority-high)] w-5 h-5 rounded-full flex items-center justify-center">{member.inboxCount}</span>}
          </div>
        ))}
      </div>

      {team.length > 4 && (
        <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-center gap-1 w-full mt-2 py-2 text-xs text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors">
          {expanded ? <><span>折りたたむ</span><ChevronUp size={14} /></> : <><span>全{team.length}名を表示</span><ChevronDown size={14} /></>}
        </button>
      )}
    </section>
  );
}
