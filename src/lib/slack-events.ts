/**
 * Slack Events API helper for reaction-based task creation.
 *
 * When a user adds a specific emoji reaction (default: :task:) to a Slack message,
 * this module fetches the message text and creates a task in Google Tasks + Supabase.
 */

// User Token (xoxp-) — can access all channels the user is in, no bot invite needed
const SLACK_USER_TOKEN = process.env.SLACK_USER_TOKEN ?? "";
// Bot Token (xoxb-) — used for posting replies as the bot
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN ?? "";
// Read token: prefer user token for reading (no invite needed), fallback to bot token
const READ_TOKEN = SLACK_USER_TOKEN || SLACK_BOT_TOKEN;

type SlackMessage = {
  text: string;
  user: string;
  ts: string;
  channel: string;
  thread_ts?: string;
  permalink?: string;
};

type SlackUserProfile = {
  real_name?: string;
  display_name?: string;
};

/**
 * Fetch a single message from Slack.
 * Handles both top-level messages (conversations.history) and
 * thread replies (conversations.replies).
 */
export async function getSlackMessage(channel: string, messageTs: string): Promise<SlackMessage | null> {
  // 1. Try conversations.history (works for top-level messages)
  const histRes = await fetch("https://slack.com/api/conversations.history", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${READ_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel,
      latest: messageTs,
      inclusive: true,
      limit: 1,
    }),
  });

  const histData = (await histRes.json()) as { ok: boolean; messages?: SlackMessage[]; error?: string };

  if (histData.ok && histData.messages?.length && histData.messages[0].ts === messageTs) {
    return histData.messages[0];
  }

  // 2. Not a top-level message — search thread replies
  // Get recent top-level messages that might be the thread parent
  const nearbyRes = await fetch("https://slack.com/api/conversations.history", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${READ_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel,
      latest: messageTs,
      inclusive: true,
      limit: 10,
    }),
  });

  const nearbyData = (await nearbyRes.json()) as { ok: boolean; messages?: (SlackMessage & { reply_count?: number })[] };

  if (nearbyData.ok && nearbyData.messages) {
    for (const msg of nearbyData.messages) {
      if (msg.reply_count && msg.reply_count > 0) {
        const threadRes = await fetch("https://slack.com/api/conversations.replies", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${READ_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channel,
            ts: msg.ts,
            latest: messageTs,
            inclusive: true,
          }),
        });

        const threadData = (await threadRes.json()) as { ok: boolean; messages?: SlackMessage[] };
        if (threadData.ok && threadData.messages) {
          const target = threadData.messages.find((m) => m.ts === messageTs);
          if (target) return target;
        }
      }
    }
  }

  console.error("Slack message not found:", { channel, messageTs });
  return null;
}

/**
 * Get permalink for a Slack message
 */
export async function getMessagePermalink(channel: string, messageTs: string): Promise<string | null> {
  const res = await fetch(`https://slack.com/api/chat.getPermalink?channel=${channel}&message_ts=${messageTs}`, {
    headers: { Authorization: `Bearer ${READ_TOKEN}` },
  });

  const data = (await res.json()) as { ok: boolean; permalink?: string };
  return data.ok ? (data.permalink ?? null) : null;
}

/**
 * Get Slack user's display name
 */
export async function getSlackUserName(userId: string): Promise<string> {
  const res = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
    headers: { Authorization: `Bearer ${READ_TOKEN}` },
  });

  const data = (await res.json()) as { ok: boolean; user?: { profile: SlackUserProfile } };

  if (!data.ok || !data.user) return userId;

  return data.user.profile.display_name || data.user.profile.real_name || userId;
}

/**
 * Post a reply in a Slack thread
 */
export async function postSlackReply(channel: string, threadTs: string, text: string): Promise<boolean> {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN || READ_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel,
      thread_ts: threadTs,
      text,
    }),
  });

  const data = (await res.json()) as { ok: boolean; error?: string };

  if (!data.ok) {
    console.error("Slack chat.postMessage failed:", data.error);
  }

  return data.ok;
}

/**
 * Get channel name from channel ID
 */
export async function getChannelName(channelId: string): Promise<string> {
  const res = await fetch(`https://slack.com/api/conversations.info?channel=${channelId}`, {
    headers: { Authorization: `Bearer ${READ_TOKEN}` },
  });

  const data = (await res.json()) as { ok: boolean; channel?: { name: string } };
  return data.ok ? (data.channel?.name ?? channelId) : channelId;
}

/**
 * Clean Slack message text for use as a task title.
 * Strips mentions, links formatting, etc.
 */
export function cleanMessageText(text: string): string {
  return (
    text
      // <@U1234> → @user
      .replace(/<@[A-Z0-9]+>/g, "")
      // <URL|label> → label
      .replace(/<([^|>]+)\|([^>]+)>/g, "$2")
      // <URL> → URL
      .replace(/<([^>]+)>/g, "$1")
      // Multiple spaces → single
      .replace(/\s+/g, " ")
      .trim()
  );
}
