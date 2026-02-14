import { GreetingHeader } from "@/components/dashboard/GreetingHeader";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { TodayTasks } from "@/components/dashboard/TodayTasks";
import { TodaySchedule } from "@/components/dashboard/TodaySchedule";
import { OverdueBanner } from "@/components/dashboard/OverdueBanner";
import { TeamStatus } from "@/components/dashboard/TeamStatus";
import { TeamOverview } from "@/components/dashboard/TeamOverview";
import { RealTeamReports } from "@/components/dashboard/RealTeamReports";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { UserInsights } from "@/components/dashboard/UserInsights";

export default function DashboardPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <GreetingHeader />
      <QuickActions />
      <OverdueBanner />
      <TodayTasks />
      <TodaySchedule />
      <StreakCard />
      <TeamOverview />
      <UserInsights />
      <TeamStatus />
      <RealTeamReports />
    </div>
  );
}
