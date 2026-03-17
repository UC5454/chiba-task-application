import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "team-metrics.json");
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json({ error: "team-metrics.json not found" }, { status: 404 });
  }
}
