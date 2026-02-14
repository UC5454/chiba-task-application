import useSWR from "swr";

import { fetcher } from "@/hooks/fetcher";
import type { InsightsResponse } from "@/app/api/insights/route";

export const useInsights = () => {
  const { data, error, isLoading } = useSWR<{ insights: InsightsResponse }>(
    "/api/insights",
    fetcher,
    { dedupingInterval: 60_000 },
  );

  return {
    insights: data?.insights,
    isLoading,
    error,
  };
};
