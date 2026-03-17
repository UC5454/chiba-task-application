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
  console.log("[slack-events] getSlackMessage start", { channel, messageTs });

  try {
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
      console.log("[slack-events] getSlackMessage found via history", { channel, messageTs });
      return histData.messages[0];
    }

    if (!histData.ok) {
      console.error("[slack-events] conversations.history failed", { channel, messageTs, error: histData.error });
    }
  } catch (error) {
    console.error("[slack-events] conversations.history threw", { channel, messageTs, error });
  }

  try {
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

    const nearbyData = (await nearbyRes.json()) as { ok: boolean; messages?: (SlackMessage & { reply_count?: number })[]; error?: string };

    if (nearbyData.ok && nearbyData.messages) {
      for (const msg of nearbyData.messages) {
        if (msg.reply_count && msg.reply_count > 0) {
          try {
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

            const threadData = (await threadRes.json()) as { ok: boolean; messages?: SlackMessage[]; error?: string };
            if (threadData.ok && threadData.messages) {
              const target = threadData.messages.find((m) => m.ts === messageTs);
              if (target) {
                console.log("[slack-events] getSlackMessage found via replies", {
                  channel,
                  messageTs,
                  parentTs: msg.ts,
                });
                return target;
              }
            } else if (!threadData.ok) {
              console.error("[slack-events] conversations.replies failed", {
                channel,
                messageTs,
                parentTs: msg.ts,
                error: threadData.error,
              });
            }
          } catch (error) {
            console.error("[slack-events] conversations.replies threw", {
              channel,
              messageTs,
              parentTs: msg.ts,
              error,
            });
          }
        }
      }
    } else if (!nearbyData.ok) {
      console.error("[slack-events] nearby conversations.history failed", { channel, messageTs, error: nearbyData.error });
    }
  } catch (error) {
    console.error("[slack-events] nearby conversations.history threw", { channel, messageTs, error });
  }

  console.error("[slack-events] message not found", { channel, messageTs });
  return null;
}

/**
 * Get permalink for a Slack message
 */
export async function getMessagePermalink(channel: string, messageTs: string): Promise<string | null> {
  try {
    const res = await fetch(`https://slack.com/api/chat.getPermalink?channel=${channel}&message_ts=${messageTs}`, {
      headers: { Authorization: `Bearer ${READ_TOKEN}` },
    });

    const data = (await res.json()) as { ok: boolean; permalink?: string; error?: string };
    if (!data.ok) {
      console.error("[slack-events] chat.getPermalink failed", { channel, messageTs, error: data.error });
      return null;
    }

    return data.permalink ?? null;
  } catch (error) {
    console.error("[slack-events] chat.getPermalink threw", { channel, messageTs, error });
    return null;
  }
}

/**
 * Get Slack user's display name
 */
export async function getSlackUserName(userId: string): Promise<string> {
  try {
    const res = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: { Authorization: `Bearer ${READ_TOKEN}` },
    });

    const data = (await res.json()) as { ok: boolean; user?: { profile: SlackUserProfile }; error?: string };

    if (!data.ok || !data.user) {
      console.error("[slack-events] users.info failed", { userId, error: data.error });
      return userId;
    }

    return data.user.profile.display_name || data.user.profile.real_name || userId;
  } catch (error) {
    console.error("[slack-events] users.info threw", { userId, error });
    return userId;
  }
}

/**
 * Post a reply in a Slack thread
 */
export async function postSlackReply(channel: string, threadTs: string, text: string): Promise<boolean> {
  try {
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
      console.error("[slack-events] chat.postMessage failed", { channel, threadTs, error: data.error });
    } else {
      console.log("[slack-events] chat.postMessage succeeded", { channel, threadTs });
    }

    return data.ok;
  } catch (error) {
    console.error("[slack-events] chat.postMessage threw", { channel, threadTs, error });
    return false;
  }
}

/**
 * Get channel name from channel ID
 */
export async function getChannelName(channelId: string): Promise<string> {
  try {
    const res = await fetch(`https://slack.com/api/conversations.info?channel=${channelId}`, {
      headers: { Authorization: `Bearer ${READ_TOKEN}` },
    });

    const data = (await res.json()) as { ok: boolean; channel?: { name: string }; error?: string };
    if (!data.ok) {
      console.error("[slack-events] conversations.info failed", { channelId, error: data.error });
      return channelId;
    }

    return data.channel?.name ?? channelId;
  } catch (error) {
    console.error("[slack-events] conversations.info threw", { channelId, error });
    return channelId;
  }
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
