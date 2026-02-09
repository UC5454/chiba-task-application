import type { AIEmployee } from "@/types";

const GITHUB_OWNER = "UC5454";
const GITHUB_REPO = "my-ai-team";
const GITHUB_REF = process.env.GITHUB_TEAM_REPO_REF ?? "main";

const EMPLOYEES: Array<AIEmployee & { path: string }> = [
  { name: "神崎凛", id: "kanzaki-rin", team: "executive", role: "COO", avatarUrl: "", path: "executive/神崎凛" },
  { name: "白波瀬みなみ", id: "shirahase-minami", team: "secretary", role: "エグゼクティブ秘書", avatarUrl: "", path: "secretary/白波瀬みなみ" },
  { name: "水瀬ことは", id: "minase-kotoha", team: "note-team", role: "リサーチャー", avatarUrl: "", path: "note-team/水瀬ことは" },
  { name: "朝日つむぎ", id: "asahi-tsumugi", team: "note-team", role: "ライター", avatarUrl: "", path: "note-team/朝日つむぎ" },
  { name: "橘そら", id: "tachibana-sora", team: "note-team", role: "デザイナー", avatarUrl: "", path: "note-team/橘そら" },
  { name: "藤堂蓮", id: "todo-ren", team: "note-team", role: "品質管理", avatarUrl: "", path: "note-team/藤堂蓮" },
  { name: "結城颯", id: "yuuki-sou", team: "web-team", role: "WEBディレクター", avatarUrl: "", path: "web-team/結城颯" },
  { name: "桐谷凪", id: "kiritani-nagi", team: "web-team", role: "デザイナー", avatarUrl: "", path: "web-team/桐谷凪" },
  { name: "真白悠", id: "mashiro-yuu", team: "web-team", role: "ライター", avatarUrl: "", path: "web-team/真白悠" },
  { name: "蒼月海斗", id: "aotsuki-kaito", team: "web-team", role: "エンジニア", avatarUrl: "", path: "web-team/蒼月海斗" },
  { name: "白銀司", id: "shirogane-tsukasa", team: "prompt-team", role: "プロンプトエンジニア", avatarUrl: "", path: "prompt-team/白銀司" },
  { name: "氷室翔", id: "himuro-sho", team: "slides-team", role: "営業資料制作", avatarUrl: "", path: "slides-team/氷室翔" },
  { name: "柚木陽菜", id: "yuzuki-hina", team: "slides-team", role: "研修資料制作", avatarUrl: "", path: "slides-team/柚木陽菜" },
];

type GitHubContentResponse = {
  content?: string;
  encoding?: string;
  type?: string;
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
