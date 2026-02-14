import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DS_ID = process.env.NOTION_DAILY_REPORT_DS_ID;

type NotionRichText = {
  plain_text: string;
  annotations?: { bold?: boolean };
};

type NotionBlock = {
  type: string;
  [key: string]: unknown;
};

type NotionPerson = {
  name: string;
  person?: { email: string };
  avatar_url?: string | null;
};

type NotionPage = {
  id: string;
  properties: {
    日報: { title: Array<{ plain_text: string }> };
    日付: { date: { start: string } | null };
    提出者: { people: NotionPerson[] };
    部署: { select: { name: string; color: string } | null };
    本日意識したゴリラマインド: { select: { name: string } | null };
  };
  url: string;
};

export type NotionDailyReport = {
  id: string;
  date: string;
  submitter: string;
  email: string;
  avatarUrl: string | null;
  department: string | null;
  gorillaMind: string | null;
  content: string;
  notionUrl: string;
};

const notionFetch = async (url: string, body?: unknown) => {
  const options: RequestInit = {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
  };
  if (body) options.body = JSON.stringify(body);
  return fetch(url, options);
};

/** ブロック配列をMarkdown風テキストに変換 */
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

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!NOTION_API_KEY || !NOTION_DS_ID) {
    return NextResponse.json({ error: "Notion未設定" }, { status: 500 });
  }

  const date = request.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  try {
    // 日付でフィルターしてクエリ
    const queryRes = await notionFetch(
      `https://api.notion.com/v1/databases/${process.env.NOTION_DAILY_REPORT_DB_ID}/query`,
      {
        filter: {
          property: "日付",
          date: { equals: date },
        },
        sorts: [{ property: "提出者", direction: "ascending" }],
      },
    );

    if (!queryRes.ok) {
      console.error("Notion query error:", queryRes.status);
      return NextResponse.json({ reports: [] });
    }

    const queryData = (await queryRes.json()) as { results: NotionPage[] };
    const pages = queryData.results;

    // 各ページのブロックを並列取得
    const reports: NotionDailyReport[] = await Promise.all(
      pages.map(async (page) => {
        const blocksRes = await notionFetch(
          `https://api.notion.com/v1/blocks/${page.id}/children?page_size=100`,
        );
        let content = "";
        if (blocksRes.ok) {
          const blocksData = (await blocksRes.json()) as { results: NotionBlock[] };
          content = blocksToMarkdown(blocksData.results);
        }

        const submitter = page.properties.提出者.people[0];
        return {
          id: page.id,
          date,
          submitter: submitter?.name ?? "不明",
          email: submitter?.person?.email ?? "",
          avatarUrl: submitter?.avatar_url ?? null,
          department: page.properties.部署?.select?.name ?? null,
          gorillaMind: page.properties.本日意識したゴリラマインド?.select?.name ?? null,
          content,
          notionUrl: page.url,
        };
      }),
    );

    return NextResponse.json(
      { reports, date },
      { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=300" } },
    );
  } catch (err) {
    console.error("Notion reports error:", err);
    return NextResponse.json({ reports: [] });
  }
}
