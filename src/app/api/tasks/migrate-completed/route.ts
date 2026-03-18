import { NextResponse } from "next/server";

import { getAccessTokenFromSession } from "@/lib/api-auth";
import { writeTaskHistory } from "@/lib/notion";

interface GoogleTask {
  id: string;
  title: string;
  status: string;
  completed?: string;
  due?: string;
}

interface GoogleTaskList {
  id: string;
  title: string;
}

export async function POST() {
  const accessToken = await getAccessTokenFromSession();
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get all task lists
    const listsRes = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!listsRes.ok) {
      return NextResponse.json({ error: `Task lists fetch failed: ${listsRes.status}` }, { status: 500 });
    }
    const listsData = (await listsRes.json()) as { items?: GoogleTaskList[] };

    // 2. Get completed tasks from all lists
    const allCompleted: Array<{ title: string; completed: string; due?: string }> = [];

    for (const list of listsData.items ?? []) {
      let pageToken: string | undefined;
      do {
        const url = new URL(`https://tasks.googleapis.com/tasks/v1/lists/${list.id}/tasks`);
        url.searchParams.set("showCompleted", "true");
        url.searchParams.set("showHidden", "true");
        url.searchParams.set("maxResults", "100");
        if (pageToken) url.searchParams.set("pageToken", pageToken);

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) break;

        const data = (await res.json()) as { items?: GoogleTask[]; nextPageToken?: string };
        const completed = (data.items ?? []).filter((t) => t.status === "completed" && t.title);
        for (const t of completed) {
          allCompleted.push({
            title: t.title,
            completed: t.completed ?? new Date().toISOString(),
            due: t.due,
          });
        }
        pageToken = data.nextPageToken;
      } while (pageToken);
    }

    // 3. Write to Notion
    let synced = 0;
    let errors = 0;
    for (const task of allCompleted) {
      try {
        await writeTaskHistory(
          {
            id: `migrated-${synced}`,
            title: task.title,
            dueDate: task.due ?? null,
            category: undefined,
          },
          "完了"
        );
        synced++;
      } catch (err) {
        console.error(`Failed to migrate: ${task.title}`, err);
        errors++;
      }
    }

    return NextResponse.json({
      total: allCompleted.length,
      synced,
      errors,
      tasks: allCompleted.map((t) => ({ title: t.title, completed: t.completed.slice(0, 10) })),
    });
  } catch (err) {
    console.error("Migration error:", err);
    return NextResponse.json({ error: "移植に失敗しました" }, { status: 500 });
  }
}
