import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";
import { createMemo, listMemos } from "@/lib/notion";
import type { MemoCreateInput } from "@/types";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NOTION_API_KEY) {
    return NextResponse.json({ notes: [] });
  }

  try {
    const url = new URL(request.url);
    const tag = url.searchParams.get("tag") ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;
    const taskId = url.searchParams.get("taskId") ?? undefined;

    const notes = await listMemos(tag, search, taskId);

    return NextResponse.json({ notes });
  } catch (err) {
    console.error("Notes GET error:", err);
    return NextResponse.json({ notes: [] });
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NOTION_API_KEY) {
    return NextResponse.json({ error: "Notion APIが設定されていません" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as MemoCreateInput & { relatedTaskTitle?: string };
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const note = await createMemo(body.content.trim(), body.tags ?? [], body.relatedTaskId ? { id: body.relatedTaskId, title: body.relatedTaskTitle } : undefined);

    if (!note) {
      return NextResponse.json({ error: "Notion is not configured" }, { status: 503 });
    }

    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    console.error("Notes POST error:", err);
    return NextResponse.json({ error: "メモの保存に失敗しました" }, { status: 500 });
  }
}
