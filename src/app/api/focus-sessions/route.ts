import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      task_title: string;
      google_task_id?: string;
    };

    if (!body.task_title) {
      return NextResponse.json({ error: "task_title is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("focus_sessions")
      .insert({
        user_email: session.user.email,
        task_title: body.task_title,
        google_task_id: body.google_task_id ?? null,
        started_at: new Date().toISOString(),
        states: [{ state: "idling", at: new Date().toISOString() }],
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create focus session:", error);
      return NextResponse.json({ error: "セッション作成に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("Focus session POST error:", err);
    return NextResponse.json({ error: "セッション作成に失敗しました" }, { status: 500 });
  }
}
