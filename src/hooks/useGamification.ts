import useSWR from "swr";

import { fetcher } from "@/hooks/fetcher";
import type { Gamification } from "@/types";

export const useGamification = () => {
  const { data, error, isLoading, mutate } = useSWR<{ gamification: Gamification }>("/api/gamification", fetcher);

  return {
    gamification: data?.gamification,
    isLoading,
    error,
    mutate,
  };
};
