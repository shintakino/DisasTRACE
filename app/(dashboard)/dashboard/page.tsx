"use client"

import { useEffect, useState } from "react";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { IncidentTrends, IncidentDistribution } from "@/components/dashboard/incident-charts";
import { RecentReports } from "@/components/dashboard/recent-reports";
import { ResponderStatus } from "@/components/dashboard/responder-status";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardData } from "@/types/dashboard";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [kpiRes, trendRes, reportRes, responderRes] = await Promise.all([
          fetch('/api/dashboard/kpis'),
          fetch('/api/dashboard/trends'),
          fetch('/api/dashboard/reports'),
          fetch('/api/dashboard/responders'),
        ]);

        const kpiJson = await kpiRes.json();
        const trendJson = await trendRes.json();
        const reportJson = await reportRes.json();
        const responderJson = await responderRes.json();

        setData({
          kpis: kpiJson.data,
          trends: trendJson.data.trends,
          distribution: trendJson.data.distribution,
          reports: reportJson.data,
          responders: responderJson.data,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <KpiCards data={data.kpis} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IncidentTrends data={data.trends} />
        <IncidentDistribution data={data.distribution} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentReports reports={data.reports} />
        </div>
        <div>
          <ResponderStatus responders={data.responders} />
        </div>
      </div>
    </div>
  );
}
