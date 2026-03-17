import { google, type tasks_v1 } from "googleapis";

import type { Task, TaskCreateInput } from "@/types";

const TASK_LIST_NAMES = ["SOU Task - 個人", "SOU Task - AI委譲", "SOU Task - ルーティン"] as const;
const DEFAULT_TASK_LIST_NAME = "SOU Task - 個人";

type UpdateTaskInput = Partial<Pick<TaskCreateInput, "title" | "notes" | "dueDate">>;

const getTasksClient = (accessToken: string) => {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  return google.tasks({ version: "v1", auth });
};

const toTaskId = (taskListId: string, googleTaskId: string) => `${taskListId}:${googleTaskId}`;

const fromTaskId = (taskId: string) => {
  const parts = taskId.split(":");

  if (parts.length === 2) {
    return { taskListId: parts[0], googleTaskId: parts[1] };
  }

  return { taskListId: undefined, googleTaskId: taskId };
};

const toDomainTask = (task: tasks_v1.Schema$Task, taskListId: string): Task => ({
  id: toTaskId(taskListId, task.id ?? ""),
  googleTaskId: task.id ?? "",
  title: task.title ?? "",
  notes: task.notes ?? undefined,
  dueDate: task.due ?? undefined,
  completed: task.status === "completed",
  completedAt: task.completed ?? undefined,
  priority: 2,
  createdAt: task.updated ?? new Date().toISOString(),
});

const getTaskLists = async (tasksClient: tasks_v1.Tasks) => {
  const response = await tasksClient.tasklists.list({ maxResults: 100 });
  return response.data.items ?? [];
};

const ensureTaskLists = async (tasksClient: tasks_v1.Tasks) => {
  const taskLists = await getTaskLists(tasksClient);
  const result = new Map<string, string>();

  for (const taskList of taskLists) {
    if (taskList.title && taskList.id) {
      result.set(taskList.title, taskList.id);
    }
  }

  for (const name of TASK_LIST_NAMES) {
    if (result.has(name)) {
      continue;
    }

    const created = await tasksClient.tasklists.insert({ requestBody: { title: name } });
    if (created.data.id) {
      result.set(name, created.data.id);
    }
  }

  return result;
};

const resolveTaskListId = async (tasksClient: tasks_v1.Tasks, listId?: string) => {
  if (listId) {
    return listId;
  }

  const taskLists = await ensureTaskLists(tasksClient);
  const defaultTaskListId = taskLists.get(DEFAULT_TASK_LIST_NAME);

  if (!defaultTaskListId) {
    throw new Error("Default Google Task list is not available.");
  }

  return defaultTaskListId;
};

const findTaskListIdByTaskId = async (tasksClient: tasks_v1.Tasks, taskId: string) => {
  const parsed = fromTaskId(taskId);
  if (parsed.taskListId) {
    return parsed;
  }

  const taskLists = await ensureTaskLists(tasksClient);

  for (const taskListId of taskLists.values()) {
    const task = await tasksClient.tasks.get({ tasklist: taskListId, task: parsed.googleTaskId }).catch(() => null);
    if (task?.data.id) {
      return { taskListId, googleTaskId: parsed.googleTaskId };
    }
  }

  throw new Error("Task list could not be resolved for task id.");
};

export const listTasks = async (accessToken: string, listId?: string): Promise<Task[]> => {
  const tasksClient = getTasksClient(accessToken);

  if (listId) {
    const response = await tasksClient.tasks.list({ tasklist: listId, showCompleted: true, showHidden: true, maxResults: 100 });
    return (response.data.items ?? []).map((task) => toDomainTask(task, listId));
  }

  const taskLists = await ensureTaskLists(tasksClient);
  const results = await Promise.all(
    [...taskLists.values()].map(async (taskListId) => {
      const response = await tasksClient.tasks.list({ tasklist: taskListId, showCompleted: true, showHidden: true, maxResults: 100 });
      return (response.data.items ?? []).map((task) => toDomainTask(task, taskListId));
    }),
  );

  return results.flat();
};

export const createTask = async (accessToken: string, task: TaskCreateInput & { listId?: string }): Promise<Task> => {
  const tasksClient = getTasksClient(accessToken);
  const taskListId = await resolveTaskListId(tasksClient, task.listId);

  const response = await tasksClient.tasks.insert({
    tasklist: taskListId,
    requestBody: {
      title: task.title,
      notes: task.notes,
      due: task.dueDate,
    },
  });

  return toDomainTask(response.data, taskListId);
};


export const getTaskById = async (accessToken: string, taskId: string): Promise<Task> => {
  const tasksClient = getTasksClient(accessToken);
  const { taskListId, googleTaskId } = await findTaskListIdByTaskId(tasksClient, taskId);
  const response = await tasksClient.tasks.get({ tasklist: taskListId, task: googleTaskId });

  return toDomainTask(response.data, taskListId);
};
export const updateTask = async (accessToken: string, taskId: string, updates: UpdateTaskInput): Promise<Task> => {
  const tasksClient = getTasksClient(accessToken);
  const { taskListId, googleTaskId } = await findTaskListIdByTaskId(tasksClient, taskId);

  const currentTask = await tasksClient.tasks.get({ tasklist: taskListId, task: googleTaskId });

  const response = await tasksClient.tasks.update({
    tasklist: taskListId,
    task: googleTaskId,
    requestBody: {
      ...currentTask.data,
      title: updates.title ?? currentTask.data.title,
      notes: updates.notes ?? currentTask.data.notes,
      due: updates.dueDate ?? currentTask.data.due,
    },
  });

  return toDomainTask(response.data, taskListId);
};

export const completeTask = async (accessToken: string, taskId: string): Promise<void> => {
  const tasksClient = getTasksClient(accessToken);
  const { taskListId, googleTaskId } = await findTaskListIdByTaskId(tasksClient, taskId);

  const currentTask = await tasksClient.tasks.get({ tasklist: taskListId, task: googleTaskId });

  await tasksClient.tasks.patch({
    tasklist: taskListId,
    task: googleTaskId,
    requestBody: {
      ...currentTask.data,
      status: "completed",
      completed: new Date().toISOString(),
    },
  });
};

export const deleteTask = async (accessToken: string, taskId: string): Promise<void> => {
  const tasksClient = getTasksClient(accessToken);
  const { taskListId, googleTaskId } = await findTaskListIdByTaskId(tasksClient, taskId);

  await tasksClient.tasks.delete({ tasklist: taskListId, task: googleTaskId });
};
