import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token) {
    const signInUrl = new URL("/api/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match page routes only. API routes handle their own auth.
     * Exclude:
     * - /api/* (all API routes - they return 401 JSON themselves)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /manifest.json, /sw.js, /icons/* (static assets)
     */
    "/((?!api|_next|favicon\\.ico|manifest\\.json|sw\\.js|icons).*)",
  ],
};
