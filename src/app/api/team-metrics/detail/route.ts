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

type MetricType = "skill" | "subagent" | "mcp" | "message" | "active" | "session";

type RequestBody = {
  metric: MetricType;
  data: {
    summary: {
      skillCalls: number;
      subagentCalls: number;
      mcpCalls: number;
      messages: number;
      activeEmployees: number;
      totalEmployees: number;
      sessions: number;
      totalToolCalls: number;
    };
    toolBreakdown: Record<string, number>;
    topTools: Array<{ name: string; count: number }>;
    topMcpTools: Array<{ name: string; count: number }>;
    dailyTrend: Array<{ date: string; sessions: number; tools: number; messages: number }>;
    activeEmployeeNames: string[];
  };
};

const METRIC_PROMPTS: Record<MetricType, (data: RequestBody["data"]) => string> = {
  skill: (data) => {
    return `あなたはAI社員チームの活動アナリストです。
「Skill実行数」について分析してください。

ルール:
- 日本語でフランクに（「〜だね」「〜じゃん」「〜かも」等）
- 3〜4文で簡潔に
- 具体的な数字に触れる
- チームの生産性の観点で分析
- ポジティブなトーンで

データ:
- Skill実行数: ${data.summary.skillCalls}回
- 総ツール実行数: ${data.summary.totalToolCalls}回
- セッション数: ${data.summary.sessions}
- ツールカテゴリ別: ${JSON.stringify(data.toolBreakdown)}`;
  },

  subagent: (data) => {
    return `あなたはAI社員チームの活動アナリストです。
「Subagent（並列エージェント）数」について分析してください。

ルール:
- 日本語でフランクに
- 3〜4文で簡潔に
- 並列処理による効率化の観点で分析
- 具体的な数字に触れる

データ:
- Subagent起動数: ${data.summary.subagentCalls}回
- セッション数: ${data.summary.sessions}
- 1セッションあたり平均: ${(data.summary.subagentCalls / Math.max(data.summary.sessions, 1)).toFixed(1)}回
- 総ツール実行数: ${data.summary.totalToolCalls}`;
  },

  mcp: (data) => {
    const topMcp = data.topMcpTools.slice(0, 5).map((t) => `${t.name}: ${t.count}回`).join("、");
    return `あなたはAI社員チームの活動アナリストです。
「MCP（外部サービス接続）呼び出し数」について分析してください。

ルール:
- 日本語でフランクに
- 3〜4文で簡潔に
- どんな外部サービスが活用されているか触れる
- 自動化・効率化の観点で分析

データ:
- MCP呼び出し数: ${data.summary.mcpCalls}回
- Top MCP: ${topMcp}`;
  },

  message: (data) => {
    const recentTrend = data.dailyTrend.slice(-7).map(
      (d) => `${d.date.slice(5)}: ${d.messages}件`,
    ).join("、");
    return `あなたはAI社員チームの活動アナリストです。
「メッセージ数（ユーザーとAIの対話数）」について分析してください。

ルール:
- 日本語でフランクに
- 3〜4文で簡潔に
- 日別の傾向に触れる
- コミュニケーションの活発さの観点で分析

データ:
- 総メッセージ数: ${data.summary.messages}件
- 直近7日: ${recentTrend}`;
  },

  active: (data) => {
    return `あなたはAI社員チームの活動アナリストです。
「アクティブ社員数と普及率」について分析してください。

ルール:
- 日本語でフランクに
- 3〜4文で簡潔に
- どのAI社員が活躍しているか名前を挙げる
- チーム運営の観点で分析

データ:
- アクティブ: ${data.summary.activeEmployees}/${data.summary.totalEmployees}名
- 普及率: ${Math.round((data.summary.activeEmployees / data.summary.totalEmployees) * 100)}%
- アクティブメンバー: ${data.activeEmployeeNames.join("、")}`;
  },

  session: (data) => {
    const recentTrend = data.dailyTrend.slice(-7).map(
      (d) => `${d.date.slice(5)}: ${d.sessions}回`,
    ).join("、");
    return `あなたはAI社員チームの活動アナリストです。
「セッション数（AI社員の稼働回数）」について分析してください。

ルール:
- 日本語でフランクに
- 3〜4文で簡潔に
- 日別の稼働トレンドに触れる
- チームの稼働パターンの観点で分析

データ:
- 総セッション数: ${data.summary.sessions}回
- 直近7日: ${recentTrend}`;
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

    const validMetrics: MetricType[] = ["skill", "subagent", "mcp", "message", "active", "session"];
    if (!metric || !data || !validMetrics.includes(metric)) {
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
      console.error("Gemini team-metrics detail API error:", response.status);
      return NextResponse.json({ error: "分析の生成に失敗しました" }, { status: 500 });
    }

    const result = (await response.json()) as GeminiResponse;
    const analysis = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("Team metrics detail error:", err);
    return NextResponse.json({ error: "分析の生成に失敗しました" }, { status: 500 });
  }
}
