import type { AIEmployee, DailyLog } from "@/types";

const GITHUB_OWNER = "UC5454";
const GITHUB_REPO = "my-ai-team";
const GITHUB_REF = process.env.GITHUB_TEAM_REPO_REF ?? "main";

const EMPLOYEES: Array<AIEmployee & { path: string }> = [
  { name: "リン", id: "rin", team: "executive", role: "COO", avatarUrl: "", path: "リン_executive_COO" },
  { name: "ミナト", id: "minato", team: "coach", role: "パーソナルコーチ", avatarUrl: "", path: "ミナト_coach_パーソナルコーチ" },
  { name: "マコト", id: "makoto", team: "hr", role: "人事マネージャー", avatarUrl: "", path: "hr/マコト_hr_人事マネージャー" },
  { name: "ミナミ", id: "minami", team: "secretary", role: "エグゼクティブ秘書", avatarUrl: "", path: "ミナミ_secretary_エグゼクティブ秘書" },
  { name: "コトハ", id: "kotoha", team: "note-team", role: "リサーチャー", avatarUrl: "", path: "note-team/コトハ_note-team_リサーチャー" },
  { name: "ツムギ", id: "tsumugi", team: "note-team", role: "ライター", avatarUrl: "", path: "note-team/ツムギ_note-team_ライター" },
  { name: "ソラ", id: "sora", team: "note-team", role: "ビジュアルデザイナー", avatarUrl: "", path: "note-team/ソラ_note-team_ビジュアルデザイナー" },
  { name: "レン", id: "ren", team: "note-team", role: "品質管理", avatarUrl: "", path: "note-team/レン_note-team_品質管理" },
  { name: "ソウ", id: "sou", team: "web-team", role: "WEBディレクター", avatarUrl: "", path: "web-team/ソウ_web-team_WEBディレクター" },
  { name: "ナギ", id: "nagi", team: "web-team", role: "デザイナー", avatarUrl: "", path: "web-team/ナギ_web-team_デザイナー" },
  { name: "ユウ", id: "yuu", team: "web-team", role: "ライター", avatarUrl: "", path: "web-team/ユウ_web-team_ライター" },
  { name: "カイト", id: "kaito", team: "web-team", role: "エンジニア", avatarUrl: "", path: "web-team/カイト_web-team_エンジニア" },
  { name: "ツカサ", id: "tsukasa", team: "prompt-team", role: "プロンプトエンジニア", avatarUrl: "", path: "prompt-team/ツカサ_prompt-team_プロンプトエンジニア" },
  { name: "ショウ", id: "shou", team: "slides-team", role: "営業資料スペシャリスト", avatarUrl: "", path: "slides-team/ショウ_slides-team_営業資料スペシャリスト" },
  { name: "アヤ", id: "aya", team: "slides-team", role: "スライドデザイナー", avatarUrl: "", path: "slides-team/アヤ_slides-team_スライドデザイナー" },
  { name: "ヒナ", id: "hina", team: "slides-team", role: "研修資料スペシャリスト", avatarUrl: "", path: "slides-team/ヒナ_slides-team_研修資料スペシャリスト" },
  { name: "ヒカル", id: "hikaru", team: "video-team", role: "映像ディレクター", avatarUrl: "", path: "video-team/ヒカル_video-team_映像ディレクター" },
  { name: "カナデ", id: "kanade", team: "video-team", role: "映像エディター", avatarUrl: "", path: "video-team/カナデ_video-team_映像エディター" },
];

type GitHubContentResponse = {
  content?: string;
  encoding?: string;
  type?: string;
  name?: string;
};

type GitHubDirEntry = {
  name: string;
  type: string;
  path: string;
};

const fetchRepoFile = async (path: string): Promise<string> => {
  const token = process.env.GITHUB_TOKEN;
  const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURI(path)}?ref=${GITHUB_REF}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    next: { revalidate: 300 },
  }).catch(() => null);

  if (!response?.ok) {
    return "";
  }

  const data = (await response.json()) as GitHubContentResponse;
  if (data.type !== "file" || !data.content) {
    return "";
  }

  if (data.encoding === "base64") {
    return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
  }

  return data.content;
};

const parseCurrentTask = (markdown: string) => {
  const line = markdown
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item && !item.startsWith("#") && item !== "-" && item !== "---");

  return line || "待機中";
};

const countInbox = (markdown: string) => markdown.split("\n").filter((line) => line.trim().startsWith("- [ ]")).length;

const fetchRepoDir = async (path: string): Promise<GitHubDirEntry[]> => {
  const token = process.env.GITHUB_TOKEN;
  const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURI(path)}?ref=${GITHUB_REF}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    next: { revalidate: 300 },
  }).catch(() => null);

  if (!response?.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const getDailyLogs = async (date?: string): Promise<DailyLog[]> => {
  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  const fileName = `${targetDate}.md`;

  const logs = await Promise.all(
    EMPLOYEES.map(async (employee) => {
      const content = await fetchRepoFile(`${employee.path}/daily-logs/${fileName}`);
      if (!content) return null;
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        team: employee.team,
        date: targetDate,
        content,
      } satisfies DailyLog;
    }),
  );

  return logs.filter((log): log is DailyLog => log !== null);
};

export const getDailyLogDates = async (employeePath: string): Promise<string[]> => {
  const entries = await fetchRepoDir(`${employeePath}/daily-logs`);
  return entries
    .filter((e) => e.type === "file" && e.name.endsWith(".md") && !e.name.startsWith("_"))
    .map((e) => e.name.replace(".md", ""))
    .sort()
    .reverse();
};

export const getEmployees = () => EMPLOYEES;

export const getTeamStatus = async (): Promise<AIEmployee[]> => {
  const team = await Promise.all(
    EMPLOYEES.map(async (employee) => {
      const [currentTaskMd, inboxMd] = await Promise.all([
        fetchRepoFile(`${employee.path}/CurrentTask.md`),
        fetchRepoFile(`${employee.path}/INBOX.md`),
      ]);

      return {
        ...employee,
        currentTask: parseCurrentTask(currentTaskMd),
        inboxCount: countInbox(inboxMd),
      };
    }),
  );

  return team;
};

export const getEmployeeDetail = async (employeeId: string, date?: string) => {
  const employee = EMPLOYEES.find((e) => e.id === employeeId);
  if (!employee) return null;

  const targetDate = date ?? new Date().toISOString().slice(0, 10);

  const [currentTaskMd, inboxMd, dailyLogContent, availableDates] = await Promise.all([
    fetchRepoFile(`${employee.path}/CurrentTask.md`),
    fetchRepoFile(`${employee.path}/INBOX.md`),
    fetchRepoFile(`${employee.path}/daily-logs/${targetDate}.md`),
    getDailyLogDates(employee.path),
  ]);

  return {
    employee: {
      name: employee.name,
      id: employee.id,
      team: employee.team,
      role: employee.role,
      avatarUrl: employee.avatarUrl,
    },
    currentTask: parseCurrentTask(currentTaskMd),
    inboxCount: countInbox(inboxMd),
    dailyLog: dailyLogContent || null,
    availableDates,
  };
};
