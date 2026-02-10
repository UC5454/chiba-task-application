import { NextResponse } from "next/server";

import { getAccessTokenFromSession } from "@/lib/api-auth";
import { updateGamificationOnComplete } from "@/lib/gamification";
import { completeTask, getTaskById, listTasks } from "@/lib/google-tasks";
import { writeTaskHistory } from "@/lib/notion";

const isToday = (date: Date) => {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = await getAccessTokenFromSession();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const task = await getTaskById(accessToken, id);
    await completeTask(accessToken, id);
    await writeTaskHistory(task, "完了").catch((err) => console.warn("writeTaskHistory failed:", err));

    const tasks = await listTasks(accessToken);
    const remainingTodayTasks = tasks.filter((item) => !item.completed && item.dueDate && isToday(new Date(item.dueDate))).length;
    const remainingOverdueTasks = tasks.filter((item) => !item.completed && item.dueDate && new Date(item.dueDate).getTime() < Date.now()).length;

    await updateGamificationOnComplete({
      completedAt: new Date(),
      remainingTodayTasks,
      remainingOverdueTasks,
    }).catch((err) => console.warn("updateGamification failed:", err));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Task complete error:", err);
    return NextResponse.json({ error: "タスクの完了に失敗しました" }, { status: 500 });
  }
}
