import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { toJSTDateString } from "@/lib/timezone";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: sessions, error } = await supabase
      .from("focus_sessions")
      .select("started_at, ended_at, duration_seconds")
      .eq("user_email", session.user.email)
      .gte("started_at", sevenDaysAgo.toISOString())
      .order("started_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch focus sessions:", error);
      return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 });
    }

    const now = new Date();
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

    // Filter out abandoned sessions (no ended_at and started > 3hrs ago)
    const validSessions = (sessions ?? []).filter((s) => {
      if (s.ended_at) return true;
      const started = new Date(s.started_at as string);
      return now.getTime() - started.getTime() < THREE_HOURS_MS;
    });

    // Calculate stats
    let totalSeconds = 0;
    const dailyMap: Record<string, number> = {};

    // Initialize 7 days (JST)
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyMap[toJSTDateString(d)] = 0;
    }

    for (const s of validSessions) {
      const dur = s.duration_seconds
        ? (s.duration_seconds as number)
        : Math.round((now.getTime() - new Date(s.started_at as string).getTime()) / 1000);
      totalSeconds += dur;

      const dayKey = toJSTDateString(new Date(s.started_at as string));
      if (dayKey in dailyMap) {
        dailyMap[dayKey] += dur;
      }
    }

    const totalFocusMinutes = Math.round(totalSeconds / 60);
    const sessionCount = validSessions.length;
    const averageSessionMinutes = sessionCount > 0 ? Math.round(totalFocusMinutes / sessionCount) : 0;

    const dailyFocusMinutes = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, seconds]) => ({ date, minutes: Math.round(seconds / 60) }));

    return NextResponse.json({
      totalFocusMinutes,
      sessionCount,
      averageSessionMinutes,
      dailyFocusMinutes,
    });
  } catch (err) {
    console.error("Focus stats error:", err);
    return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 });
  }
}
