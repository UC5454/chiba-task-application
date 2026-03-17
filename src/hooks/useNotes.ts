import useSWR from "swr";

import { fetcher } from "@/hooks/fetcher";
import type { Memo } from "@/types";

export const useNotes = (tag?: string | null, search?: string) => {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  if (search) params.set("search", search);
  const url = `/api/notes${params.toString() ? `?${params.toString()}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<{ notes: Memo[] }>(url, fetcher);

  return {
    notes: data?.notes ?? [],
    isLoading,
    error,
    mutate,
  };
};
