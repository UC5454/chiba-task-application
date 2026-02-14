import useSWR from "swr";

import { fetcher } from "@/hooks/fetcher";

type NotionEmployeeDetail = {
  dailyLog: string | null;
  gorillaMind: string | null;
  notionUrl: string | null;
};

export const useNotionEmployeeDetail = (email: string | null, date?: string) => {
  const key =
    email && date
      ? `/api/notion-reports/${encodeURIComponent(email)}?date=${date}`
      : null;

  const { data, error, isLoading } = useSWR<NotionEmployeeDetail>(key, fetcher);

  return {
    detail: data ?? null,
    isLoading,
    error,
  };
};
