import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  await supabase
    .from("push_subscriptions")
    .upsert(
      {
        endpoint: body.endpoint,
        keys_p256dh: body.keys.p256dh,
        keys_auth: body.keys.auth,
      },
      { onConflict: "endpoint" },
    );

  return NextResponse.json({ success: true });
}
