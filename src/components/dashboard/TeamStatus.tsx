"use client";

import { Users, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { AIEmployee } from "@/types";

// モックデータ（13名のAI社員）
const mockTeam: AIEmployee[] = [
  { name: "神崎凛", id: "kanzaki-rin", team: "executive", role: "COO", avatarUrl: "", currentTask: "経営戦略の月次レビュー中", inboxCount: 0 },
  { name: "白波瀬みなみ", id: "shirahase-minami", team: "secretary", role: "エグゼクティブ秘書", avatarUrl: "", currentTask: "メールチェック完了、カレンダー調整中", inboxCount: 1 },
  { name: "水瀬ことは", id: "minase-kotoha", team: "note-team", role: "リサーチャー", avatarUrl: "", currentTask: "AI活用事例のリサーチ中", inboxCount: 0 },
  { name: "朝日つむぎ", id: "asahi-tsumugi", team: "note-team", role: "ライター", avatarUrl: "", currentTask: "Note記事「体験主義のすすめ」執筆中", inboxCount: 2 },
  { name: "橘そら", id: "tachibana-sora", team: "note-team", role: "デザイナー", avatarUrl: "", currentTask: "サムネイル制作中", inboxCount: 0 },
  { name: "藤堂蓮", id: "todo-ren", team: "note-team", role: "品質管理", avatarUrl: "", currentTask: "記事レビュー待ち", inboxCount: 1 },
  { name: "結城颯", id: "yuuki-sou", team: "web-team", role: "WEBディレクター", avatarUrl: "", currentTask: "SEO分析レポート作成中", inboxCount: 0 },
  { name: "桐谷凪", id: "kiritani-nagi", team: "web-team", role: "デザイナー", avatarUrl: "", currentTask: "待機中", inboxCount: 0 },
  { name: "真白悠", id: "mashiro-yuu", team: "web-team", role: "ライター", avatarUrl: "", currentTask: "待機中", inboxCount: 0 },
  { name: "蒼月海斗", id: "aotsuki-kaito", team: "web-team", role: "エンジニア", avatarUrl: "", currentTask: "SOU Task 開発中", inboxCount: 3 },
  { name: "白銀司", id: "shirogane-tsukasa", team: "prompt-team", role: "プロンプトエンジニア", avatarUrl: "", currentTask: "プロンプト最適化中", inboxCount: 0 },
  { name: "氷室翔", id: "himuro-sho", team: "slides-team", role: "営業資料制作", avatarUrl: "", currentTask: "提案資料の改善中", inboxCount: 1 },
  { name: "柚木陽菜", id: "yuzuki-hina", team: "slides-team", role: "研修資料制作", avatarUrl: "", currentTask: "研修資料アップデート中", inboxCount: 0 },
];

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

function getInitial(name: string): string {
  return name.charAt(0);
}

export function TeamStatus() {
  const [expanded, setExpanded] = useState(false);
  const displayTeam = expanded ? mockTeam : mockTeam.slice(0, 4);
  const activeCount = mockTeam.filter(m => m.currentTask && !m.currentTask.includes("待機")).length;

  return (
    <section className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
          <Users size={16} className="text-[var(--color-primary)]" />
          AI社員の動き
        </h2>
        <span className="text-xs text-[var(--color-muted)] bg-[var(--color-surface)] px-2.5 py-1 rounded-full">
          {activeCount}名稼働中
        </span>
      </div>

      <div className="space-y-2">
        {displayTeam.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 px-3.5 py-2.5 bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-sm)]"
          >
            {/* アバター */}
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--color-primary)]">
                {getInitial(member.name)}
              </div>
              {member.currentTask && !member.currentTask.includes("待機") && (
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--color-success)] border-2 border-[var(--color-surface)]" />
              )}
            </div>

            {/* 情報 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[var(--color-foreground)]">{member.name}</span>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${teamColors[member.team]}`}>
                  {teamLabels[member.team]}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-muted)] truncate mt-0.5">
                {member.currentTask || "待機中"}
              </p>
            </div>

            {/* INBOX件数 */}
            {(member.inboxCount ?? 0) > 0 && (
              <span className="shrink-0 text-[10px] font-bold text-white bg-[var(--color-priority-high)] w-5 h-5 rounded-full flex items-center justify-center">
                {member.inboxCount}
              </span>
            )}
          </div>
        ))}
      </div>

      {mockTeam.length > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center gap-1 w-full mt-2 py-2 text-xs text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors"
        >
          {expanded ? (
            <>折りたたむ <ChevronUp size={14} /></>
          ) : (
            <>全{mockTeam.length}名を表示 <ChevronDown size={14} /></>
          )}
        </button>
      )}
    </section>
  );
}
