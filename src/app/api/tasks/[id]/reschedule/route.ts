import { NextResponse } from "next/server";

import { getAccessTokenFromSession } from "@/lib/api-auth";
import { updateTask } from "@/lib/google-tasks";

const toDateByPreset = (preset: string) => {
  const base = new Date();

  if (preset === "today") {
    base.setHours(23, 59, 59, 0);
    return base.toISOString();
  }

  if (preset === "tomorrow") {
    base.setDate(base.getDate() + 1);
    base.setHours(23, 59, 59, 0);
    return base.toISOString();
  }

  if (preset === "this_week") {
    const day = base.getDay();
    const diffToSunday = (7 - day) % 7;
    base.setDate(base.getDate() + diffToSunday);
    base.setHours(23, 59, 59, 0);
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
  const body = (await request.json()) as { newDueDate?: string };

  if (!body.newDueDate) {
    return NextResponse.json({ error: "newDueDate is required" }, { status: 400 });
  }

  const dueDate = toDateByPreset(body.newDueDate);
  const task = await updateTask(accessToken, id, { dueDate });

  return NextResponse.json({ task });
}
