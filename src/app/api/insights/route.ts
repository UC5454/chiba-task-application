import { NextResponse } from "next/server";

import { getAccessTokenFromSession } from "@/lib/api-auth";
import { generateInsightComment } from "@/lib/gemini";
import { listTasks } from "@/lib/google-tasks";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { Category, Priority } from "@/types";

type CategoryCount = Record<string, number>;
type DailyCompletion = { date: string; count: number };

export type InsightsResponse = {
  totalActive: number;
  totalCompleted: number;
  completionRate: number;
  thisWeekCompleted: number;
  lastWeekCompleted: number;
  weeklyChange: number;
  categoryBreakdown: CategoryCount;
  priorityBreakdown: Record<string, number>;
  dailyCompletions: DailyCompletion[];
  averagePerDay: number;
  aiComment: string | null;
};

export async function GET() {
  const accessToken = await getAccessTokenFromSession();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tasks = await listTasks(accessToken);
    const supabase = getSupabaseAdminClient();

    const googleTaskIds = tasks.map((t) => t.googleTaskId);
    const { data: metadataRows } = await supabase
      .from("task_metadata")
      .select("google_task_id, priority, category")
      .in("google_task_id", googleTaskIds.length > 0 ? googleTaskIds : ["__none__"]);

    const metadataMap = new Map(
      (metadataRows ?? []).map((row: { google_task_id: string; priority: Priority | null; category: Category | null }) => [
        row.google_task_id,
        row,
      ]),
    );

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const thisWeekStart = new Date(todayStart);
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const activeTasks = tasks.filter((t) => !t.completed);
    const completedTasks = tasks.filter((t) => t.completed);

    let thisWeekCompleted = 0;
    let lastWeekCompleted = 0;

    // 過去14日の日別完了数
    const dailyMap = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      dailyMap.set(d.toISOString().split("T")[0], 0);
    }

    for (const task of completedTasks) {
      if (!task.completedAt) continue;
      const completedDate = new Date(task.completedAt);
      const dateKey = completedDate.toISOString().split("T")[0];

      if (dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + 1);
      }

      if (completedDate >= thisWeekStart) {
        thisWeekCompleted++;
      } else if (completedDate >= lastWeekStart && completedDate < thisWeekStart) {
        lastWeekCompleted++;
      }
    }

    // カテゴリ別集計
    const categoryBreakdown: CategoryCount = {};
    const priorityBreakdown: Record<string, number> = { "1": 0, "2": 0, "3": 0 };

    for (const task of activeTasks) {
      const meta = metadataMap.get(task.googleTaskId);
      const cat = meta?.category ?? "未分類";
      categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + 1;

      const pri = String(meta?.priority ?? 2);
      priorityBreakdown[pri] = (priorityBreakdown[pri] ?? 0) + 1;
    }

    const dailyCompletions: DailyCompletion[] = [...dailyMap.entries()].map(([date, count]) => ({ date, count }));

    const daysWithData = dailyCompletions.filter((d) => d.count > 0).length;
    const totalCompletedInRange = dailyCompletions.reduce((sum, d) => sum + d.count, 0);

    const weeklyChange = lastWeekCompleted > 0
      ? Math.round(((thisWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100)
      : thisWeekCompleted > 0
        ? 100
        : 0;

    const insightsData = {
      totalActive: activeTasks.length,
      totalCompleted: completedTasks.length,
      completionRate: activeTasks.length + completedTasks.length > 0
        ? Math.round((completedTasks.length / (activeTasks.length + completedTasks.length)) * 100)
        : 0,
      thisWeekCompleted,
      lastWeekCompleted,
      weeklyChange,
      categoryBreakdown,
      priorityBreakdown,
      dailyCompletions,
      averagePerDay: daysWithData > 0 ? Math.round((totalCompletedInRange / daysWithData) * 10) / 10 : 0,
    };

    // Gemini AIコメント生成（エラーでも止めない）
    const aiComment = await generateInsightComment(insightsData).catch(() => null);

    const insights: InsightsResponse = {
      ...insightsData,
      aiComment,
    };

    return NextResponse.json({ insights });
  } catch (err) {
    console.error("Insights GET error:", err);
    return NextResponse.json({ error: "インサイトの取得に失敗しました" }, { status: 500 });
  }
}
