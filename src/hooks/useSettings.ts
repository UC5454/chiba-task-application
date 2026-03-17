import useSWR from "swr";

import { fetcher } from "@/hooks/fetcher";
import type { ADHDSettings } from "@/types";

export const useSettings = () => {
  const { data, error, isLoading, mutate } = useSWR<{ settings: ADHDSettings }>("/api/settings", fetcher);

  return {
    settings: data?.settings,
    isLoading,
    error,
    mutate,
  };
};
