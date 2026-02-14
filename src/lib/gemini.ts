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

export const generateInsightComment = async (data: {
  totalActive: number;
  totalCompleted: number;
  completionRate: number;
  thisWeekCompleted: number;
  lastWeekCompleted: number;
  weeklyChange: number;
  categoryBreakdown: Record<string, number>;
  averagePerDay: number;
  dailyCompletions: Array<{ date: string; count: number }>;
}): Promise<string | null> => {
  if (!GEMINI_API_KEY) return null;

  const recent7 = data.dailyCompletions.slice(-7);
  const activeDays = recent7.filter((d) => d.count > 0).map((d) => {
    const date = new Date(d.date + "T00:00:00");
    return `${date.getMonth() + 1}/${date.getDate()}(${date.toLocaleDateString("ja-JP", { weekday: "short" })})：${d.count}件`;
  });

  const categories = Object.entries(data.categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, count]) => `${cat}: ${count}件`)
    .join("、");

  const prompt = `あなたはADHD特性を持つユーザーのタスク管理アプリのAIコーチです。
以下のタスクデータを分析し、ユーザーに寄り添った日本語のインサイトコメントを1〜2文で書いてください。

ルール:
- 敬語不要、フランクに（「〜だね」「〜じゃん」「〜かも」等）
- 褒められるポイントがあれば必ず褒める
- 改善点があっても責めない。ADHDの特性に理解を示す
- 具体的な数字に触れる
- 絵文字は1〜2個まで

データ:
- アクティブタスク: ${data.totalActive}件
- 完了済み: ${data.totalCompleted}件（完了率${data.completionRate}%）
- 今週の完了: ${data.thisWeekCompleted}件（先週比${data.weeklyChange > 0 ? "+" : ""}${data.weeklyChange}%）
- 1日平均完了: ${data.averagePerDay}件
- 直近7日の完了: ${activeDays.length > 0 ? activeDays.join("、") : "なし"}
- カテゴリ別アクティブ: ${categories || "なし"}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 150,
        },
      }),
    });

    if (!response.ok) {
      console.error("Gemini API error:", response.status, await response.text().catch(() => ""));
      return null;
    }

    const result = (await response.json()) as GeminiResponse;
    return result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch (err) {
    console.error("Gemini insight generation failed:", err);
    return null;
  }
};
