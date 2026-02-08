import useSWR from "swr";

import { fetcher } from "@/hooks/fetcher";
import type { Task } from "@/types";

export const useTasks = (filter: "today" | "all" | "completed" = "all") => {
  const { data, error, isLoading, mutate } = useSWR<{ tasks: Task[] }>(`/api/tasks?filter=${filter}`, fetcher);

  return {
    tasks: data?.tasks ?? [],
    isLoading,
    error,
    mutate,
  };
};
