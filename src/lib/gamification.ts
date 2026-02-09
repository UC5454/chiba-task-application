import { getSupabaseAdminClient } from "@/lib/supabase";

const GAMIFICATION_TABLE = "gamification";

type BadgeRow = {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
};

type GamificationRow = {
  id: string;
  current_streak: number;
  longest_streak: number;
  total_completed: number;
  total_released: number;
  last_completed_date: string | null;
  badges: BadgeRow[];
};

type CompleteContext = {
  completedAt?: Date;
  remainingTodayTasks?: number;
  remainingOverdueTasks?: number;
};

const badgeCatalog = {
  streak3: { id: "streak-3", name: "3日連続", description: "3日連続でタスクを完了", icon: "🔥" },
  streak7: { id: "streak-7", name: "7日連続", description: "7日連続でタスクを完了", icon: "🔥" },
  streak30: { id: "streak-30", name: "30日連続", description: "30日連続でタスクを完了", icon: "🔥" },
  total10: { id: "total-10", name: "累計10件", description: "累計10件のタスクを完了", icon: "🏆" },
  total50: { id: "total-50", name: "累計50件", description: "累計50件のタスクを完了", icon: "🏆" },
  total100: { id: "total-100", name: "累計100件", description: "累計100件のタスクを完了", icon: "🏆" },
  morning: { id: "morning", name: "朝イチ完了", description: "朝9時までにタスクを完了", icon: "🌅" },
  allDone: { id: "all-done", name: "全部やった！", description: "その日のタスクをすべて完了", icon: "✅" },
  zeroOverdue: { id: "zero-overdue", name: "やり残しゼロ！", description: "期限切れタスクをゼロにした", icon: "🌟" },
} as const;

const getOrCreateGamification = async () => {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase.from(GAMIFICATION_TABLE).select("*").limit(1).maybeSingle<GamificationRow>();

  if (data) {
    return {
      ...data,
      badges: Array.isArray(data.badges) ? data.badges : [],
    };
  }

  const { data: inserted, error } = await supabase
    .from(GAMIFICATION_TABLE)
    .insert({})
    .select("*")
    .single<GamificationRow>();

  if (error || !inserted) {
    throw new Error(error?.message ?? "Failed to initialize gamification state.");
  }

  return {
    ...inserted,
    badges: Array.isArray(inserted.badges) ? inserted.badges : [],
  };
};

const hasBadge = (badges: BadgeRow[], badgeId: string) => badges.some((badge) => badge.id === badgeId);

const addBadge = (badges: BadgeRow[], badgeKey: keyof typeof badgeCatalog, earnedAt: Date) => {
  const def = badgeCatalog[badgeKey];
  if (hasBadge(badges, def.id)) {
    return badges;
  }

  return [
    ...badges,
    {
      ...def,
      earnedAt: earnedAt.toISOString(),
    },
  ];
};

export const updateGamificationOnComplete = async (context: CompleteContext = {}) => {
  const supabase = getSupabaseAdminClient();
  const current = await getOrCreateGamification();

  const completedAt = context.completedAt ?? new Date();
  const today = new Date(completedAt);
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().split("T")[0];

  const lastDate = current.last_completed_date ? new Date(current.last_completed_date) : null;
  if (lastDate) {
    lastDate.setHours(0, 0, 0, 0);
  }

  let streak = current.current_streak;
  if (!lastDate) {
    streak = 1;
  } else {
    const diff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    streak = diff === 1 ? current.current_streak + 1 : diff === 0 ? current.current_streak : 1;
  }

  const totalCompleted = current.total_completed + 1;
  let badges = [...current.badges];

  if (streak >= 3) badges = addBadge(badges, "streak3", completedAt);
  if (streak >= 7) badges = addBadge(badges, "streak7", completedAt);
  if (streak >= 30) badges = addBadge(badges, "streak30", completedAt);

  if (totalCompleted >= 10) badges = addBadge(badges, "total10", completedAt);
  if (totalCompleted >= 50) badges = addBadge(badges, "total50", completedAt);
  if (totalCompleted >= 100) badges = addBadge(badges, "total100", completedAt);

  if (completedAt.getHours() < 9) {
    badges = addBadge(badges, "morning", completedAt);
  }

  if ((context.remainingTodayTasks ?? 1) === 0) {
    badges = addBadge(badges, "allDone", completedAt);
  }

  if ((context.remainingOverdueTasks ?? 1) === 0) {
    badges = addBadge(badges, "zeroOverdue", completedAt);
  }

  await supabase
    .from(GAMIFICATION_TABLE)
    .update({
      current_streak: streak,
      longest_streak: Math.max(current.longest_streak, streak),
      total_completed: totalCompleted,
      last_completed_date: todayIso,
      badges,
    })
    .eq("id", current.id);
};

export const updateGamificationOnRelease = async () => {
  const supabase = getSupabaseAdminClient();
  const current = await getOrCreateGamification();

  await supabase
    .from(GAMIFICATION_TABLE)
    .update({
      total_released: current.total_released + 1,
    })
    .eq("id", current.id);
};
