import { NextResponse } from "next/server";

import { getAccessTokenFromSession } from "@/lib/api-auth";
import { createTask, listTasks } from "@/lib/google-tasks";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getJSTDay, isTodayJST, nowJST, todayStartUTC, toJSTDateString } from "@/lib/timezone";
import type { Category, Priority, Task, TaskCreateInput } from "@/types";

type TaskMetadataRow = {
  google_task_id: string;
  priority: Priority | null;
  category: Category | null;
  assigned_ai_employee: string | null;
  estimated_minutes: number | null;
};

const taskMetadataTable = "task_metadata";

const isTodayDate = (date: Date) => isTodayJST(date);

const mergeWithMetadata = (tasks: Task[], metadataRows: TaskMetadataRow[]) => {
  const metadataMap = new Map(metadataRows.map((row) => [row.google_task_id, row]));

  return tasks.map((task) => {
    const metadata = metadataMap.get(task.googleTaskId);

    return {
      ...task,
      priority: metadata?.priority ?? task.priority,
      category: metadata?.category ?? undefined,
      assignedAiEmployee: metadata?.assigned_ai_employee ?? undefined,
      estimatedMinutes: metadata?.estimated_minutes ?? undefined,
    };
  });
};

const filterTasks = (tasks: Task[], filter: string | null) => {
  if (!filter || filter === "all") {
    return tasks;
  }

  if (filter === "completed") {
    return tasks
      .filter((task) => task.completed)
      .sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  if (filter === "today") {
    return tasks.filter((task) => {
      if (task.completed) return false;

      if (!task.dueDate) return true;

      return isTodayDate(new Date(task.dueDate));
    });
  }

  return tasks;
};

export async function GET(request: Request) {
  const accessToken = await getAccessTokenFromSession();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const filter = new URL(request.url).searchParams.get("filter");
    const tasks = await listTasks(accessToken);

    const supabase = getSupabaseAdminClient();
    const { data: metadataRows } = await supabase
      .from(taskMetadataTable)
      .select("google_task_id, priority, category, assigned_ai_employee, estimated_minutes")
      .in(
        "google_task_id",
        tasks.map((task) => task.googleTaskId),
      );

    const now = Date.now();
    const merged = mergeWithMetadata(tasks, (metadataRows as TaskMetadataRow[] | null) ?? []).map((task) => {
      if (!task.dueDate || task.completed) {
        return task;
      }

      const overdueMs = now - new Date(task.dueDate).getTime();
      if (overdueMs <= 0) {
        return task;
      }

      return {
        ...task,
        overduedays: Math.max(1, Math.floor(overdueMs / (1000 * 60 * 60 * 24))),
      };
    });

    const filtered = filterTasks(merged, filter);

    if (filter === "completed") {
      const todayStart = todayStartUTC();
      const todayCount = filtered.filter(
        (t) => t.completedAt && new Date(t.completedAt).getTime() >= todayStart.getTime(),
      ).length;
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - getJSTDay());
      const thisWeekCount = filtered.filter(
        (t) => t.completedAt && new Date(t.completedAt).getTime() >= weekStart.getTime(),
      ).length;
      return NextResponse.json({
        tasks: filtered,
        completionStats: { todayCount, thisWeekCount, totalCount: filtered.length },
      });
    }

    return NextResponse.json({ tasks: filtered });
  } catch (err) {
    console.error("Tasks GET error:", err);
    return NextResponse.json({ error: "タスクの取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const accessToken = await getAccessTokenFromSession();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as TaskCreateInput & {
      listId?: string;
      assignedAiEmployee?: string;
      estimatedMinutes?: number;
    };

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    // 日付をRFC 3339形式に正規化（Google Tasks APIが要求）
    // HTML date input は "YYYY-MM-DD" を返すが、APIは "YYYY-MM-DDT00:00:00.000Z" が必要
    let dueDate: string | undefined;
    if (body.dueDate) {
      dueDate = body.dueDate.includes("T") ? body.dueDate : `${body.dueDate}T00:00:00+09:00`;
    }

    const createdTask = await createTask(accessToken, {
      title: body.title.trim(),
      notes: body.notes,
      dueDate,
      listId: body.listId,
    });

    const supabase = getSupabaseAdminClient();
    await supabase.from(taskMetadataTable).upsert(
      {
        google_task_id: createdTask.googleTaskId,
        priority: body.priority ?? 2,
        category: body.category ?? null,
        assigned_ai_employee: body.assignedAiEmployee ?? null,
        estimated_minutes: body.estimatedMinutes ?? null,
      },
      { onConflict: "google_task_id" },
    );

    return NextResponse.json(
      {
        task: {
          ...createdTask,
          priority: body.priority ?? 2,
          category: body.category,
          assignedAiEmployee: body.assignedAiEmployee,
          estimatedMinutes: body.estimatedMinutes,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Tasks POST error:", err);
    return NextResponse.json({ error: "タスクの作成に失敗しました" }, { status: 500 });
  }
}
