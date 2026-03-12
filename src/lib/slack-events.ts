/**
 * Slack Events API helper for reaction-based task creation.
 *
 * When a user adds a specific emoji reaction (default: :task:) to a Slack message,
 * this module fetches the message text and creates a task in Google Tasks + Supabase.
 */

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN ?? "";

type SlackMessage = {
  text: string;
  user: string;
  ts: string;
  channel: string;
  permalink?: string;
};

type SlackUserProfile = {
  real_name?: string;
  display_name?: string;
};

/**
 * Fetch a single message from Slack using conversations.history
 */
export async function getSlackMessage(channel: string, messageTs: string): Promise<SlackMessage | null> {
  const res = await fetch("https://slack.com/api/conversations.history", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel,
      latest: messageTs,
      inclusive: true,
      limit: 1,
    }),
  });

  const data = (await res.json()) as { ok: boolean; messages?: SlackMessage[]; error?: string };

  if (!data.ok || !data.messages?.length) {
    console.error("Slack conversations.history failed:", data.error);
    return null;
  }

  return data.messages[0];
}

/**
 * Get permalink for a Slack message
 */
export async function getMessagePermalink(channel: string, messageTs: string): Promise<string | null> {
  const res = await fetch(`https://slack.com/api/chat.getPermalink?channel=${channel}&message_ts=${messageTs}`, {
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
  });

  const data = (await res.json()) as { ok: boolean; permalink?: string };
  return data.ok ? (data.permalink ?? null) : null;
}

/**
 * Get Slack user's display name
 */
export async function getSlackUserName(userId: string): Promise<string> {
  const res = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
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
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
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
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
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
