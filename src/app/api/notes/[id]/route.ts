import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";
import { deleteMemo, updateMemo } from "@/lib/notion";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NOTION_API_KEY) {
    return NextResponse.json({ error: "Notion APIが設定されていません" }, { status: 503 });
  }

  const { id } = await params;

  try {
    const body = (await request.json()) as {
      content?: string;
      tags?: string[];
      relatedTaskId?: string;
      relatedTaskTitle?: string;
    };

    await updateMemo(id, {
      content: body.content,
      tags: body.tags,
      relatedTaskId: body.relatedTaskId,
      relatedTaskTitle: body.relatedTaskTitle,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Note PUT error:", err);
    return NextResponse.json({ error: "メモの更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NOTION_API_KEY) {
    return NextResponse.json({ error: "Notion APIが設定されていません" }, { status: 503 });
  }

  const { id } = await params;

  try {
    await deleteMemo(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Note DELETE error:", err);
    return NextResponse.json({ error: "メモの削除に失敗しました" }, { status: 500 });
  }
}
