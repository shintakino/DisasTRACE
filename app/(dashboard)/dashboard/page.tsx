"use client"

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { IncidentDistribution } from "@/components/dashboard/incident-charts";
import { RecentReports } from "@/components/dashboard/recent-reports";
import { PACCResponderGrid } from "@/components/dashboard/pacc-responder-grid";
import { CDRRMOOperationsDashboard } from "@/components/dashboard/cdrrmo-operations-dashboard";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardData, DashboardDataSchema } from "@/types/dashboard";
import { useRouter } from "next/navigation";
import { WebPreloader } from "@/components/ui/web-preloader";
import { createClientBrowser } from "@/lib/supabase";
import { z } from "zod";

export default function DashboardPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<'PERMISSION' | 'NETWORK' | 'DATA'>('DATA');
  const [trendFilter, setTrendFilter] = useState("this_year");
  const [distFilter, setDistFilter] = useState("this_month");
  const [refreshVersion, setRefreshVersion] = useState(0);

  const handleReportClick = (reportId: string) => {
    router.push(`/map?select=${reportId}`);
  };

  const fetchRespondersSilent = async () => {
    try {
      const responderRes = await fetch('/api/dashboard/responders');
      if (responderRes.ok) {
        const json = await responderRes.json();
        setData((prev) => prev ? { ...prev, responders: json.data } : null);
      }
    } catch (err) {
      console.error("Silent responder update failed:", err);
    }
  };

  // Real-Time Subscriptions for Responder Status & Telemetry updates
  useEffect(() => {
    if (!user) return;
    const supabase = createClientBrowser();

    const channel = supabase
      .channel("dashboard-responders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        async (payload) => {
          console.log("[DashboardRealtime] User table updated, re-evaluating responder status...", payload);
          await fetchRespondersSilent();
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "verification_requests" }, () => {
        setRefreshVersion((value) => value + 1);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, () => {
        setRefreshVersion((value) => value + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Periodic heartbeat freshness check (15s interval for live offline detection)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRespondersSilent();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchDashboardData() {
      setError(null);
      try {
        const [kpiRes, trendRes, reportRes, responderRes] = await Promise.all([
          fetch('/api/dashboard/kpis'),
          fetch(`/api/dashboard/trends?trendFilter=${trendFilter}&distFilter=${distFilter}`),
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
          setErrorKind([kpiRes, trendRes, reportRes, responderRes].some((response) => response.status === 401 || response.status === 403) ? 'PERMISSION' : 'DATA');
          console.error("Dashboard Fetch Error Detail:", {
            kpis: kpiJson,
            trends: trendJson,
            reports: reportJson,
            responders: responderJson
          });
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        if (err instanceof z.ZodError) {
          setError("The dashboard received data in an unsupported format. Please retry; contact system support if it continues.");
          setErrorKind('DATA');
        } else {
          setError("A network error occurred while loading dashboard data.");
          setErrorKind('NETWORK');
        }
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      const normalizedRole = role?.toLowerCase();
      if (normalizedRole === 'cdrrmo_super_admin' || normalizedRole === 'pacc_admin') {
        fetchDashboardData();
      } else {
        setLoading(false);
        setError("You do not have permission to view this dashboard.");
        setErrorKind('PERMISSION');
      }
    }
  }, [trendFilter, distFilter, role, authLoading, refreshVersion]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center min-h-0">
        <WebPreloader title="Loading Dashboard Statistics..." subtitle="Fetching real-time incident trends, active responders, and recent reports" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="bg-red-50 border-red-200">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-lg font-bold">{errorKind === 'PERMISSION' ? 'Dashboard access denied' : 'Dashboard could not refresh'}</AlertTitle>
        <AlertDescription className="text-base mt-2">
          {error}
          {errorKind === 'PERMISSION' ? (
            <div className="mt-4 text-sm opacity-80">
              Current detected role: <strong>{String(role)}</strong><br />
              Sign in with a Super Admin or PACC Admin account. If the role just changed, sign out and sign in again.
            </div>
          ) : (
            <div className="mt-4 text-sm opacity-80">
              {errorKind === 'NETWORK' ? 'Check the command-center connection, then retry.' : 'The server response could not be validated. Retry, then contact system support if it continues.'}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="mt-4 border-red-300 bg-white text-red-800 hover:bg-red-100"
            onClick={() => {
              setLoading(true);
              setRefreshVersion((value) => value + 1);
            }}
          >
            <RefreshCw className="mr-2 size-4" /> Retry dashboard
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  // Render CDRRMO Super Admin Layout
  if (role?.toLowerCase() === 'cdrrmo_super_admin') {
    const displayName = typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : 'CDRRMO Super Admin';
    return (
      <CDRRMOOperationsDashboard
        data={data}
        displayName={displayName}
        distributionFilter={distFilter}
        onDistributionFilterChange={setDistFilter}
        onSelectReport={handleReportClick}
        onViewAnalytics={() => router.push('/analytics')}
        onViewAudit={() => router.push('/audit')}
        onViewRoster={() => router.push('/roster')}
      />
    );
  }

  // Render PACC Admin Layout
  if (role?.toLowerCase() === 'pacc_admin') {
    return (
      <>
        <div className="h-full min-h-0 overflow-y-auto pr-2 space-y-6 animate-in fade-in duration-500 scrollbar-hide lg:flex lg:flex-col lg:gap-4 lg:space-y-0 lg:scrollbar-default">
          <div className="shrink-0">
            <KpiCards data={data.kpis} />
          </div>

          <div className="grid grid-cols-1 gap-6 pb-4 md:grid-cols-2 lg:min-h-[736px] lg:flex-1 lg:grid-rows-2 lg:gap-4 lg:pb-0">
            <IncidentDistribution 
              data={data.distribution} 
              filter={distFilter}
              onFilterChange={setDistFilter}
              className="lg:h-full"
            />
            <RecentReports className="lg:h-full" reports={data.reports} onReportClick={handleReportClick} />
            <PACCResponderGrid className="md:col-span-2 lg:h-full" responders={data.responders} />
          </div>
        </div>
      </>
    );
  }

  // Default Fallback
  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 min-h-0">
      <div className="shrink-0">
        <KpiCards data={data.kpis} />
      </div>
      <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-3xl">
        <p className="text-gray-400 font-medium">No layout defined for your role ({role}).</p>
      </div>
    </div>
  );
}
