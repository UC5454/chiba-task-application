import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { ADHDSettings } from "@/types";

const table = "adhd_settings";

const toSettings = (row: Record<string, unknown> | null): ADHDSettings => ({
  maxDailyTasks: Number(row?.max_daily_tasks ?? 5),
  focusDuration: Number(row?.focus_duration ?? 25),
  quietHoursStart: String(row?.quiet_hours_start ?? "22:00"),
  quietHoursEnd: String(row?.quiet_hours_end ?? "07:00"),
  gentleRemind: Boolean(row?.gentle_remind ?? true),
  celebrationEnabled: Boolean(row?.celebration_enabled ?? true),
  autoReleaseEnabled: Boolean(row?.auto_release_enabled ?? true),
  autoReleaseDays: Number(row?.auto_release_days ?? 14),
});

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const { data } = await supabase.from(table).select("*").limit(1).maybeSingle();

  return NextResponse.json({ settings: toSettings(data) });
}

export async function PUT(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<ADHDSettings>;
  const supabase = getSupabaseAdminClient();

  const { data: existing } = await supabase.from(table).select("id").limit(1).maybeSingle();

  const payload = {
    max_daily_tasks: body.maxDailyTasks,
    focus_duration: body.focusDuration,
    quiet_hours_start: body.quietHoursStart,
    quiet_hours_end: body.quietHoursEnd,
    gentle_remind: body.gentleRemind,
    celebration_enabled: body.celebrationEnabled,
    auto_release_enabled: body.autoReleaseEnabled,
    auto_release_days: body.autoReleaseDays,
  };

  if (existing?.id) {
    await supabase.from(table).update(payload).eq("id", existing.id);
  } else {
    await supabase.from(table).insert(payload);
  }

  const { data } = await supabase.from(table).select("*").limit(1).maybeSingle();

  return NextResponse.json({ settings: toSettings(data) });
}
