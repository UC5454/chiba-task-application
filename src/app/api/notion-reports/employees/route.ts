import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DB_ID = process.env.NOTION_DAILY_REPORT_DB_ID;

type NotionPerson = {
  name: string;
  person?: { email: string };
  avatar_url?: string | null;
};

type NotionPage = {
  properties: {
    日付: { date: { start: string } | null };
    提出者: { people: NotionPerson[] };
    部署: { select: { name: string } | null };
  };
};

export type NotionEmployee = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  department: string | null;
  logDates: string[];
};

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!NOTION_API_KEY || !NOTION_DB_ID) {
    return NextResponse.json({ employees: [] });
  }

  try {
    // 過去30日分の日報を取得
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().slice(0, 10);

    const allPages: NotionPage[] = [];
    let cursor: string | undefined;

    do {
      const body: Record<string, unknown> = {
        filter: {
          property: "日付",
          date: { on_or_after: sinceStr },
        },
        sorts: [{ property: "日付", direction: "descending" }],
        page_size: 100,
      };
      if (cursor) body.start_cursor = cursor;

      const res = await fetch(
        `https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NOTION_API_KEY}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) break;

      const data = (await res.json()) as {
        results: NotionPage[];
        has_more: boolean;
        next_cursor: string | null;
      };
      allPages.push(...data.results);
      cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
    } while (cursor);

    // 社員ごとにグルーピング
    const employeeMap = new Map<
      string,
      { name: string; email: string; avatarUrl: string | null; department: string | null; dates: Set<string> }
    >();

    for (const page of allPages) {
      const person = page.properties.提出者?.people?.[0];
      if (!person?.person?.email) continue;

      const email = person.person.email;
      const dateStr = page.properties.日付?.date?.start;
      if (!dateStr) continue;

      const existing = employeeMap.get(email);
      if (existing) {
        existing.dates.add(dateStr);
        if (!existing.department && page.properties.部署?.select?.name) {
          existing.department = page.properties.部署.select.name;
        }
      } else {
        employeeMap.set(email, {
          name: person.name,
          email,
          avatarUrl: person.avatar_url ?? null,
          department: page.properties.部署?.select?.name ?? null,
          dates: new Set([dateStr]),
        });
      }
    }

    const employees: NotionEmployee[] = [...employeeMap.values()]
      .map((e) => ({
        id: `dg:${e.email}`,
        name: e.name,
        email: e.email,
        avatarUrl: e.avatarUrl,
        department: e.department,
        logDates: [...e.dates].sort((a, b) => b.localeCompare(a)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));

    return NextResponse.json(
      { employees },
      { headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=300" } },
    );
  } catch (err) {
    console.error("Notion employees error:", err);
    return NextResponse.json({ employees: [] });
  }
}
