import { Client } from "@notionhq/client";

import type { Memo, MemoCreateInput, Task } from "@/types";

const notionToken = process.env.NOTION_API_KEY;
const memoDatabaseId = process.env.NOTION_MEMO_DB_ID;
const taskHistoryDatabaseId = process.env.NOTION_TASK_HISTORY_DB_ID;

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

export const listMemos = async (tag?: string, search?: string): Promise<Memo[]> => {
  const deps = ensureMemoDependencies();
  if (!deps) {
    return [];
  }

  const filters: Array<Record<string, unknown>> = [];

  if (tag) {
    filters.push({ property: "Tags", multi_select: { contains: tag } });
  }

  if (search) {
    filters.push({ property: "Content", title: { contains: search } });
  }

  const notionAny = deps.notion as unknown as {
    databases?: { query?: (args: Record<string, unknown>) => Promise<{ results: unknown[] }> };
    dataSources?: { query?: (args: Record<string, unknown>) => Promise<{ results: unknown[] }> };
  };

  const queryDatabase = notionAny.databases?.query;
  const queryDataSource = notionAny.dataSources?.query;

  if (!queryDatabase && !queryDataSource) {
    return [];
  }

  const response = await (queryDatabase
    ? queryDatabase({
    database_id: deps.memoDatabaseId,
    filter: filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : { and: filters },
    sorts: [{ timestamp: "created_time", direction: "descending" }],
    page_size: 100,
      })
    : queryDataSource!({
        data_source_id: deps.memoDatabaseId,
        filter: filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : { and: filters },
        sorts: [{ timestamp: "created_time", direction: "descending" }],
        page_size: 100,
      }));

  return response.results
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
