import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";
import { getTeamStatus } from "@/lib/github";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const team = await getTeamStatus();

  return NextResponse.json(
    { team },
    {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=300",
      },
    },
  );
}
