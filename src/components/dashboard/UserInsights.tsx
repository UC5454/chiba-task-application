"use client";

import { useState, useCallback } from "react";
import {
  BarChart3, TrendingDown, TrendingUp, Minus, Target, Zap, FolderOpen, Sparkles,
  X, Loader2,
} from "lucide-react";

import { useInsights } from "@/hooks/useInsights";
import type { InsightsResponse } from "@/app/api/insights/route";

const CATEGORY_LABELS: Record<string, string> = {
  DG: "デジゴリ",
  BND: "BND",
  SOU: "SOU",
  AI_COMMUNITY: "AIコミュニティ",
  PERSONAL: "個人",
  未分類: "未分類",
};

const CATEGORY_COLORS: Record<string, string> = {
  DG: "var(--color-primary)",
  BND: "#f59e0b",
  SOU: "#10b981",
  AI_COMMUNITY: "#8b5cf6",
  PERSONAL: "#ec4899",
  未分類: "var(--color-muted)",
};

type MetricType = "weekly" | "completion" | "daily";

export function UserInsights() {
  const { insights, isLoading } = useInsights();
  const [activeDetail, setActiveDetail] = useState<MetricType | null>(null);
  const [detailAnalysis, setDetailAnalysis] = useState<Record<string, string>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  const fetchDetail = useCallback(async (metric: MetricType, data: InsightsResponse) => {
    if (detailAnalysis[metric]) return; // キャッシュ済み

    setDetailLoading(metric);
    try {
      const response = await fetch("/api/insights/detail", {
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
    if (insights) {
      fetchDetail(metric, insights);
    }
  }, [activeDetail, insights, fetchDetail]);

  if (isLoading) {
    return (
      <section className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <div className="animate-pulse bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-5 border border-[var(--color-border)] shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-4 w-4 rounded bg-[var(--color-border-light)]" />
            <div className="h-4 w-24 rounded bg-[var(--color-border-light)]" />
          </div>
          <div className="h-10 rounded-[var(--radius-lg)] bg-[var(--color-border-light)] mb-4" />
          <div className="grid grid-cols-3 gap-3 mb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-[var(--radius-lg)] bg-[var(--color-border-light)]" />
            ))}
          </div>
          <div className="h-20 rounded-[var(--radius-lg)] bg-[var(--color-border-light)]" />
        </div>
      </section>
    );
  }

  if (!insights) return null;

  const {
    totalActive,
    totalCompleted,
    completionRate,
    thisWeekCompleted,
    lastWeekCompleted,
    weeklyChange,
    categoryBreakdown,
    priorityBreakdown,
    dailyCompletions,
    averagePerDay,
    aiComment,
  } = insights;

  const TrendIcon = weeklyChange > 0 ? TrendingUp : weeklyChange < 0 ? TrendingDown : Minus;
  const trendColor = weeklyChange > 0 ? "text-green-500" : weeklyChange < 0 ? "text-red-400" : "text-[var(--color-muted)]";

  const recent7 = dailyCompletions.slice(-7);
  const recent14 = dailyCompletions;
  const maxDaily = Math.max(...recent7.map((d) => d.count), 1);
  const maxDaily14 = Math.max(...recent14.map((d) => d.count), 1);

  const totalCategoryTasks = Object.values(categoryBreakdown).reduce((s, v) => s + v, 0);
  const highPriority = priorityBreakdown["1"] ?? 0;

  return (
    <section className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-5 border border-[var(--color-border)] shadow-[var(--shadow-sm)]">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-[var(--color-primary)]" />
            <h3 className="text-sm font-bold text-[var(--color-foreground)]">あなたの分析</h3>
          </div>
          <span className="text-[9px] text-[var(--color-muted)]">タップで詳細</span>
        </div>

        {/* AIコメント */}
        {aiComment && (
          <div className="mb-4 p-3 bg-gradient-to-r from-[var(--color-primary)]/5 to-[var(--color-primary)]/10 rounded-[var(--radius-lg)] border border-[var(--color-primary)]/15">
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed text-[var(--color-foreground)]">{aiComment}</p>
            </div>
          </div>
        )}

        {/* メトリクスカード */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {/* 今週の完了 */}
          <button
            onClick={() => handleCardClick("weekly")}
            className={`bg-[var(--color-surface-hover)] rounded-[var(--radius-lg)] p-3 text-center transition-all ${
              activeDetail === "weekly" ? "ring-2 ring-[var(--color-primary)] ring-offset-1" : ""
            }`}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap size={12} className="text-[var(--color-primary)]" />
              <span className="text-[10px] text-[var(--color-muted)]">今週</span>
            </div>
            <p className="text-lg font-extrabold text-[var(--color-foreground)]">{thisWeekCompleted}<span className="text-xs font-normal text-[var(--color-muted)]">件</span></p>
            <div className={`flex items-center justify-center gap-0.5 mt-0.5 ${trendColor}`}>
              <TrendIcon size={10} />
              <span className="text-[9px] font-medium">
                {weeklyChange > 0 ? "+" : ""}{weeklyChange}%
              </span>
            </div>
          </button>

          {/* 完了率 */}
          <button
            onClick={() => handleCardClick("completion")}
            className={`bg-[var(--color-surface-hover)] rounded-[var(--radius-lg)] p-3 text-center transition-all ${
              activeDetail === "completion" ? "ring-2 ring-[var(--color-primary)] ring-offset-1" : ""
            }`}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target size={12} className="text-green-500" />
              <span className="text-[10px] text-[var(--color-muted)]">完了率</span>
            </div>
            <p className="text-lg font-extrabold text-[var(--color-foreground)]">{completionRate}<span className="text-xs font-normal text-[var(--color-muted)]">%</span></p>
            <p className="text-[9px] text-[var(--color-muted)] mt-0.5">残り{totalActive}件</p>
          </button>

          {/* 日平均 */}
          <button
            onClick={() => handleCardClick("daily")}
            className={`bg-[var(--color-surface-hover)] rounded-[var(--radius-lg)] p-3 text-center transition-all ${
              activeDetail === "daily" ? "ring-2 ring-[var(--color-primary)] ring-offset-1" : ""
            }`}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <BarChart3 size={12} className="text-amber-500" />
              <span className="text-[10px] text-[var(--color-muted)]">日平均</span>
            </div>
            <p className="text-lg font-extrabold text-[var(--color-foreground)]">{averagePerDay}<span className="text-xs font-normal text-[var(--color-muted)]">件</span></p>
            <p className="text-[9px] text-[var(--color-muted)] mt-0.5">
              {highPriority > 0 ? `高優先${highPriority}件` : "高優先なし"}
            </p>
          </button>
        </div>

        {/* 詳細パネル */}
        {activeDetail && (
          <div className="mb-4 p-4 bg-[var(--color-surface-hover)] rounded-[var(--radius-lg)] border border-[var(--color-border-light)] animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-[var(--color-foreground)]">
                {activeDetail === "weekly" && "週次レポート"}
                {activeDetail === "completion" && "完了率の詳細"}
                {activeDetail === "daily" && "日別パフォーマンス"}
              </h4>
              <button onClick={() => setActiveDetail(null)} className="p-1 rounded-full hover:bg-[var(--color-border-light)] transition-colors">
                <X size={14} className="text-[var(--color-muted)]" />
              </button>
            </div>

            {/* 週次: 14日間チャート */}
            {activeDetail === "weekly" && (
              <div className="space-y-3">
                <p className="text-[10px] text-[var(--color-muted)]">直近14日間の完了推移</p>
                <div className="flex items-end gap-1 h-16">
                  {recent14.map((d) => {
                    const height = Math.max((d.count / maxDaily14) * 100, 3);
                    const date = new Date(d.date + "T00:00:00");
                    const dayNum = date.getDate();
                    const isThisWeek = date >= new Date(new Date().setDate(new Date().getDate() - new Date().getDay()));
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                        {d.count > 0 && <span className="text-[7px] text-[var(--color-muted)]">{d.count}</span>}
                        <div className="w-full flex items-end justify-center" style={{ height: "48px" }}>
                          <div
                            className="w-full max-w-[14px] rounded-t-sm"
                            style={{
                              height: `${height}%`,
                              backgroundColor: isThisWeek ? "var(--color-primary)" : "var(--color-primary)",
                              opacity: isThisWeek ? 1 : 0.4,
                            }}
                          />
                        </div>
                        <span className="text-[7px] text-[var(--color-muted)]">{dayNum}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[var(--color-muted)]">
                  <span>先週: <strong className="text-[var(--color-foreground)]">{lastWeekCompleted}件</strong></span>
                  <span>→</span>
                  <span>今週: <strong className="text-[var(--color-foreground)]">{thisWeekCompleted}件</strong></span>
                  <span className={trendColor}>({weeklyChange > 0 ? "+" : ""}{weeklyChange}%)</span>
                </div>
              </div>
            )}

            {/* 完了率: 内訳ビジュアル */}
            {activeDetail === "completion" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-3 bg-[var(--color-border-light)] rounded-full overflow-hidden flex">
                    {totalCompleted + totalActive > 0 && (
                      <>
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${completionRate}%` }}
                        />
                        <div
                          className="h-full bg-[var(--color-muted)]/30"
                          style={{ width: `${100 - completionRate}%` }}
                        />
                      </>
                    )}
                  </div>
                  <span className="text-xs font-bold text-[var(--color-foreground)]">{completionRate}%</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-[var(--color-muted)]">完了</span>
                    <strong className="text-[var(--color-foreground)]">{totalCompleted}件</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-muted)]/30" />
                    <span className="text-[var(--color-muted)]">残り</span>
                    <strong className="text-[var(--color-foreground)]">{totalActive}件</strong>
                  </div>
                </div>

                {/* 優先度内訳 */}
                <div>
                  <p className="text-[10px] text-[var(--color-muted)] mb-1.5">残りタスクの優先度</p>
                  <div className="flex gap-2">
                    {[
                      { key: "1", label: "高", color: "#ef4444" },
                      { key: "2", label: "中", color: "#f59e0b" },
                      { key: "3", label: "低", color: "#22c55e" },
                    ].map(({ key, label, color }) => (
                      <div key={key} className="flex-1 text-center p-1.5 rounded-[var(--radius-md)] bg-[var(--color-surface)]">
                        <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: color }} />
                        <p className="text-xs font-bold text-[var(--color-foreground)]">{priorityBreakdown[key] ?? 0}</p>
                        <p className="text-[8px] text-[var(--color-muted)]">{label}優先</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* カテゴリ */}
                {totalCategoryTasks > 0 && (
                  <div>
                    <p className="text-[10px] text-[var(--color-muted)] mb-1.5">カテゴリ別</p>
                    <div className="space-y-1">
                      {Object.entries(categoryBreakdown)
                        .sort(([, a], [, b]) => b - a)
                        .map(([cat, count]) => {
                          const pct = Math.round((count / totalCategoryTasks) * 100);
                          return (
                            <div key={cat} className="flex items-center gap-2">
                              <span className="text-[9px] text-[var(--color-muted)] w-14 truncate">{CATEGORY_LABELS[cat] ?? cat}</span>
                              <div className="flex-1 h-1.5 bg-[var(--color-border-light)] rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat] ?? "var(--color-muted)" }} />
                              </div>
                              <span className="text-[9px] font-medium text-[var(--color-foreground)] w-5 text-right">{count}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 日平均: 7日間詳細 + 優先度 */}
            {activeDetail === "daily" && (
              <div className="space-y-3">
                <p className="text-[10px] text-[var(--color-muted)]">直近7日間の日別完了数</p>
                <div className="space-y-1">
                  {recent7.map((d) => {
                    const date = new Date(d.date + "T00:00:00");
                    const dayLabel = `${date.getMonth() + 1}/${date.getDate()}(${date.toLocaleDateString("ja-JP", { weekday: "short" })})`;
                    const pct = maxDaily > 0 ? Math.round((d.count / maxDaily) * 100) : 0;
                    return (
                      <div key={d.date} className="flex items-center gap-2">
                        <span className="text-[9px] text-[var(--color-muted)] w-16">{dayLabel}</span>
                        <div className="flex-1 h-2 bg-[var(--color-border-light)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.max(pct, 2)}%`,
                              backgroundColor: d.count > 0 ? "var(--color-primary)" : "transparent",
                            }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-[var(--color-foreground)] w-5 text-right">{d.count}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 pt-1 text-[10px] text-[var(--color-muted)]">
                  <span>平均: <strong className="text-[var(--color-foreground)]">{averagePerDay}件/日</strong></span>
                  <span>最高: <strong className="text-[var(--color-foreground)]">{maxDaily}件</strong></span>
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

        {/* デフォルトの7日間チャート（詳細パネルが開いてない時） */}
        {!activeDetail && (
          <>
            <div className="mb-4">
              <p className="text-[10px] text-[var(--color-muted)] mb-2">直近7日間の完了数</p>
              <div className="flex items-end gap-1.5 h-12">
                {recent7.map((d) => {
                  const height = Math.max((d.count / maxDaily) * 100, 4);
                  const dayLabel = new Date(d.date + "T00:00:00").toLocaleDateString("ja-JP", { weekday: "short" });
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end justify-center" style={{ height: "40px" }}>
                        <div
                          className="w-full max-w-[20px] rounded-t-sm transition-all"
                          style={{
                            height: `${height}%`,
                            backgroundColor: d.count > 0 ? "var(--color-primary)" : "var(--color-border-light)",
                            opacity: d.count > 0 ? 1 : 0.4,
                          }}
                        />
                      </div>
                      <span className="text-[8px] text-[var(--color-muted)]">{dayLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {totalCategoryTasks > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <FolderOpen size={12} className="text-[var(--color-muted)]" />
                  <p className="text-[10px] text-[var(--color-muted)]">カテゴリ別タスク数</p>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(categoryBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => {
                      const pct = Math.round((count / totalCategoryTasks) * 100);
                      return (
                        <div key={cat} className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--color-muted)] w-16 truncate">{CATEGORY_LABELS[cat] ?? cat}</span>
                          <div className="flex-1 h-1.5 bg-[var(--color-border-light)] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat] ?? "var(--color-muted)" }} />
                          </div>
                          <span className="text-[10px] font-medium text-[var(--color-foreground)] w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
