import { NextResponse } from "next/server";

import { listTasks } from "@/lib/google-tasks";
import { generateReminders } from "@/lib/reminders";
import { sendPushNotification } from "@/lib/push";
import { getSupabaseAdminClient } from "@/lib/supabase";

const isAuthorizedCron = (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const headerSecret = request.headers.get("x-cron-secret");
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  return headerSecret === secret || bearer === secret;
};

const postSlack = async (message: string) => {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return;

  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });
};

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = process.env.REMINDER_GOOGLE_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: "REMINDER_GOOGLE_ACCESS_TOKEN is missing" }, { status: 500 });
  }

  const supabase = getSupabaseAdminClient();
  const [{ data: settings }, { data: subscriptions }] = await Promise.all([
    supabase.from("adhd_settings").select("*").limit(1).maybeSingle(),
    supabase.from("push_subscriptions").select("endpoint, keys_p256dh, keys_auth"),
  ]);

  const tasks = await listTasks(accessToken);

  const reminders = generateReminders(tasks, {
    quietHoursStart: settings?.quiet_hours_start,
    quietHoursEnd: settings?.quiet_hours_end,
    gentleRemind: settings?.gentle_remind,
    autoReleaseDays: settings?.auto_release_days,
  });

  let sentCount = 0;

  for (const reminder of reminders) {
    const message = reminder.message;

    for (const sub of subscriptions ?? []) {
      const result = await sendPushNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth,
          },
        },
        message,
      );

      if (result.sent) {
        sentCount += 1;
      }
    }

    await postSlack(`SOU Task reminder: ${message}`);
  }

  return NextResponse.json({ checkedTasks: tasks.length, reminders: reminders.length, sentCount });
}
