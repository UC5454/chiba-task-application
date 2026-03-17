import { Client } from "@notionhq/client";

import type { DailyLog, Memo, MemoCreateInput, Task } from "@/types";

const notionToken = process.env.NOTION_API_KEY;
const memoDatabaseId = process.env.NOTION_MEMO_DB_ID;
const taskHistoryDatabaseId = process.env.NOTION_TASK_HISTORY_DB_ID;
const dailyLogDatabaseId = process.env.NOTION_DAILY_LOG_DB_ID;

type MemoUpdateInput = {
  content?: string;
  tags?: string[];
  relatedTaskId?: string;
  relatedTaskTitle?: string;
};

const getNotionClient = () => {
  if (!notionToken) {
    return null;
  }

  return new Client({ auth: notionToken });
};

const toRichText = (content: string) => [{ text: { content } }];

const readPlainText = (value: unknown): string | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const text = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return "";
      }

      const plainText = (item as { plain_text?: string }).plain_text;
      return typeof plainText === "string" ? plainText : "";
    })
    .join("");

  return text || undefined;
};

const pageToMemo = (page: { id: string; created_time: string; properties: Record<string, unknown> }): Memo => {
  const contentProperty = page.properties.Content as { title?: unknown } | undefined;
  const tagsProperty = page.properties.Tags as { multi_select?: Array<{ name?: string }> } | undefined;
  const relatedTaskIdProperty = page.properties.RelatedTaskId as { rich_text?: unknown } | undefined;
  const relatedTaskTitleProperty = page.properties.RelatedTaskTitle as { rich_text?: unknown } | undefined;

  return {
    id: page.id,
    notionPageId: page.id,
    content: readPlainText(contentProperty?.title) ?? "",
    tags: (tagsProperty?.multi_select ?? []).map((item) => item.name ?? "").filter(Boolean),
    relatedTaskId: readPlainText(relatedTaskIdProperty?.rich_text),
    relatedTaskTitle: readPlainText(relatedTaskTitleProperty?.rich_text),
    createdAt: page.created_time,
  };
};

const ensureMemoDependencies = () => {
  const notion = getNotionClient();
  if (!notion || !memoDatabaseId) {
    return null;
  }

  return { notion, memoDatabaseId };
};

export const createMemo = async (content: string, tags: string[] = [], relatedTask?: { id: string; title?: string }): Promise<Memo | null> => {
  const deps = ensureMemoDependencies();
  if (!deps) {
    return null;
  }

  const created = await deps.notion.pages.create({
    parent: { database_id: deps.memoDatabaseId },
    properties: {
      Content: { title: toRichText(content) },
      Tags: { multi_select: tags.map((tag) => ({ name: tag })) },
      RelatedTaskId: { rich_text: relatedTask?.id ? toRichText(relatedTask.id) : [] },
      RelatedTaskTitle: { rich_text: relatedTask?.title ? toRichText(relatedTask.title) : [] },
    },
  });

  return {
    id: created.id,
    notionPageId: created.id,
    content,
    tags,
    relatedTaskId: relatedTask?.id,
    relatedTaskTitle: relatedTask?.title,
    createdAt: (created as { created_time?: string }).created_time ?? new Date().toISOString(),
  };
};

export const listMemos = async (tag?: string, search?: string, taskId?: string): Promise<Memo[]> => {
  if (!notionToken || !memoDatabaseId) {
    return [];
  }

  const filters: Array<Record<string, unknown>> = [];

  if (tag) {
    filters.push({ property: "Tags", multi_select: { contains: tag } });
  }

  if (search) {
    filters.push({ property: "Content", title: { contains: search } });
  }

  if (taskId) {
    filters.push({ property: "RelatedTaskId", rich_text: { equals: taskId } });
  }

  const body: Record<string, unknown> = {
    sorts: [{ timestamp: "created_time", direction: "descending" }],
    page_size: 100,
  };

  if (filters.length === 1) {
    body.filter = filters[0];
  } else if (filters.length > 1) {
    body.filter = { and: filters };
  }

  const res = await fetch(`https://api.notion.com/v1/databases/${memoDatabaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("Notion listMemos failed:", res.status, await res.text().catch(() => ""));
    return [];
  }

  const data = (await res.json()) as { results: unknown[] };

  return data.results
    .filter((result: unknown): result is { id: string; created_time: string; properties: Record<string, unknown> } =>
      Boolean(result && typeof result === "object" && "properties" in result),
    )
    .map(pageToMemo);
};

export const updateMemo = async (pageId: string, updates: MemoUpdateInput): Promise<void> => {
  const deps = ensureMemoDependencies();
  if (!deps) {
    return;
  }

  await deps.notion.pages.update({
    page_id: pageId,
    properties: {
      ...(updates.content !== undefined ? { Content: { title: toRichText(updates.content) } } : {}),
      ...(updates.tags !== undefined ? { Tags: { multi_select: updates.tags.map((tag) => ({ name: tag })) } } : {}),
      ...(updates.relatedTaskId !== undefined
        ? { RelatedTaskId: { rich_text: updates.relatedTaskId ? toRichText(updates.relatedTaskId) : [] } }
        : {}),
      ...(updates.relatedTaskTitle !== undefined
        ? { RelatedTaskTitle: { rich_text: updates.relatedTaskTitle ? toRichText(updates.relatedTaskTitle) : [] } }
        : {}),
    },
  });
};

export const deleteMemo = async (pageId: string): Promise<void> => {
  const deps = ensureMemoDependencies();
  if (!deps) {
    return;
  }

  await deps.notion.pages.update({
    page_id: pageId,
    archived: true,
  });
};

export const writeTaskHistory = async (task: Pick<Task, "id" | "title" | "dueDate" | "category">, status: "完了" | "手放し") => {
  const notion = getNotionClient();
  if (!notion || !taskHistoryDatabaseId) {
    return;
  }

  await notion.pages.create({
    parent: { database_id: taskHistoryDatabaseId },
    properties: {
      TaskId: { title: toRichText(task.id) },
      TaskTitle: { rich_text: toRichText(task.title) },
      Status: { select: { name: status } },
      CompletedAt: { date: { start: new Date().toISOString() } },
      DueDate: task.dueDate ? { date: { start: task.dueDate } } : { date: null },
      Category: task.category ? { select: { name: task.category } } : { select: null },
    },
  });
};

export const createMemoFromInput = async (input: MemoCreateInput) =>
  createMemo(
    input.content,
    input.tags ?? [],
    input.relatedTaskId
      ? {
          id: input.relatedTaskId,
        }
      : undefined,
  );

// --- AI社員日報 Notion同期 ---

const markdownToBlocks = (markdown: string) => {
  const lines = markdown.split("\n");
  const blocks: Array<Record<string, unknown>> = [];

  for (const line of lines) {
    const trimmed = line.trimEnd();

    if (trimmed.startsWith("# ")) {
      blocks.push({ object: "block", type: "heading_1", heading_1: { rich_text: toRichText(trimmed.slice(2)) } });
    } else if (trimmed.startsWith("## ")) {
      blocks.push({ object: "block", type: "heading_2", heading_2: { rich_text: toRichText(trimmed.slice(3)) } });
    } else if (trimmed.startsWith("### ")) {
      blocks.push({ object: "block", type: "heading_3", heading_3: { rich_text: toRichText(trimmed.slice(4)) } });
    } else if (trimmed.startsWith("- [ ] ")) {
      blocks.push({ object: "block", type: "to_do", to_do: { rich_text: toRichText(trimmed.slice(6)), checked: false } });
    } else if (trimmed.startsWith("- [x] ") || trimmed.startsWith("- [X] ")) {
      blocks.push({ object: "block", type: "to_do", to_do: { rich_text: toRichText(trimmed.slice(6)), checked: true } });
    } else if (trimmed.startsWith("- ")) {
      blocks.push({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: toRichText(trimmed.slice(2)) } });
    } else if (trimmed === "---") {
      blocks.push({ object: "block", type: "divider", divider: {} });
    } else if (trimmed) {
      blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: toRichText(trimmed) } });
    }
  }

  return blocks;
};

export const syncDailyLogToNotion = async (log: DailyLog): Promise<string | null> => {
  const notion = getNotionClient();
  if (!notion || !dailyLogDatabaseId) return null;

  // Notion APIのrich_textは2000文字制限があるため、ブロックに分割して本文を書き込む
  const blocks = markdownToBlocks(log.content);

  // Notion pages.create でDBに新規ページ作成（childrenは100ブロック制限）
  const created = await notion.pages.create({
    parent: { database_id: dailyLogDatabaseId },
    properties: {
      Name: { title: toRichText(`${log.date} ${log.employeeName}`) },
      Date: { date: { start: log.date } },
      Employee: { select: { name: log.employeeName } },
      Team: { select: { name: log.team } },
    },
    children: blocks.slice(0, 100) as Parameters<typeof notion.pages.create>[0]["children"],
  });

  return created.id;
};

export const syncDailyLogsToNotion = async (logs: DailyLog[]): Promise<{ synced: number; errors: number; errorDetails?: string[] }> => {
  let synced = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  for (const log of logs) {
    try {
      await syncDailyLogToNotion(log);
      synced++;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Failed to sync daily log for ${log.employeeName} on ${log.date}:`, error);
      errorDetails.push(`${log.employeeName}: ${msg}`);
      errors++;
    }
  }

  return { synced, errors, ...(errorDetails.length > 0 ? { errorDetails } : {}) };
};
