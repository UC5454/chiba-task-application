import useSWR from "swr";

import { fetcher } from "@/hooks/fetcher";
import type { AIEmployee } from "@/types";

type EmployeeDetail = {
  employee: AIEmployee & { role: string };
  currentTask: string;
  inboxCount: number;
  dailyLog: string | null;
  availableDates: string[];
};

export const useEmployeeDetail = (employeeId: string | null, date?: string) => {
  const key = employeeId ? `/api/team-status/${employeeId}${date ? `?date=${date}` : ""}` : null;
  const { data, error, isLoading } = useSWR<{ detail: EmployeeDetail }>(key, fetcher);

  return {
    detail: data?.detail ?? null,
    isLoading,
    error,
  };
};
