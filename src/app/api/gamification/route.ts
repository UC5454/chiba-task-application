import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { Gamification } from "@/types";

const defaultGamification: Gamification = {
  currentStreak: 0,
  longestStreak: 0,
  totalCompleted: 0,
  totalReleased: 0,
  lastCompletedDate: undefined,
  badges: [],
};

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.from("gamification").select("*").limit(1).maybeSingle();

    if (error) {
      console.error("Supabase gamification error:", error);
      return NextResponse.json({ gamification: defaultGamification });
    }

    const gamification: Gamification = {
      currentStreak: data?.current_streak ?? 0,
      longestStreak: data?.longest_streak ?? 0,
      totalCompleted: data?.total_completed ?? 0,
      totalReleased: data?.total_released ?? 0,
      lastCompletedDate: data?.last_completed_date ?? undefined,
      badges: Array.isArray(data?.badges) ? data.badges : [],
    };

    return NextResponse.json({ gamification });
  } catch (err) {
    console.error("Supabase connection error:", err);
    return NextResponse.json({ gamification: defaultGamification });
  }
}
