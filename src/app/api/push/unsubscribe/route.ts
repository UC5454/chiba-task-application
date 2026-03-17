import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { endpoint?: string };
  if (!body.endpoint) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", body.endpoint);

  return NextResponse.json({ success: true });
}
