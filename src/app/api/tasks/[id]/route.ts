import { NextResponse } from "next/server";

import { getAccessTokenFromSession } from "@/lib/api-auth";
import { deleteTask, updateTask } from "@/lib/google-tasks";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { Category, Priority } from "@/types";

const taskMetadataTable = "task_metadata";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = await getAccessTokenFromSession();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = (await request.json()) as {
      title?: string;
      notes?: string;
      dueDate?: string;
      priority?: Priority;
      category?: Category;
      assignedAiEmployee?: string;
      estimatedMinutes?: number;
    };

    const task = await updateTask(accessToken, id, {
      title: body.title,
      notes: body.notes,
      dueDate: body.dueDate,
    });

    const supabase = getSupabaseAdminClient();
    await supabase.from(taskMetadataTable).upsert(
      {
        google_task_id: task.googleTaskId,
        priority: body.priority ?? task.priority,
        category: body.category ?? null,
        assigned_ai_employee: body.assignedAiEmployee ?? null,
        estimated_minutes: body.estimatedMinutes ?? null,
      },
      { onConflict: "google_task_id" },
    );

    return NextResponse.json({
      task: {
        ...task,
        priority: body.priority ?? task.priority,
        category: body.category,
        assignedAiEmployee: body.assignedAiEmployee,
        estimatedMinutes: body.estimatedMinutes,
      },
    });
  } catch (err) {
    console.error("Task PUT error:", err);
    return NextResponse.json({ error: "タスクの更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = await getAccessTokenFromSession();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteTask(accessToken, id);

    const googleTaskId = id.includes(":") ? id.split(":")[1] : id;
    const supabase = getSupabaseAdminClient();
    await supabase.from(taskMetadataTable).delete().eq("google_task_id", googleTaskId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Task DELETE error:", err);
    return NextResponse.json({ error: "タスクの削除に失敗しました" }, { status: 500 });
  }
}
