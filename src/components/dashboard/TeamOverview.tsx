"use client";

import { useState, useCallback } from "react";
import {
  Zap, GitBranch, Plug, MessageSquare, Users, Activity,
  X, Loader2, Sparkles, BarChart3,
} from "lucide-react";

import { useTeamMetrics } from "@/hooks/useTeamMetrics";
import type { TeamMetrics } from "@/hooks/useTeamMetrics";

type MetricType = "skill" | "subagent" | "mcp" | "message" | "active" | "session";

type MetricCard = {
  key: MetricType;
  icon: typeof Zap;
  label: string;
  iconColor: string;
  getValue: (m: TeamMetrics["summary"]) => string;
  getSubtext: (m: TeamMetrics) => string;
};

const CARDS: MetricCard[] = [
  {
    key: "skill",
    icon: Zap,
    label: "Skill実行",
    iconColor: "text-amber-500",
    getValue: (s) => String(s.skillCalls),
    getSubtext: () => "回",
  },
  {
    key: "subagent",
    icon: GitBranch,
    label: "Subagent",
    iconColor: "text-purple-500",
    getValue: (s) => String(s.subagentCalls),
    getSubtext: () => "回",
  },
  {
    key: "mcp",
    icon: Plug,
    label: "MCP呼び出し",
    iconColor: "text-blue-500",
    getValue: (s) => String(s.mcpCalls),
    getSubtext: () => "回",
  },
  {
    key: "message",
    icon: MessageSquare,
    label: "メッセージ",
    iconColor: "text-green-500",
    getValue: (s) => s.messages.toLocaleString(),
    getSubtext: () => "件",
  },
  {
    key: "active",
    icon: Users,
    label: "アクティブ",
    iconColor: "text-teal-500",
    getValue: (s) => `${s.activeEmployees}/${s.totalEmployees}`,
    getSubtext: (m) => `${Math.round((m.summary.activeEmployees / m.summary.totalEmployees) * 100)}%`,
  },
  {
    key: "session",
    icon: Activity,
    label: "セッション",
    iconColor: "text-rose-500",
    getValue: (s) => String(s.sessions),
    getSubtext: () => "回",
  },
];

const TOOL_CATEGORY_LABELS: Record<string, string> = {
  FileOps: "ファイル操作",
  Bash: "コマンド実行",
  MCP: "外部連携",
  Web: "Web検索",
  Subagent: "並列処理",
  Skill: "スキル",
  Other: "その他",
};

const TOOL_CATEGORY_COLORS: Record<string, string> = {
  FileOps: "#3b82f6",
  Bash: "#f59e0b",
  MCP: "#8b5cf6",
  Web: "#10b981",
  Subagent: "#ec4899",
  Skill: "#f97316",
  Other: "#94a3b8",
};

export function TeamOverview() {
  const { metrics, isLoading } = useTeamMetrics();
  const [activeDetail, setActiveDetail] = useState<MetricType | null>(null);
  const [detailAnalysis, setDetailAnalysis] = useState<Record<string, string>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  const fetchDetail = useCallback(async (metric: MetricType, data: TeamMetrics) => {
    if (detailAnalysis[metric]) return;
    setDetailLoading(metric);
    try {
      const response = await fetch("/api/team-metrics/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric, data }),
      });
      if (response.ok) {
        const result = (await response.json()) as { analysis: string | null };
        if (result.analysis) {
          setDetailAnalysis((prev) => ({ ...prev, [metric]: result.analysis as string }));
        }
      }
    } catch {
      // silently fail
    } finally {
      setDetailLoading(null);
    }
  }, [detailAnalysis]);

  const handleCardClick = useCallback((metric: MetricType) => {
    if (activeDetail === metric) {
      setActiveDetail(null);
      return;
    }
    setActiveDetail(metric);
    if (metrics) {
      fetchDetail(metric, metrics);
    }
  }, [activeDetail, metrics, fetchDetail]);

  if (isLoading) {
    return (
      <section className="animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <div className="animate-pulse bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-5 border border-[var(--color-border)] shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-4 w-4 rounded bg-[var(--color-border-light)]" />
            <div className="h-4 w-32 rounded bg-[var(--color-border-light)]" />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-[var(--radius-lg)] bg-[var(--color-border-light)]" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!metrics) return null;

  const recent7 = metrics.dailyTrend.slice(-7);
  const maxTools = Math.max(...recent7.map((d) => d.tools), 1);
  const maxSessions = Math.max(...recent7.map((d) => d.sessions), 1);
  const maxMessages = Math.max(...recent7.map((d) => d.messages), 1);

  const totalBreakdown = Object.values(metrics.toolBreakdown).reduce((s, v) => s + v, 0);

  return (
    <section className="animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-5 border border-[var(--color-border)] shadow-[var(--shadow-sm)]">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-[var(--color-primary)]" />
            <h3 className="text-sm font-bold text-[var(--color-foreground)]">チーム Overview</h3>
          </div>
          <span className="text-[9px] text-[var(--color-muted)]">タップで詳細</span>
        </div>

        {/* 6メトリクスカード */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {CARDS.map((card) => {
            const Icon = card.icon;
            const isActive = activeDetail === card.key;
            return (
              <button
                key={card.key}
                onClick={() => handleCardClick(card.key)}
                className={`bg-[var(--color-surface-hover)] rounded-[var(--radius-lg)] p-3 text-center transition-all ${
                  isActive ? "ring-2 ring-[var(--color-primary)] ring-offset-1" : ""
                }`}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Icon size={12} className={card.iconColor} />
                  <span className="text-[10px] text-[var(--color-muted)]">{card.label}</span>
                </div>
                <p className="text-lg font-extrabold text-[var(--color-foreground)]">
                  {card.getValue(metrics.summary)}
                  <span className="text-xs font-normal text-[var(--color-muted)]">{card.getSubtext(metrics)}</span>
                </p>
              </button>
            );
          })}
        </div>

        {/* 詳細パネル */}
        {activeDetail && (
          <div className="mb-4 p-4 bg-[var(--color-surface-hover)] rounded-[var(--radius-lg)] border border-[var(--color-border-light)] animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-[var(--color-foreground)]">
                {activeDetail === "skill" && "Skill実行の詳細"}
                {activeDetail === "subagent" && "Subagentの詳細"}
                {activeDetail === "mcp" && "MCP呼び出しの詳細"}
                {activeDetail === "message" && "メッセージの詳細"}
                {activeDetail === "active" && "アクティブ社員の詳細"}
                {activeDetail === "session" && "セッションの詳細"}
              </h4>
              <button onClick={() => setActiveDetail(null)} className="p-1 rounded-full hover:bg-[var(--color-border-light)] transition-colors">
                <X size={14} className="text-[var(--color-muted)]" />
              </button>
            </div>

            {/* Skill: ツールカテゴリ内訳 */}
            {activeDetail === "skill" && (
              <div className="space-y-3">
                <p className="text-[10px] text-[var(--color-muted)]">ツールカテゴリ別の実行数</p>
                <div className="space-y-1.5">
                  {Object.entries(metrics.toolBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => {
                      const pct = Math.round((count / totalBreakdown) * 100);
                      return (
                        <div key={cat} className="flex items-center gap-2">
                          <span className="text-[9px] text-[var(--color-muted)] w-16 truncate">
                            {TOOL_CATEGORY_LABELS[cat] ?? cat}
                          </span>
                          <div className="flex-1 h-1.5 bg-[var(--color-border-light)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: TOOL_CATEGORY_COLORS[cat] ?? "var(--color-muted)",
                              }}
                            />
                          </div>
                          <span className="text-[9px] font-medium text-[var(--color-foreground)] w-10 text-right">{count.toLocaleString()}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Subagent: 日別トレンド（ツール数で代替） */}
            {activeDetail === "subagent" && (
              <div className="space-y-3">
                <p className="text-[10px] text-[var(--color-muted)]">直近7日間のツール実行数</p>
                <div className="flex items-end gap-1 h-16">
                  {recent7.map((d) => {
                    const height = Math.max((d.tools / maxTools) * 100, 3);
                    const date = new Date(d.date + "T00:00:00");
                    const dayNum = date.getDate();
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                        {d.tools > 0 && <span className="text-[7px] text-[var(--color-muted)]">{d.tools}</span>}
                        <div className="w-full flex items-end justify-center" style={{ height: "48px" }}>
                          <div
                            className="w-full max-w-[14px] rounded-t-sm bg-purple-500"
                            style={{ height: `${height}%`, opacity: 0.8 }}
                          />
                        </div>
                        <span className="text-[7px] text-[var(--color-muted)]">{dayNum}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[var(--color-muted)]">
                  <span>Subagent起動: <strong className="text-[var(--color-foreground)]">{metrics.summary.subagentCalls}回</strong></span>
                  <span>1セッション平均: <strong className="text-[var(--color-foreground)]">{(metrics.summary.subagentCalls / Math.max(metrics.summary.sessions, 1)).toFixed(1)}回</strong></span>
                </div>
              </div>
            )}

            {/* MCP: トップMCPツール */}
            {activeDetail === "mcp" && (
              <div className="space-y-3">
                <p className="text-[10px] text-[var(--color-muted)]">よく使うMCPツール Top10</p>
                <div className="space-y-1">
                  {metrics.topMcpTools.map((tool, i) => {
                    const maxCount = metrics.topMcpTools[0]?.count ?? 1;
                    const pct = Math.round((tool.count / maxCount) * 100);
                    return (
                      <div key={tool.name} className="flex items-center gap-2">
                        <span className="text-[8px] text-[var(--color-muted)] w-4 text-right">{i + 1}.</span>
                        <span className="text-[9px] text-[var(--color-foreground)] w-36 truncate">{tool.name}</span>
                        <div className="flex-1 h-1.5 bg-[var(--color-border-light)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[9px] font-medium text-[var(--color-foreground)] w-8 text-right">{tool.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Message: 日別メッセージ数 */}
            {activeDetail === "message" && (
              <div className="space-y-3">
                <p className="text-[10px] text-[var(--color-muted)]">直近7日間のメッセージ数</p>
                <div className="space-y-1">
                  {recent7.map((d) => {
                    const date = new Date(d.date + "T00:00:00");
                    const dayLabel = `${date.getMonth() + 1}/${date.getDate()}(${date.toLocaleDateString("ja-JP", { weekday: "short" })})`;
                    const pct = maxMessages > 0 ? Math.round((d.messages / maxMessages) * 100) : 0;
                    return (
                      <div key={d.date} className="flex items-center gap-2">
                        <span className="text-[9px] text-[var(--color-muted)] w-16">{dayLabel}</span>
                        <div className="flex-1 h-2 bg-[var(--color-border-light)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-green-500 transition-all"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-[var(--color-foreground)] w-8 text-right">{d.messages}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active: 社員リスト */}
            {activeDetail === "active" && (
              <div className="space-y-3">
                <p className="text-[10px] text-[var(--color-muted)]">
                  アクティブ率: {Math.round((metrics.summary.activeEmployees / metrics.summary.totalEmployees) * 100)}%
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {metrics.activeEmployeeNames.map((name) => (
                    <span
                      key={name}
                      className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-teal-100 text-teal-700"
                    >
                      {name}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[var(--color-muted)]">
                  <span>アクティブ: <strong className="text-[var(--color-foreground)]">{metrics.summary.activeEmployees}名</strong></span>
                  <span>全体: <strong className="text-[var(--color-foreground)]">{metrics.summary.totalEmployees}名</strong></span>
                </div>
              </div>
            )}

            {/* Session: 日別セッション数 */}
            {activeDetail === "session" && (
              <div className="space-y-3">
                <p className="text-[10px] text-[var(--color-muted)]">直近7日間のセッション数</p>
                <div className="flex items-end gap-1 h-16">
                  {recent7.map((d) => {
                    const height = Math.max((d.sessions / maxSessions) * 100, 3);
                    const date = new Date(d.date + "T00:00:00");
                    const dayLabel = `${date.getMonth() + 1}/${date.getDate()}`;
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                        {d.sessions > 0 && <span className="text-[7px] text-[var(--color-muted)]">{d.sessions}</span>}
                        <div className="w-full flex items-end justify-center" style={{ height: "48px" }}>
                          <div
                            className="w-full max-w-[14px] rounded-t-sm bg-rose-500"
                            style={{ height: `${height}%`, opacity: 0.8 }}
                          />
                        </div>
                        <span className="text-[7px] text-[var(--color-muted)]">{dayLabel}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[var(--color-muted)]">
                  <span>合計: <strong className="text-[var(--color-foreground)]">{metrics.summary.sessions}セッション</strong></span>
                </div>
              </div>
            )}

            {/* Gemini分析コメント */}
            <div className="mt-3 pt-3 border-t border-[var(--color-border-light)]">
              {detailLoading === activeDetail ? (
                <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                  <Loader2 size={12} className="animate-spin" />
                  <span>AI分析を生成中...</span>
                </div>
              ) : detailAnalysis[activeDetail] ? (
                <div className="flex items-start gap-2">
                  <Sparkles size={12} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
                  <p className="text-[11px] leading-relaxed text-[var(--color-foreground)]">{detailAnalysis[activeDetail]}</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                  <Sparkles size={12} />
                  <span>AI分析を読み込めませんでした</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* デフォルト: 日別アクティビティチャート */}
        {!activeDetail && (
          <div>
            <p className="text-[10px] text-[var(--color-muted)] mb-2">直近7日間のアクティビティ</p>
            <div className="flex items-end gap-1.5 h-12">
              {recent7.map((d) => {
                const height = Math.max((d.tools / maxTools) * 100, 4);
                const dayLabel = new Date(d.date + "T00:00:00").toLocaleDateString("ja-JP", { weekday: "short" });
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center" style={{ height: "40px" }}>
                      <div
                        className="w-full max-w-[20px] rounded-t-sm transition-all"
                        style={{
                          height: `${height}%`,
                          backgroundColor: d.tools > 0 ? "var(--color-primary)" : "var(--color-border-light)",
                          opacity: d.tools > 0 ? 1 : 0.4,
                        }}
                      />
                    </div>
                    <span className="text-[8px] text-[var(--color-muted)]">{dayLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
