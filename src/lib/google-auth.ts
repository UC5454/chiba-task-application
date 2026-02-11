import { getSupabaseAdminClient } from "@/lib/supabase";

/**
 * Google OAuth refresh token helper for server-side / cron contexts.
 * Used when there's no user session (e.g., Vercel Cron jobs).
 *
 * Token resolution order:
 * 1. Supabase oauth_tokens table (auto-updated on user login)
 * 2. GOOGLE_REFRESH_TOKEN env var (fallback)
 */
async function getRefreshToken(): Promise<string | null> {
  // 1. Supabase (ログイン時に自動保存されたトークン)
  try {
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase.from("oauth_tokens").select("refresh_token").eq("id", "google").maybeSingle();
    if (data?.refresh_token) return data.refresh_token as string;
  } catch {
    // Supabase unavailable
  }

  // 2. Env var fallback
  return process.env.GOOGLE_REFRESH_TOKEN ?? null;
}

export async function getAccessTokenFromRefreshToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
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
