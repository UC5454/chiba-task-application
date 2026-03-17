import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function DELETE() {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();

    // シングルユーザーアプリなので全行を削除
    // 各テーブルのPKに合わせたフィルタで全行を対象にする
    const results = await Promise.allSettled([
      supabase.from("adhd_settings").delete().not("id", "is", null),
      supabase.from("gamification").delete().not("id", "is", null),
      supabase.from("task_metadata").delete().not("google_task_id", "is", null),
      supabase.from("push_subscriptions").delete().not("subscription_id", "is", null),
      supabase.from("oauth_tokens").delete().not("id", "is", null),
    ]);

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => r.reason);

    if (errors.length > 0) {
      console.error("Account deletion partial errors:", errors);
    }

    return NextResponse.json({
      success: true,
      message: "全てのユーザーデータを削除しました",
    });
  } catch (err) {
    console.error("Account DELETE error:", err);
    return NextResponse.json({ error: "アカウントデータの削除に失敗しました" }, { status: 500 });
  }
}
