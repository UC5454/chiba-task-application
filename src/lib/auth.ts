import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

const allowedEmail = process.env.ALLOWED_EMAIL?.toLowerCase();

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
      if (!allowedEmail) {
        return false;
      }

      return user.email?.toLowerCase() === allowedEmail;
    },
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email;
      }
      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined;
      return session;
    },
  },
};
