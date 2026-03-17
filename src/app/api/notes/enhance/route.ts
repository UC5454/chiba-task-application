import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API not configured" }, { status: 503 });
  }

  try {
    const { content, action } = (await request.json()) as { content: string; action: "polish" | "summarize" | "actionItems" | "tags" };

    const prompts: Record<string, string> = {
      polish: `以下のメモを、意味を変えずに読みやすく整理してください。箇条書きや構造化を活用してOK。原文の意図を保つこと。\n\nメモ:\n${content}`,
      summarize: `以下のメモを1-2文で要約してください。\n\nメモ:\n${content}`,
      actionItems: `以下のメモからアクションアイテム（やるべきこと）を抽出してください。箇条書きで出力。アクションがない場合は「アクションアイテムなし」と返してください。\n\nメモ:\n${content}`,
      tags: `以下のメモに最適なタグを3つまで提案してください。JSON配列で返してください。例: ["企画","AI","営業"]\n\nメモ:\n${content}`,
    };

    const prompt = prompts[action];
    if (!prompt) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const result = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // For tags action, try to parse as JSON array
    if (action === "tags") {
      try {
        const match = result.match(/\[.*\]/s);
        if (match) {
          const tags = JSON.parse(match[0]) as string[];
          return NextResponse.json({ result: tags });
        }
      } catch {
        // Fall through to return raw text
      }
    }

    return NextResponse.json({ result });
  } catch (err) {
    console.error("Enhance error:", err);
    return NextResponse.json({ error: "AI処理に失敗しました" }, { status: 500 });
  }
}
