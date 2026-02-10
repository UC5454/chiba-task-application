export const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(response.status === 401 ? "ログインが必要です" : `Unexpected response: ${response.status}`);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
};
