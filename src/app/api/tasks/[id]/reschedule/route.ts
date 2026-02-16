import { NextResponse } from "next/server";

import { getAccessTokenFromSession } from "@/lib/api-auth";
import { updateTask } from "@/lib/google-tasks";

const toDateByPreset = (preset: string) => {
  // JST基準で日付を計算
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const base = new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate()));

  if (preset === "today") {
    base.setUTCHours(23, 59, 59, 0);
    return base.toISOString();
  }

  if (preset === "tomorrow") {
    base.setUTCDate(base.getUTCDate() + 1);
    base.setUTCHours(23, 59, 59, 0);
    return base.toISOString();
  }

  if (preset === "this_week") {
    const day = jstNow.getUTCDay();
    const diffToSunday = (7 - day) % 7;
    base.setUTCDate(base.getUTCDate() + diffToSunday);
    base.setUTCHours(23, 59, 59, 0);
    return base.toISOString();
  }

  const customDate = new Date(preset);
  if (Number.isNaN(customDate.getTime())) {
    throw new Error("Invalid newDueDate value");
  }

  return customDate.toISOString();
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = await getAccessTokenFromSession();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = (await request.json()) as { newDueDate?: string };

    if (!body.newDueDate) {
      return NextResponse.json({ error: "newDueDate is required" }, { status: 400 });
    }

    const dueDate = toDateByPreset(body.newDueDate);
    const task = await updateTask(accessToken, id, { dueDate });

    return NextResponse.json({ task });
  } catch (err) {
    console.error("Task reschedule error:", err);
    return NextResponse.json({ error: "タスクのリスケジュールに失敗しました" }, { status: 500 });
  }
}
