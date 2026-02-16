import useSWR from "swr";

import { fetcher } from "@/hooks/fetcher";

export type FocusStats = {
  totalFocusMinutes: number;
  sessionCount: number;
  averageSessionMinutes: number;
  dailyFocusMinutes: Array<{ date: string; minutes: number }>;
};

export const useFocusStats = () => {
  const { data, error, isLoading } = useSWR<FocusStats>(
    "/api/focus-sessions/stats",
    fetcher,
    { dedupingInterval: 60_000 },
  );

  return {
    focusStats: data,
    isLoading,
    error,
  };
};
