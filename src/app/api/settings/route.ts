import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { ADHDSettings } from "@/types";

const table = "adhd_settings";

const defaults: ADHDSettings = {
  maxDailyTasks: 5,
  focusDuration: 25,
  overfocusAlert: 120,
  breakDuration: 5,
  slackNotifyEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  gentleRemind: true,
  celebrationEnabled: true,
  autoReleaseEnabled: true,
  autoReleaseDays: 14,
};

const toSettings = (row: Record<string, unknown> | null): ADHDSettings => ({
  maxDailyTasks: Number(row?.max_daily_tasks ?? defaults.maxDailyTasks),
  focusDuration: Number(row?.focus_duration ?? defaults.focusDuration),
  overfocusAlert: Number(row?.overfocus_alert ?? defaults.overfocusAlert),
  breakDuration: Number(row?.break_duration ?? defaults.breakDuration),
  slackNotifyEnabled: Boolean(row?.slack_notify_enabled ?? defaults.slackNotifyEnabled),
  quietHoursStart: String(row?.quiet_hours_start ?? defaults.quietHoursStart),
  quietHoursEnd: String(row?.quiet_hours_end ?? defaults.quietHoursEnd),
  gentleRemind: Boolean(row?.gentle_remind ?? defaults.gentleRemind),
  celebrationEnabled: Boolean(row?.celebration_enabled ?? defaults.celebrationEnabled),
  autoReleaseEnabled: Boolean(row?.auto_release_enabled ?? defaults.autoReleaseEnabled),
  autoReleaseDays: Number(row?.auto_release_days ?? defaults.autoReleaseDays),
});

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.from(table).select("*").limit(1).maybeSingle();

    if (error) {
      console.error("Supabase settings error:", error);
      return NextResponse.json({ settings: defaults });
    }

    return NextResponse.json({ settings: toSettings(data) });
  } catch (err) {
    console.error("Supabase connection error:", err);
    return NextResponse.json({ settings: defaults });
  }
}

export async function PUT(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<ADHDSettings>;

  try {
    const supabase = getSupabaseAdminClient();
    const { data: existing } = await supabase.from(table).select("id").limit(1).maybeSingle();

    const payload = {
      max_daily_tasks: body.maxDailyTasks,
      focus_duration: body.focusDuration,
      overfocus_alert: body.overfocusAlert,
      break_duration: body.breakDuration,
      slack_notify_enabled: body.slackNotifyEnabled,
      quiet_hours_start: body.quietHoursStart,
      quiet_hours_end: body.quietHoursEnd,
      gentle_remind: body.gentleRemind,
      celebration_enabled: body.celebrationEnabled,
      auto_release_enabled: body.autoReleaseEnabled,
      auto_release_days: body.autoReleaseDays,
    };

    const legacyPayload = {
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
      const { error: updateError } = await supabase.from(table).update(payload).eq("id", existing.id);
      if (updateError) {
        console.warn("Supabase settings update failed, retrying without new columns:", updateError);
        const { error: legacyError } = await supabase.from(table).update(legacyPayload).eq("id", existing.id);
        if (legacyError) throw legacyError;
      }
    } else {
      const { error: insertError } = await supabase.from(table).insert(payload);
      if (insertError) {
        console.warn("Supabase settings insert failed, retrying without new columns:", insertError);
        const { error: legacyError } = await supabase.from(table).insert(legacyPayload);
        if (legacyError) throw legacyError;
      }
    }

    const { data } = await supabase.from(table).select("*").limit(1).maybeSingle();
    return NextResponse.json({ settings: toSettings(data) });
  } catch (err) {
    console.error("Supabase settings write error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
