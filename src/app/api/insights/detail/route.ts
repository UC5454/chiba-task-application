import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/api-auth";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

type MetricType = "weekly" | "completion" | "daily";

type RequestBody = {
  metric: MetricType;
  data: {
    totalActive: number;
    totalCompleted: number;
    completionRate: number;
    thisWeekCompleted: number;
    lastWeekCompleted: number;
    weeklyChange: number;
    categoryBreakdown: Record<string, number>;
    priorityBreakdown: Record<string, number>;
    dailyCompletions: Array<{ date: string; count: number }>;
    averagePerDay: number;
  };
};

const METRIC_PROMPTS: Record<MetricType, (data: RequestBody["data"]) => string> = {
  weekly: (data) => {
    const recent14 = data.dailyCompletions;
    const dailyDetail = recent14
      .map((d) => {
        const date = new Date(d.date + "T00:00:00");
        return `${date.getMonth() + 1}/${date.getDate()}(${date.toLocaleDateString("ja-JP", { weekday: "short" })}): ${d.count}件`;
      })
      .join("\n");

    return `あなたはADHD特性を持つユーザーのタスク管理アプリのAIコーチです。
「今週の完了数」について詳しく分析してください。

ルール:
- 日本語でフランクに（「〜だね」「〜じゃん」「〜かも」等）
- 3〜4文で書く
- 具体的な数字に触れる
- 曜日のパターンがあれば指摘する
- ADHDの特性（集中の波、過集中日と低調日のムラ等）を踏まえた分析をする
- 励ましを含める

データ:
- 今週完了: ${data.thisWeekCompleted}件
- 先週完了: ${data.lastWeekCompleted}件
- 先週比: ${data.weeklyChange > 0 ? "+" : ""}${data.weeklyChange}%
- 直近14日間の日別:
${dailyDetail}`;
  },

  completion: (data) => {
    const categories = Object.entries(data.categoryBreakdown)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, count]) => `${cat}: ${count}件`)
      .join("、");

    const priorities = `高: ${data.priorityBreakdown["1"] ?? 0}件、中: ${data.priorityBreakdown["2"] ?? 0}件、低: ${data.priorityBreakdown["3"] ?? 0}件`;

    return `あなたはADHD特性を持つユーザーのタスク管理アプリのAIコーチです。
「完了率」と「残りタスク」について詳しく分析してください。

ルール:
- 日本語でフランクに（「〜だね」「〜じゃん」「〜かも」等）
- 3〜4文で書く
- 残タスクの内訳（カテゴリ・優先度）に触れる
- ADHDの特性（タスクの溜まりやすさ、小さく分割する効果等）を踏まえたアドバイス
- 完了率が高ければ褒める、低ければ責めずに具体的な打開策を

データ:
- 完了率: ${data.completionRate}%
- 完了: ${data.totalCompleted}件 / 未完了: ${data.totalActive}件
- カテゴリ別（アクティブ）: ${categories || "なし"}
- 優先度別（アクティブ）: ${priorities}`;
  },

  daily: (data) => {
    const recent7 = data.dailyCompletions.slice(-7);
    const dailyDetail = recent7
      .map((d) => {
        const date = new Date(d.date + "T00:00:00");
        return `${date.getMonth() + 1}/${date.getDate()}(${date.toLocaleDateString("ja-JP", { weekday: "short" })}): ${d.count}件`;
      })
      .join("\n");

    const priorities = `高: ${data.priorityBreakdown["1"] ?? 0}件、中: ${data.priorityBreakdown["2"] ?? 0}件、低: ${data.priorityBreakdown["3"] ?? 0}件`;

    return `あなたはADHD特性を持つユーザーのタスク管理アプリのAIコーチです。
「日平均の完了数」と「生産性パターン」について詳しく分析してください。

ルール:
- 日本語でフランクに（「〜だね」「〜じゃん」「〜かも」等）
- 3〜4文で書く
- 完了数のムラ（多い日・少ない日の差）に注目
- ADHDの特性（過集中の波を活かす、ルーティン化の効果等）を踏まえたアドバイス
- 具体的な数字に触れる

データ:
- 1日平均: ${data.averagePerDay}件
- 優先度別: ${priorities}
- 直近7日:
${dailyDetail}`;
  },
};

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API未設定" }, { status: 500 });
  }

  try {
    const body = (await request.json()) as RequestBody;
    const { metric, data } = body;

    if (!metric || !data || !["weekly", "completion", "daily"].includes(metric)) {
      return NextResponse.json({ error: "不正なリクエスト" }, { status: 400 });
    }

    const prompt = METRIC_PROMPTS[metric](data);

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 300,
        },
      }),
    });

    if (!response.ok) {
      console.error("Gemini detail API error:", response.status);
      return NextResponse.json({ error: "分析の生成に失敗しました" }, { status: 500 });
    }

    const result = (await response.json()) as GeminiResponse;
    const analysis = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("Insights detail error:", err);
    return NextResponse.json({ error: "分析の生成に失敗しました" }, { status: 500 });
  }
}
