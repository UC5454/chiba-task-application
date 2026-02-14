"use client";

import useSWR from "swr";

export type TeamMetrics = {
  summary: {
    skillCalls: number;
    subagentCalls: number;
    mcpCalls: number;
    messages: number;
    activeEmployees: number;
    totalEmployees: number;
    sessions: number;
    totalToolCalls: number;
  };
  toolBreakdown: Record<string, number>;
  topTools: Array<{ name: string; count: number }>;
  topMcpTools: Array<{ name: string; count: number }>;
  dailyTrend: Array<{ date: string; sessions: number; tools: number; messages: number }>;
  activeEmployeeNames: string[];
  generatedAt: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json()) as Promise<TeamMetrics>;

export function useTeamMetrics() {
  const { data, error, isLoading } = useSWR<TeamMetrics>("/team-metrics.json", fetcher, {
    dedupingInterval: 300_000,
    revalidateOnFocus: false,
  });

  return { metrics: data ?? null, isLoading, error };
}
