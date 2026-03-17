import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { getSupabaseAdminClient } from "@/lib/supabase";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ");

const allowedEmail = process.env.ALLOWED_EMAIL?.toLowerCase();

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    });

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      throw new Error((data.error as string) ?? "Token refresh failed");
    }

    return {
      ...token,
      accessToken: data.access_token as string,
      expiresAt: Math.floor(Date.now() / 1000) + ((data.expires_in as number) ?? 3600),
      refreshToken: (data.refresh_token as string) ?? token.refreshToken,
    };
  } catch {
    return { ...token, error: "RefreshTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: GOOGLE_SCOPES,
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      if (!allowedEmail) return false;
      return user.email?.toLowerCase() === allowedEmail;
    },
    async jwt({ token, account }) {
      if (account) {
        // ログイン時にrefresh tokenをSupabaseに保存（Cron用）
        if (account.refresh_token) {
          try {
            const supabase = getSupabaseAdminClient();
            await supabase.from("oauth_tokens").upsert(
              { id: "google", refresh_token: account.refresh_token, updated_at: new Date().toISOString() },
              { onConflict: "id" },
            );
          } catch {
            // Supabase unavailable — continue without persisting
          }
        }
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        };
      }

      if (typeof token.expiresAt === "number" && Date.now() / 1000 < token.expiresAt - 60) {
        return token;
      }

      if (token.refreshToken) {
        return refreshAccessToken(token);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email;
      }
      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined;
      session.error = typeof token.error === "string" ? token.error : undefined;
      return session;
    },
  },
};
