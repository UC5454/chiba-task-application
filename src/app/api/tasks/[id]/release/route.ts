import { NextResponse } from "next/server";

import { getAccessTokenFromSession } from "@/lib/api-auth";
import { updateGamificationOnRelease } from "@/lib/gamification";
import { deleteTask, getTaskById } from "@/lib/google-tasks";
import { writeTaskHistory } from "@/lib/notion";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = await getAccessTokenFromSession();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const task = await getTaskById(accessToken, id);
  await writeTaskHistory(task, "手放し");
  await updateGamificationOnRelease();
  await deleteTask(accessToken, id);

  return NextResponse.json({ success: true });
}
