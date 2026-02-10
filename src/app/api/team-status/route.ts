import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";
import { getTeamStatus } from "@/lib/github";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({ team: [] });
  }

  try {
    const team = await getTeamStatus();

    return NextResponse.json(
      { team },
      {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=300",
        },
      },
    );
  } catch (err) {
    console.error("Team status error:", err);
    return NextResponse.json({ team: [] });
  }
}
