import { NextResponse } from "next/server";

import { getAccessTokenFromRefreshToken } from "@/lib/google-auth";
import { listTasks } from "@/lib/google-tasks";
import { generateReminders } from "@/lib/reminders";
import { sendPushNotification } from "@/lib/push";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { Reminder } from "@/types";

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

const postSlack = async (reminder: Reminder) => {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return;

  const emoji = reminder.type.startsWith("overdue") ? ":warning:" : ":bell:";
  const typeLabel: Record<string, string> = {
    due_tomorrow: "明日が期限",
    due_today: "今日が期限",
    due_soon: "もうすぐ期限",
    overdue_1d: "1日超過",
    overdue_3d: "3日超過",
    overdue_7d: "1週間超過",
    overdue_14d: "2週間超過",
  };

  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `SOU Task: ${reminder.message}`,
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: `${emoji} *${reminder.taskTitle}*\n${reminder.message}` },
        },
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: `ステータス: ${typeLabel[reminder.type] ?? reminder.type}` }],
        },
      ],
    }),
  }).catch(() => {});
};

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = await getAccessTokenFromRefreshToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Failed to obtain access token. Check GOOGLE_REFRESH_TOKEN." }, { status: 500 });
  }

  let settings = null;
  let subscriptions: Array<{ endpoint: string; keys_p256dh: string; keys_auth: string }> = [];

  try {
    const supabase = getSupabaseAdminClient();
    const [settingsResult, subsResult] = await Promise.all([
      supabase.from("adhd_settings").select("*").limit(1).maybeSingle(),
      supabase.from("push_subscriptions").select("endpoint, keys_p256dh, keys_auth"),
    ]);
    settings = settingsResult.data;
    subscriptions = subsResult.data ?? [];
  } catch {
    // Supabase unavailable — continue with defaults
  }

  const tasks = await listTasks(accessToken);

  const reminders = generateReminders(tasks, {
    quietHoursStart: settings?.quiet_hours_start,
    quietHoursEnd: settings?.quiet_hours_end,
    gentleRemind: settings?.gentle_remind,
    autoReleaseDays: settings?.auto_release_days,
  });

  let sentCount = 0;
  const slackEnabled = settings?.slack_notify_enabled ?? true;

  for (const reminder of reminders) {
    const message = reminder.message;

    for (const sub of subscriptions) {
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

    if (slackEnabled) {
      await postSlack(reminder);
    }
  }

  return NextResponse.json({ checkedTasks: tasks.length, reminders: reminders.length, sentCount });
}
