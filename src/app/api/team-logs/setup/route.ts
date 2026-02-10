import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";

// POST: Notion に AI社員日報データベースを作成するセットアップ用
// 一度だけ実行し、返されたDB IDをNOTION_DAILY_LOG_DB_IDにセットする
export async function POST() {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notionToken = process.env.NOTION_API_KEY;
  if (!notionToken) {
    return NextResponse.json({ error: "NOTION_API_KEY not configured" }, { status: 500 });
  }

  const parentPageId = process.env.NOTION_PARENT_PAGE_ID;
  if (!parentPageId) {
    return NextResponse.json({ error: "NOTION_PARENT_PAGE_ID not configured. Set it to the Notion page where the DB should be created." }, { status: 500 });
  }

  try {
    const notion = new Client({ auth: notionToken });

    // 新しい Notion API (dataSources) と旧API (databases) の両方に対応
    const createFn = (notion as unknown as {
      databases?: { create?: (args: Record<string, unknown>) => Promise<{ id: string }> };
      dataSources?: { create?: (args: Record<string, unknown>) => Promise<{ id: string }> };
    });

    const create = createFn.databases?.create ?? createFn.dataSources?.create;
    if (!create) {
      return NextResponse.json({ error: "Notion client does not support database creation" }, { status: 500 });
    }

    const db = await create({
      parent: { type: "page_id", page_id: parentPageId },
      icon: { type: "emoji", emoji: "📋" },
      title: [{ type: "text", text: { content: "AI社員日報" } }],
      properties: {
        Title: { title: {} },
        Date: { date: {} },
        Employee: {
          select: {
            options: [
              { name: "リン", color: "red" },
              { name: "ミナト", color: "blue" },
              { name: "ミナミ", color: "pink" },
              { name: "コトハ", color: "purple" },
              { name: "ツムギ", color: "orange" },
              { name: "ソラ", color: "yellow" },
              { name: "レン", color: "green" },
              { name: "ソウ", color: "blue" },
              { name: "ナギ", color: "pink" },
              { name: "ユウ", color: "purple" },
              { name: "カイト", color: "gray" },
              { name: "ツカサ", color: "brown" },
              { name: "ショウ", color: "orange" },
              { name: "ヒナ", color: "yellow" },
              { name: "ヒカル", color: "green" },
              { name: "カナデ", color: "red" },
            ],
          },
        },
        Team: {
          select: {
            options: [
              { name: "executive", color: "red" },
              { name: "coach", color: "blue" },
              { name: "secretary", color: "pink" },
              { name: "note-team", color: "purple" },
              { name: "web-team", color: "orange" },
              { name: "prompt-team", color: "yellow" },
              { name: "slides-team", color: "green" },
              { name: "video-team", color: "gray" },
            ],
          },
        },
      },
    });

    return NextResponse.json({
      message: "Database created successfully",
      databaseId: db.id,
      instruction: `Set NOTION_DAILY_LOG_DB_ID=${db.id} in your environment variables`,
    });
  } catch (err) {
    console.error("Setup error:", err);
    return NextResponse.json({ error: "Failed to create database" }, { status: 500 });
  }
}
