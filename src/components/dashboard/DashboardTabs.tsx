"use client";

import { useState, useEffect } from "react";

import { DashboardSegmentControl } from "@/components/dashboard/DashboardSegmentControl";
import { GreetingHeader } from "@/components/dashboard/GreetingHeader";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { OverdueBanner } from "@/components/dashboard/OverdueBanner";
import { TodayTasks } from "@/components/dashboard/TodayTasks";
import { TodaySchedule } from "@/components/dashboard/TodaySchedule";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { TeamOverview } from "@/components/dashboard/TeamOverview";
import { UserInsights } from "@/components/dashboard/UserInsights";
import { TeamStatus } from "@/components/dashboard/TeamStatus";
import { RealTeamReports } from "@/components/dashboard/RealTeamReports";
import { useTeamStatus } from "@/hooks/useTeamStatus";
import { useNotionEmployees } from "@/hooks/useNotionEmployees";
import { useReadLogs } from "@/hooks/useReadLogs";

type Tab = "today" | "reports";

const SESSION_KEY = "sou-task:dashboard-tab";

export function DashboardTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("today");

  // sessionStorage から復元
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved === "today" || saved === "reports") {
      setActiveTab(saved);
    }
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    sessionStorage.setItem(SESSION_KEY, tab);
  };

  // 未読バッジ計算
  const { team } = useTeamStatus();
  const { employees } = useNotionEmployees();
  const { getUnreadCount } = useReadLogs();

  const aiUnread = team.reduce(
    (sum, m) => sum + getUnreadCount(m.id, m.logDates ?? []),
    0,
  );
  const dgUnread = employees.reduce(
    (sum, e) => sum + getUnreadCount(e.id, e.logDates),
    0,
  );
  const reportsBadge = aiUnread + dgUnread;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <GreetingHeader />
      <DashboardSegmentControl
        activeTab={activeTab}
        onTabChange={handleTabChange}
        reportsBadge={reportsBadge}
      />

      {activeTab === "today" && (
        <>
          <QuickActions />
          <OverdueBanner />
          <TodayTasks />
          <TodaySchedule />
          <StreakCard />
        </>
      )}

      {activeTab === "reports" && (
        <>
          <TeamOverview />
          <UserInsights />
          <TeamStatus />
          <RealTeamReports />
        </>
      )}
    </div>
  );
}
