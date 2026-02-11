import useSWR from "swr";
import { fetcher } from "@/hooks/fetcher";
import type { Task } from "@/types";

type CompletionStats = {
  todayCount: number;
  thisWeekCount: number;
  totalCount: number;
};

export const useTasks = (filter: "today" | "all" | "completed" = "all") => {
  const { data, error, isLoading, mutate } = useSWR<{
    tasks: Task[];
    completionStats?: CompletionStats;
  }>(`/api/tasks?filter=${filter}`, fetcher);

  return {
    tasks: data?.tasks ?? [],
    completionStats: data?.completionStats,
    isLoading,
    error,
    mutate,
  };
};
