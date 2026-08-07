"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileBarChart,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { WebPreloader } from "@/components/ui/web-preloader";
import { AnalyticsDataSchema, type AnalyticsData, type AnalyticsPeriod } from "@/types/analytics";

const analyticsResponseSchema = z.object({
  data: AnalyticsDataSchema,
  message: z.string().optional(),
});

const trendChartConfig = {
  incidents: {
    label: "Reported incidents",
    color: "#1E3A8A",
  },
} satisfies ChartConfig;

const frequencyChartConfig = {
  count: {
    label: "Incidents",
    color: "#1E3A8A",
  },
} satisfies ChartConfig;

const PERIOD_OPTIONS: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

interface SummaryMetricProps {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Activity;
  iconClassName: string;
}

function SummaryMetric({ label, value, detail, icon: Icon, iconClassName }: SummaryMetricProps) {
  return (
    <Card className="gap-0 border-slate-200 bg-white py-0 shadow-sm">
      <CardContent className="flex items-start justify-between p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-2 text-3xl font-bold text-[#1E3A8A]">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export function AnalyticsDashboard() {
  const { role, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState<AnalyticsPeriod>("month");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    if (role !== "cdrrmo_super_admin") {
      setLoading(false);
      setData(null);
      setError("You do not have permission to view administrative analytics.");
      return;
    }

    const controller = new AbortController();

    async function loadAnalytics() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/analytics?period=${period}`, { signal: controller.signal });
        const payload: unknown = await response.json();
        const parsed = analyticsResponseSchema.safeParse(payload);

        if (!response.ok || !parsed.success) {
          const message = parsed.success ? parsed.data.message : undefined;
          throw new Error(message ?? "Analytics data could not be loaded.");
        }

        setData(parsed.data.data);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setData(null);
        setError(requestError instanceof Error ? requestError.message : "Analytics data could not be loaded.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadAnalytics();
    return () => controller.abort();
  }, [authLoading, period, reloadKey, role]);

  const refresh = () => {
    setRefreshing(true);
    setReloadKey((current) => current + 1);
  };

  if (loading && !data) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <WebPreloader title="Loading Analytics..." subtitle="Preparing incident patterns and operational summaries" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <Card className="w-full max-w-xl border-red-200 bg-red-50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <TriangleAlert className="size-5" />
              Analytics unavailable
            </CardTitle>
            <CardDescription className="text-red-700">{error ?? "Analytics data could not be loaded."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" onClick={refresh} className="border-red-200 bg-white text-red-800 hover:bg-red-100">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasFrequencyData = data.frequencies.some((item) => item.count > 0);
  const hasTrendData = data.trends.some((item) => item.count > 0);

  return (
    <div className="h-full overflow-y-auto pr-2 pb-4 scrollbar-hide lg:scrollbar-default">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">CDRRMO command analytics</p>
          <h2 className="mt-1 text-2xl font-bold text-[#1E3A8A]">Incident preparedness overview</h2>
          <p className="mt-1 text-sm text-slate-600">Use recurring incident patterns and response outcomes to plan staffing, equipment, and readiness actions.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={refresh}
          disabled={refreshing}
          title="Refresh analytics"
          aria-label="Refresh analytics"
          className="border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
        >
          {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        </Button>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Incident statistics">
        <SummaryMetric label="Reported incidents" value={data.summary.totalReported} detail="All logged reports" icon={FileBarChart} iconClassName="bg-blue-50 text-blue-700" />
        <SummaryMetric label="Verified reports" value={data.summary.verified} detail={`${data.summary.pending} awaiting triage`} icon={ClipboardCheck} iconClassName="bg-amber-50 text-amber-700" />
        <SummaryMetric label="Resolution rate" value={`${data.summary.resolutionRate}%`} detail={`${data.summary.resolved} resolved dispatches`} icon={CheckCircle2} iconClassName="bg-emerald-50 text-emerald-700" />
        <SummaryMetric label="Avg. resolution time" value={`${data.summary.avgResponseMinutes} min`} detail="Dispatch to recorded resolution" icon={Clock3} iconClassName="bg-violet-50 text-violet-700" />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="border-slate-200 py-0 shadow-sm xl:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <CardTitle className="text-lg font-bold text-[#1E3A8A]">Incident trend</CardTitle>
              <CardDescription>Reported incident frequency over time</CardDescription>
            </div>
            <div className="flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Trend interval">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPeriod(option.value)}
                  className={`h-7 rounded-md px-3 text-xs font-semibold transition-colors ${period === option.value ? "bg-white text-[#1E3A8A] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  aria-pressed={period === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {hasTrendData ? (
              <ChartContainer config={trendChartConfig} className="h-[280px] w-full">
                <LineChart data={data.trends} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} tick={{ fill: "#64748B", fontSize: 11 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: "#64748B", fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="count" name="incidents" stroke="var(--color-incidents)" strokeWidth={3} dot={{ fill: "var(--color-incidents)", r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ChartContainer>
            ) : <EmptyChart message="No incident reports were recorded in this reporting interval." />}
          </CardContent>
        </Card>

        <Card className="border-slate-200 py-0 shadow-sm xl:col-span-2">
          <CardHeader className="border-b border-slate-100 px-6 py-5">
            <CardTitle className="text-lg font-bold text-[#1E3A8A]">Most common incident types</CardTitle>
            <CardDescription>Frequency across all recorded reports</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {hasFrequencyData ? (
              <ChartContainer config={frequencyChartConfig} className="h-[280px] w-full">
                <BarChart data={data.frequencies} layout="vertical" margin={{ top: 0, right: 20, left: 18, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="#E2E8F0" strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                  <YAxis type="category" dataKey="type" width={112} tickLine={false} axisLine={false} tick={{ fill: "#475569", fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" name="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ChartContainer>
            ) : <EmptyChart message="No incident reports have been recorded yet." />}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="border-slate-200 py-0 shadow-sm xl:col-span-3">
          <CardHeader className="border-b border-slate-100 px-6 py-5">
            <CardTitle className="text-lg font-bold text-[#1E3A8A]">Preparedness brief</CardTitle>
            <CardDescription>Recurring patterns that warrant operational attention</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 px-6">
            {data.insights.map((insight) => (
              <div key={insight.title} className="flex gap-3 py-5 first:pt-5 last:pb-5">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1E3A8A]">
                  <Activity className="size-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{insight.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{insight.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 py-0 shadow-sm xl:col-span-2">
          <CardHeader className="border-b border-slate-100 px-6 py-5">
            <CardTitle className="text-lg font-bold text-[#1E3A8A]">Incident frequency</CardTitle>
            <CardDescription>Share of all reported incidents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {data.frequencies.map((frequency) => {
              const share = data.summary.totalReported > 0 ? Math.round((frequency.count / data.summary.totalReported) * 100) : 0;
              return (
                <div key={frequency.type}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <div className="flex min-w-0 items-center gap-2 text-slate-700">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: frequency.color }} />
                      <span className="truncate font-medium">{frequency.type}</span>
                    </div>
                    <span className="shrink-0 font-semibold text-slate-800">{frequency.count} ({share}%)</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: frequency.color }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
