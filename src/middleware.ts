import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token) {
    // API routes: return 401 JSON instead of redirecting to signin page
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const signInUrl = new URL("/api/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /api/auth/* (NextAuth endpoints)
     * - /api/remind (cron endpoint)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /manifest.json, /sw.js, /icons/* (static assets)
     */
    "/((?!api/auth|api/remind|_next|favicon\\.ico|manifest\\.json|sw\\.js|icons).*)",
  ],
};
