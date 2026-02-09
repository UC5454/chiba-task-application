/**
 * Google OAuth refresh token helper for server-side / cron contexts.
 * Used when there's no user session (e.g., Vercel Cron jobs).
 */
export async function getAccessTokenFromRefreshToken(): Promise<string | null> {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) return null;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as Record<string, unknown>;
  return (data.access_token as string) ?? null;
}
