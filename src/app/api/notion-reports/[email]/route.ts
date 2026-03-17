import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DB_ID = process.env.NOTION_DAILY_REPORT_DB_ID;

type NotionRichText = {
  plain_text: string;
};

type NotionBlock = {
  type: string;
  [key: string]: unknown;
};

type NotionPage = {
  id: string;
  properties: {
    本日意識したゴリラマインド: { select: { name: string } | null };
  };
  url: string;
};

const blocksToMarkdown = (blocks: NotionBlock[]): string => {
  const lines: string[] = [];
  for (const block of blocks) {
    const type = block.type;
    const data = block[type] as { rich_text?: NotionRichText[] } | undefined;
    const text = data?.rich_text?.map((t) => t.plain_text).join("") ?? "";

    switch (type) {
      case "heading_1":
        lines.push(`# ${text}`);
        break;
      case "heading_2":
        lines.push(`\n## ${text}`);
        break;
      case "heading_3":
        lines.push(`### ${text}`);
        break;
      case "bulleted_list_item":
        lines.push(`- ${text}`);
        break;
      case "numbered_list_item":
        lines.push(`1. ${text}`);
        break;
      case "paragraph":
        lines.push(text || "");
        break;
      case "to_do": {
        const checked = (block[type] as { checked?: boolean })?.checked;
        lines.push(`- [${checked ? "x" : " "}] ${text}`);
        break;
      }
      default:
        if (text) lines.push(text);
    }
  }
  return lines.join("\n").trim();
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> },
) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!NOTION_API_KEY || !NOTION_DB_ID) {
    return NextResponse.json({ error: "Notion未設定" }, { status: 500 });
  }

  const { email } = await params;
  const decodedEmail = decodeURIComponent(email);
  const { toJSTDateString } = await import("@/lib/timezone");
  const date = request.nextUrl.searchParams.get("date") ?? toJSTDateString(new Date());

  try {
    // 指定日の全日報を取得して、メールでフィルタ
    const queryRes = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filter: {
            property: "日付",
            date: { equals: date },
          },
        }),
      },
    );

    if (!queryRes.ok) {
      return NextResponse.json({ dailyLog: null, gorillaMind: null, notionUrl: null });
    }

    const queryData = (await queryRes.json()) as {
      results: Array<NotionPage & {
        properties: {
          提出者: { people: Array<{ person?: { email: string } }> };
          本日意識したゴリラマインド: { select: { name: string } | null };
        };
      }>;
    };

    // メールアドレスでマッチ
    const page = queryData.results.find(
      (p) => p.properties.提出者?.people?.[0]?.person?.email === decodedEmail,
    );

    if (!page) {
      return NextResponse.json({ dailyLog: null, gorillaMind: null, notionUrl: null });
    }

    // ブロック取得
    const blocksRes = await fetch(
      `https://api.notion.com/v1/blocks/${page.id}/children?page_size=100`,
      {
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
        },
      },
    );

    let dailyLog = "";
    if (blocksRes.ok) {
      const blocksData = (await blocksRes.json()) as { results: NotionBlock[] };
      dailyLog = blocksToMarkdown(blocksData.results);
    }

    return NextResponse.json(
      {
        dailyLog: dailyLog || null,
        gorillaMind: page.properties.本日意識したゴリラマインド?.select?.name ?? null,
        notionUrl: page.url,
      },
      { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=300" } },
    );
  } catch (err) {
    console.error("Notion employee detail error:", err);
    return NextResponse.json({ dailyLog: null, gorillaMind: null, notionUrl: null });
  }
}
