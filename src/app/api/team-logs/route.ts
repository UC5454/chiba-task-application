import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";
import { getDailyLogs } from "@/lib/github";
import { syncDailyLogsToNotion } from "@/lib/notion";

// GET: GitHubからdaily-logsを取得
export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({ logs: [] });
  }

  try {
    const date = request.nextUrl.searchParams.get("date") ?? undefined;
    const logs = await getDailyLogs(date);

    return NextResponse.json(
      { logs },
      { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=300" } },
    );
  } catch (err) {
    console.error("Team logs error:", err);
    return NextResponse.json({ logs: [] });
  }
}

// POST: GitHubからdaily-logsを取得してNotionに同期
export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
  }

  if (!process.env.NOTION_DAILY_LOG_DB_ID) {
    return NextResponse.json({ error: "Notion daily log DB not configured" }, { status: 500 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { date?: string };
    const date = body.date ?? undefined;
    const logs = await getDailyLogs(date);

    if (logs.length === 0) {
      return NextResponse.json({ synced: 0, errors: 0, message: "No logs found" });
    }

    const result = await syncDailyLogsToNotion(logs);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Team logs sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
