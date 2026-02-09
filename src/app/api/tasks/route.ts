import { NextResponse } from "next/server";

import { getAccessTokenFromSession } from "@/lib/api-auth";
import { createTask, listTasks } from "@/lib/google-tasks";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { Category, Priority, Task, TaskCreateInput } from "@/types";

type TaskMetadataRow = {
  google_task_id: string;
  priority: Priority | null;
  category: Category | null;
  assigned_ai_employee: string | null;
  estimated_minutes: number | null;
};

const taskMetadataTable = "task_metadata";

const isTodayDate = (date: Date) => {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};

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
    return tasks.filter((task) => task.completed);
  }

  if (filter === "today") {
    return tasks.filter((task) => {
      if (!task.dueDate) {
        return !task.completed;
      }

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

  return NextResponse.json({ tasks: filterTasks(merged, filter) });
}

export async function POST(request: Request) {
  const accessToken = await getAccessTokenFromSession();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as TaskCreateInput & {
    listId?: string;
    assignedAiEmployee?: string;
    estimatedMinutes?: number;
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const dueDate = body.dueDate ?? new Date().toISOString();
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
}
