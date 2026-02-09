import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";
import { createMemo, listMemos } from "@/lib/notion";
import type { MemoCreateInput } from "@/types";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const tag = url.searchParams.get("tag") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;

  const notes = await listMemos(tag, search);

  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as MemoCreateInput & { relatedTaskTitle?: string };
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const note = await createMemo(body.content.trim(), body.tags ?? [], body.relatedTaskId ? { id: body.relatedTaskId, title: body.relatedTaskTitle } : undefined);

  if (!note) {
    return NextResponse.json({ error: "Notion is not configured" }, { status: 503 });
  }

  return NextResponse.json({ note }, { status: 201 });
}
