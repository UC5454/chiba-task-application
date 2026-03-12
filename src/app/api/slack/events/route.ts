import { NextResponse } from "next/server";

import { getAccessTokenFromRefreshToken } from "@/lib/google-auth";
import { createTask } from "@/lib/google-tasks";
import {
  cleanMessageText,
  getChannelName,
  getMessagePermalink,
  getSlackMessage,
  getSlackUserName,
  postSlackReply,
} from "@/lib/slack-events";
import { getSupabaseAdminClient } from "@/lib/supabase";

// Emoji that triggers task creation (without colons)
const TASK_EMOJI = process.env.SLACK_TASK_EMOJI ?? "task";
// Also support common alternatives
const TASK_EMOJI_ALIASES = (process.env.SLACK_TASK_EMOJI_ALIASES ?? "white_check_mark,memo").split(",").map((s) => s.trim());
const ALL_TASK_EMOJIS = [TASK_EMOJI, ...TASK_EMOJI_ALIASES];

// Slack signing secret for request verification
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET ?? "";

/**
 * Verify Slack request signature.
 */
async function verifySlackRequest(body: string, headers: Headers): Promise<boolean> {
  if (!SLACK_SIGNING_SECRET) return false;

  const timestamp = headers.get("x-slack-request-timestamp");
  const signature = headers.get("x-slack-signature");

  if (!timestamp || !signature) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) return false;

  const sigBaseString = `v0:${timestamp}:${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(SLACK_SIGNING_SECRET), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(sigBaseString));
  const computed = `v0=${Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;

  return computed === signature;
}

type SlackEvent =
  | { type: "url_verification"; challenge: string }
  | {
      type: "event_callback";
      event_id: string;
      event: {
        type: string;
        reaction: string;
        user: string;
        item: {
          type: string;
          channel: string;
          ts: string;
        };
      };
    };

export async function POST(request: Request) {
  console.log("[slack/events] request received");

  // Slack retries if no response within 3s. Ignore retries to prevent double processing.
  const retryNum = request.headers.get("x-slack-retry-num");
  if (retryNum) {
    console.log("[slack/events] ignoring Slack retry", { retryNum });
    return NextResponse.json({ ok: true, ignored: "retry" }, { status: 200 });
  }

  try {
    const rawBody = await request.text();
    console.log("[slack/events] request body read", { bodyLength: rawBody.length });

    if (SLACK_SIGNING_SECRET) {
      const valid = await verifySlackRequest(rawBody, request.headers);
      console.log("[slack/events] signature verification finished", { valid });
      if (!valid) {
        console.log("[slack/events] invalid signature");
        return NextResponse.json({ ok: true, ignored: "invalid_signature" }, { status: 200 });
      }
    } else {
      console.log("[slack/events] signing secret missing, skipping verification");
    }

    let payload: SlackEvent;
    try {
      payload = JSON.parse(rawBody) as SlackEvent;
    } catch (error) {
      console.error("[slack/events] failed to parse request body", error);
      return NextResponse.json({ ok: true, ignored: "invalid_json" }, { status: 200 });
    }

    console.log("[slack/events] payload parsed", { type: payload.type });

    if (payload.type === "url_verification") {
      console.log("[slack/events] responding to url_verification challenge");
      return NextResponse.json({ challenge: payload.challenge }, { status: 200 });
    }

    if (payload.type === "event_callback") {
      const { event } = payload;
      console.log("[slack/events] event callback received", {
        eventType: event.type,
        reaction: event.reaction,
        itemType: event.item.type,
        channel: event.item.channel,
        ts: event.item.ts,
      });

      if (event.type !== "reaction_added" || event.item.type !== "message") {
        console.log("[slack/events] event ignored", { reason: "unsupported_event" });
        return NextResponse.json({ ok: true, ignored: "unsupported_event" }, { status: 200 });
      }

      if (!ALL_TASK_EMOJIS.includes(event.reaction)) {
        console.log("[slack/events] reaction ignored", { reaction: event.reaction });
        return NextResponse.json({ ok: true, ignored: "non_task_reaction" }, { status: 200 });
      }

      console.log("[slack/events] task creation started", {
        channel: event.item.channel,
        ts: event.item.ts,
        reactingUser: event.user,
      });

      // Await task creation directly — total processing is well under Vercel's 10s timeout
      try {
        await handleTaskCreation(event.item.channel, event.item.ts, event.user);
        console.log("[slack/events] task creation finished");
      } catch (err) {
        console.error("[slack/events] task creation error", err);
      }

      console.log("[slack/events] request completed");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    console.log("[slack/events] payload ignored", { reason: "unknown_payload_type" });
    return NextResponse.json({ ok: true, ignored: "unknown_payload_type" }, { status: 200 });
  } catch (error) {
    console.error("[slack/events] unexpected POST error", error);
    return NextResponse.json({ ok: true, ignored: "unexpected_error" }, { status: 200 });
  }
}

async function handleTaskCreation(channel: string, messageTs: string, reactingUser: string) {
  console.log("[slack/events] handleTaskCreation started", { channel, messageTs, reactingUser });

  // 1. Get the message content
  const message = await getSlackMessage(channel, messageTs);
  if (!message) {
    console.error("[slack/events] could not fetch Slack message", { channel, messageTs });
    return;
  }

  // 2. Clean up the message text for task title
  const rawText = cleanMessageText(message.text);
  if (!rawText) {
    console.log("[slack/events] message text empty after cleanup", { channel, messageTs });
    await postSlackReply(channel, messageTs, "メッセージが空のためタスクを作成できませんでした。");
    return;
  }

  const title = rawText.length > 200 ? rawText.slice(0, 197) + "..." : rawText;

  // 3. Get context info in parallel
  const [permalink, channelName, userName] = await Promise.all([
    getMessagePermalink(channel, messageTs),
    getChannelName(channel),
    getSlackUserName(reactingUser),
  ]);
  console.log("[slack/events] slack context resolved", { permalink, channelName, userName });

  // 4. Build task notes
  const today = new Date().toISOString().slice(0, 10);
  const notes = [
    `[Slack] #${channelName}`,
    permalink ? `Link: ${permalink}` : null,
    `Added by: ${userName}`,
    `Original: ${rawText.length > 500 ? rawText.slice(0, 500) + "..." : rawText}`,
  ]
    .filter(Boolean)
    .join("\n");

  // 5. Get Google access token
  const accessToken = await getAccessTokenFromRefreshToken();
  if (!accessToken) {
    console.error("[slack/events] could not get Google access token");
    await postSlackReply(channel, messageTs, "Google認証エラーのためタスクを作成できませんでした。");
    return;
  }

  // 6. Create task in Google Tasks
  const createdTask = await createTask(accessToken, {
    title,
    notes,
    dueDate: `${today}T00:00:00.000Z`,
    priority: 2,
  });
  console.log("[slack/events] google task created", { googleTaskId: createdTask.googleTaskId, title });

  // 7. Save metadata to Supabase
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("task_metadata").upsert(
    {
      google_task_id: createdTask.googleTaskId,
      priority: 2,
      category: null,
      assigned_ai_employee: null,
      estimated_minutes: null,
    },
    { onConflict: "google_task_id" },
  );
  if (error) {
    console.error("[slack/events] failed to upsert task metadata", error);
  } else {
    console.log("[slack/events] task metadata upserted", { googleTaskId: createdTask.googleTaskId });
  }

  // 8. Reply in Slack thread
  await postSlackReply(channel, messageTs, `SOU Task に追加しました: "${title}"\n期限: ${today}`);
  console.log("[slack/events] handleTaskCreation completed", { channel, messageTs });
}
