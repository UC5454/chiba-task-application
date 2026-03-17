import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/api-auth";
import { getEmployeeDetail } from "@/lib/github";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
  }

  const { id } = await params;
  const date = request.nextUrl.searchParams.get("date") ?? undefined;

  try {
    const detail = await getEmployeeDetail(id, date);
    if (!detail) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(
      { detail },
      { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=300" } }
    );
  } catch (err) {
    console.error("Employee detail error:", err);
    return NextResponse.json({ error: "Failed to fetch employee detail" }, { status: 500 });
  }
}
