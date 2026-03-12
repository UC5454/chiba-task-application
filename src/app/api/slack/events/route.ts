import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";

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
 * See: https://api.slack.com/authentication/verifying-requests-from-slack
 */
async function verifySlackRequest(body: string, headers: Headers): Promise<boolean> {
  if (!SLACK_SIGNING_SECRET) return false;

  const timestamp = headers.get("x-slack-request-timestamp");
  const signature = headers.get("x-slack-signature");

  if (!timestamp || !signature) return false;

  // Reject requests older than 5 minutes
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
  const rawBody = await request.text();

  // Verify Slack signature
  if (SLACK_SIGNING_SECRET) {
    const valid = await verifySlackRequest(rawBody, request.headers);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const payload = JSON.parse(rawBody) as SlackEvent;

  // Step 1: Handle Slack URL verification challenge
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  // Step 2: Handle event callbacks
  if (payload.type === "event_callback") {
    const { event } = payload;

    // Only handle reaction_added events for messages
    if (event.type !== "reaction_added" || event.item.type !== "message") {
      return NextResponse.json({ ok: true });
    }

    // Check if the emoji matches our task emoji
    if (!ALL_TASK_EMOJIS.includes(event.reaction)) {
      return NextResponse.json({ ok: true });
    }

    const channel = event.item.channel;
    const messageTs = event.item.ts;
    const reactingUser = event.user;

    // Use waitUntil to keep the serverless function alive for background work
    waitUntil(
      handleTaskCreation(channel, messageTs, reactingUser).catch((err) => {
        console.error("Slack task creation error:", err);
      }),
    );

    // Respond immediately to Slack (must be within 3 seconds)
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

async function handleTaskCreation(channel: string, messageTs: string, reactingUser: string) {
  // 1. Get the message content
  const message = await getSlackMessage(channel, messageTs);
  if (!message) {
    console.error("Could not fetch Slack message");
    return;
  }

  // 2. Clean up the message text for task title
  const rawText = cleanMessageText(message.text);
  if (!rawText) {
    await postSlackReply(channel, messageTs, "メッセージが空のためタスクを作成できませんでした。");
    return;
  }

  // Truncate long messages for task title (max 200 chars)
  const title = rawText.length > 200 ? rawText.slice(0, 197) + "..." : rawText;

  // 3. Get context info
  const [permalink, channelName, userName] = await Promise.all([
    getMessagePermalink(channel, messageTs),
    getChannelName(channel),
    getSlackUserName(reactingUser),
  ]);

  // 4. Build task notes with Slack context
  const today = new Date().toISOString().slice(0, 10);
  const notes = [
    `[Slack] #${channelName}`,
    permalink ? `Link: ${permalink}` : null,
    `Added by: ${userName}`,
    `Original: ${rawText.length > 500 ? rawText.slice(0, 500) + "..." : rawText}`,
  ]
    .filter(Boolean)
    .join("\n");

  // 5. Get Google access token (server-side, no session)
  const accessToken = await getAccessTokenFromRefreshToken();
  if (!accessToken) {
    console.error("Could not get Google access token for Slack task creation");
    await postSlackReply(channel, messageTs, "Google認証エラーのためタスクを作成できませんでした。");
    return;
  }

  // 6. Create task in Google Tasks
  const dueDate = `${today}T00:00:00.000Z`;
  const createdTask = await createTask(accessToken, {
    title,
    notes,
    dueDate,
    priority: 2,
  });

  // 7. Save metadata to Supabase
  const supabase = getSupabaseAdminClient();
  await supabase.from("task_metadata").upsert(
    {
      google_task_id: createdTask.googleTaskId,
      priority: 2,
      category: null,
      assigned_ai_employee: null,
      estimated_minutes: null,
    },
    { onConflict: "google_task_id" },
  );

  // 8. Reply in Slack thread
  await postSlackReply(channel, messageTs, `SOU Task に追加しました: "${title}"\n期限: ${today}`);
}
