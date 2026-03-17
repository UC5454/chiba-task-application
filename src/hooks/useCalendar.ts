import useSWR from "swr";

import { fetcher } from "@/hooks/fetcher";
import type { CalendarEvent } from "@/types";

export const useCalendar = () => {
  const { data, error, isLoading, mutate } = useSWR<{ events: CalendarEvent[] }>("/api/calendar", fetcher);

  return {
    events: data?.events ?? [],
    isLoading,
    error,
    mutate,
  };
};
