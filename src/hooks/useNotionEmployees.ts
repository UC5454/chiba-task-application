import useSWR from "swr";

import { fetcher } from "@/hooks/fetcher";
import type { NotionEmployee } from "@/app/api/notion-reports/employees/route";

export const useNotionEmployees = () => {
  const { data, error, isLoading } = useSWR<{ employees: NotionEmployee[] }>(
    "/api/notion-reports/employees",
    fetcher,
    { dedupingInterval: 600_000 },
  );

  return {
    employees: data?.employees ?? [],
    isLoading,
    error,
  };
};
