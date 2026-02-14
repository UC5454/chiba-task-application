import useSWR from "swr";

import { fetcher } from "@/hooks/fetcher";
import type { NotionDailyReport } from "@/app/api/notion-reports/route";

type NotionReportsResponse = {
  reports: NotionDailyReport[];
  date?: string;
};

export const useNotionReports = (date?: string) => {
  const params = date ? `?date=${date}` : "";
  const { data, error, isLoading } = useSWR<NotionReportsResponse>(
    `/api/notion-reports${params}`,
    fetcher,
    { dedupingInterval: 300_000 },
  );

  return {
    reports: data?.reports ?? [],
    isLoading,
    error,
  };
};
