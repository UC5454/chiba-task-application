import useSWR from "swr";

import { fetcher } from "@/hooks/fetcher";
import type { AIEmployee } from "@/types";

export const useTeamStatus = () => {
  const { data, error, isLoading, mutate } = useSWR<{ team: AIEmployee[] }>("/api/team-status", fetcher);

  return {
    team: data?.team ?? [],
    isLoading,
    error,
    mutate,
  };
};
