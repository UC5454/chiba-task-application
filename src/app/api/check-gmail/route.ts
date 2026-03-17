import { NextResponse } from "next/server";

import { getAccessTokenFromRefreshToken } from "@/lib/google-auth";

/**
 * /api/check-gmail
 * Vercel Cronから定期実行される。PCが閉じていても動作する。
 *
 * 処理内容:
 * 1. Gmail APIで未読メール（bot/自動通知を除く）を取得
 * 2. 人間からのメールがあればSlackに通知
 * 3. ローカルのClaude版（check-gmail-cron.sh）の補完的フォールバック
 */

// Vercel Cron / 手動呼び出し時の認証
const isAuthorized = (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const headerSecret = request.headers.get("x-cron-secret");
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  return headerSecret === secret || bearer === secret;
};

// bot/自動通知を除外するフィルタ
const BOT_SENDERS = [
  "noreply", "no-reply", "notification", "notifications",
  "mailer-daemon", "postmaster", "donotreply", "do-not-reply",
  "calendar-notification", "drive-shares-dm-noreply",
];

const BOT_DOMAINS = [
  "github.com", "slack.com", "notion.so", "vercel.com",
  "timerex.net", "socialdog.jp", "peatix.com",
  "google.com", "googlemail.com",
];

interface GmailMessage {
  id: string;
  threadId: string;
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessageDetail {
  id: string;
  payload?: {
    headers?: GmailHeader[];
  };
}

const isBotSender = (from: string): boolean => {
  const lower = from.toLowerCase();
  // メールアドレス部分を抽出
  const emailMatch = lower.match(/<([^>]+)>/);
  const email = emailMatch ? emailMatch[1] : lower;
  const localPart = email.split("@")[0];
  const domain = email.split("@")[1] || "";

  if (BOT_SENDERS.some((bot) => localPart.includes(bot))) return true;
  if (BOT_DOMAINS.some((d) => domain.endsWith(d))) return true;
  return false;
};

const postSlack = async (message: string) => {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return;

  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: message,
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: message },
        },
      ],
    }),
  }).catch(() => {});
};

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = await getAccessTokenFromRefreshToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to obtain access token" },
      { status: 500 },
    );
  }

  try {
    // 未読メールを取得（最大20件）
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?" +
        new URLSearchParams({
          q: "is:unread in:inbox -category:promotions -category:social -category:updates",
          maxResults: "20",
        }),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!listRes.ok) {
      const err = await listRes.text();
      return NextResponse.json(
        { error: "Gmail API error", detail: err },
        { status: listRes.status },
      );
    }

    const listData = (await listRes.json()) as {
      messages?: GmailMessage[];
      resultSizeEstimate?: number;
    };

    const messages = listData.messages ?? [];

    if (messages.length === 0) {
      return NextResponse.json({
        status: "ok",
        totalUnread: 0,
        humanEmails: 0,
        notified: false,
      });
    }

    // 各メールの送信者を取得
    const humanEmails: Array<{ from: string; subject: string }> = [];

    for (const msg of messages.slice(0, 20)) {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?` +
          new URLSearchParams({
            format: "metadata",
            metadataHeaders: "From",
            fields: "id,payload/headers",
          }),
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!detailRes.ok) continue;

      const detail = (await detailRes.json()) as GmailMessageDetail;
      const headers = detail.payload?.headers ?? [];
      const fromHeader = headers.find((h) => h.name.toLowerCase() === "from");
      const from = fromHeader?.value ?? "";

      if (!isBotSender(from)) {
        // 件名も取得
        const subjectRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?` +
            new URLSearchParams({
              format: "metadata",
              metadataHeaders: "Subject",
              fields: "payload/headers",
            }),
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        let subject = "(件名なし)";
        if (subjectRes.ok) {
          const subjectData = (await subjectRes.json()) as GmailMessageDetail;
          const subjectHeader = subjectData.payload?.headers?.find(
            (h) => h.name.toLowerCase() === "subject",
          );
          if (subjectHeader?.value) subject = subjectHeader.value;
        }

        humanEmails.push({ from, subject });
      }
    }

    // 人間からのメールがあればSlackに通知
    if (humanEmails.length > 0) {
      const emailList = humanEmails
        .slice(0, 5)
        .map((e) => `• *${e.from}*\n  ${e.subject}`)
        .join("\n");

      const more =
        humanEmails.length > 5
          ? `\n_...他 ${humanEmails.length - 5} 件_`
          : "";

      await postSlack(
        `:email: *未読メール通知（${humanEmails.length}件）*\n` +
          `PCローカルのGmailチェックが未処理の可能性があります。\n\n` +
          `${emailList}${more}\n\n` +
          `<https://mail.google.com/mail/u/0/#inbox|Gmailを開く>`,
      );

      return NextResponse.json({
        status: "ok",
        totalUnread: messages.length,
        humanEmails: humanEmails.length,
        notified: true,
      });
    }

    return NextResponse.json({
      status: "ok",
      totalUnread: messages.length,
      humanEmails: 0,
      notified: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
