import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { Gamification } from "@/types";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const { data } = await supabase.from("gamification").select("*").limit(1).maybeSingle();

  const gamification: Gamification = {
    currentStreak: data?.current_streak ?? 0,
    longestStreak: data?.longest_streak ?? 0,
    totalCompleted: data?.total_completed ?? 0,
    totalReleased: data?.total_released ?? 0,
    lastCompletedDate: data?.last_completed_date ?? undefined,
    badges: Array.isArray(data?.badges) ? data.badges : [],
  };

  return NextResponse.json({ gamification });
}
