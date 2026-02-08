import { NextResponse } from "next/server";

import { getAccessTokenFromSession } from "@/lib/api-auth";
import { getTodayEvents } from "@/lib/google-calendar";

export async function GET() {
  const accessToken = await getAccessTokenFromSession();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await getTodayEvents(accessToken);
  return NextResponse.json({ events });
}
