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

  try {
    const task = await getTaskById(accessToken, id);
    await writeTaskHistory(task, "手放し").catch((err) => console.warn("writeTaskHistory failed:", err));
    await updateGamificationOnRelease().catch((err) => console.warn("updateGamification failed:", err));
    await deleteTask(accessToken, id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Task release error:", err);
    return NextResponse.json({ error: "タスクの手放しに失敗しました" }, { status: 500 });
  }
}
