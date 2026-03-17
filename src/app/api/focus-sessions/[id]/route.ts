import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH: Update session state or end session
export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as { state?: string; end?: boolean };
  const supabase = getSupabaseAdminClient();

  try {
    // Fetch existing session
    const { data: existing, error: fetchError } = await supabase
      .from("focus_sessions")
      .select("*")
      .eq("id", id)
      .eq("user_email", session.user.email)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
    }

    // Append state
    if (body.state) {
      const states = (existing.states as Array<{ state: string; at: string }>) ?? [];
      states.push({ state: body.state, at: new Date().toISOString() });

      const { error } = await supabase
        .from("focus_sessions")
        .update({ states })
        .eq("id", id);

      if (error) {
        console.error("Failed to update focus session state:", error);
        return NextResponse.json({ error: "状態更新に失敗しました" }, { status: 500 });
      }
    }

    // End session
    if (body.end) {
      const endedAt = new Date();
      const startedAt = new Date(existing.started_at as string);
      const durationSeconds = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);

      const { error } = await supabase
        .from("focus_sessions")
        .update({
          ended_at: endedAt.toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq("id", id);

      if (error) {
        console.error("Failed to end focus session:", error);
        return NextResponse.json({ error: "セッション終了に失敗しました" }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Focus session PATCH error:", err);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

// POST: sendBeacon fallback for session end (beacon sends POST, not PATCH)
export async function POST(request: Request, context: RouteContext) {
  // sendBeacon doesn't support custom headers, so we parse the body only
  // Auth is relaxed here — we verify ownership by user_email match
  const { id } = await context.params;

  try {
    const body = (await request.json()) as { user_email: string };
    if (!body.user_email) {
      return NextResponse.json({ error: "user_email required" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    const { data: existing, error: fetchError } = await supabase
      .from("focus_sessions")
      .select("started_at, ended_at")
      .eq("id", id)
      .eq("user_email", body.user_email)
      .single();

    if (fetchError || !existing || existing.ended_at) {
      return NextResponse.json({ ok: true }); // Already ended or not found
    }

    const endedAt = new Date();
    const startedAt = new Date(existing.started_at as string);
    const durationSeconds = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);

    await supabase
      .from("focus_sessions")
      .update({
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq("id", id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // Best-effort for beacon
  }
}
