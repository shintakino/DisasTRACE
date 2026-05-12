"use client"

import { useEffect, useState } from "react";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { IncidentTrends, IncidentDistribution } from "@/components/dashboard/incident-charts";
import { RecentReports } from "@/components/dashboard/recent-reports";
import { ResponderStatus } from "@/components/dashboard/responder-status";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { DashboardData, DashboardDataSchema } from "@/types/dashboard";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("monthly");

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [kpiRes, trendRes, reportRes, responderRes] = await Promise.all([
          fetch('/api/dashboard/kpis'),
          fetch(`/api/dashboard/trends?period=${period}`),
          fetch('/api/dashboard/reports'),
          fetch('/api/dashboard/responders'),
        ]);

        const responses = await Promise.all([
          kpiRes.json(),
          trendRes.json(),
          reportRes.json(),
          responderRes.json(),
        ]);

        const [kpiJson, trendJson, reportJson, responderJson] = responses;

        if (kpiRes.ok && trendRes.ok && reportRes.ok && responderRes.ok) {
          // Validate and parse the combined data using Zod
          const validatedData = DashboardDataSchema.parse({
            kpis: kpiJson.data,
            trends: trendJson.data.trends,
            distribution: trendJson.data.distribution,
            reports: reportJson.data,
            responders: responderJson.data,
          });
          
          setData(validatedData);
        } else {
          // Extract error message from any of the failed responses
          const firstError = [kpiJson, trendJson, reportJson, responderJson].find(r => r.error)?.message 
            || "One or more dashboard requests failed";
          setError(firstError);
          console.error("Dashboard Fetch Error Detail:", {
            kpis: kpiJson,
            trends: trendJson,
            reports: reportJson,
            responders: responderJson
          });
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("A network error occurred while loading dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [period]);

  if (loading) {
    return (
      <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-3xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
          <Skeleton className="h-full w-full rounded-2xl" />
          <Skeleton className="h-full w-full rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
          <Skeleton className="h-full w-full rounded-2xl" />
          <Skeleton className="h-full w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="bg-red-50 border-red-200">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-lg font-bold">Dashboard Access Error</AlertTitle>
        <AlertDescription className="text-base mt-2">
          {error}
          <div className="mt-4 text-sm opacity-80">
            Please ensure you are logged in with a Super Admin account and your Clerk Session Token is configured to include public metadata.
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 min-h-0">
      <div className="shrink-0">
        <KpiCards data={data.kpis} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <IncidentTrends data={data.trends} />
        <IncidentDistribution 
          data={data.distribution} 
          period={period}
          onPeriodChange={setPeriod}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <RecentReports reports={data.reports} />
        <ResponderStatus responders={data.responders} />
      </div>
    </div>
  );
}
