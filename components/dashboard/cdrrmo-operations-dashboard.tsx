"use client";

import { Activity, CheckCircle2, Clock3, FileText, MapPinned, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CDRRMOIncidentSummary } from "@/components/dashboard/cdrrmo-incident-summary";
import { CDRRMORecentActivity } from "@/components/dashboard/cdrrmo-recent-activity";
import { CDRRMOResponderOverview } from "@/components/dashboard/cdrrmo-responder-overview";
import type { DashboardData } from "@/types/dashboard";
import { formatDurationMinutes } from "@/lib/incident-presentation";

interface CDRRMOOperationsDashboardProps {
  data: DashboardData;
  displayName: string;
  distributionFilter: string;
  onDistributionFilterChange: (filter: string) => void;
  onSelectReport: (id: string) => void;
  onViewAnalytics: () => void;
  onViewAudit: () => void;
  onViewRoster: () => void;
}

function MetricCard({ label, value, icon: Icon, active, tone }: {
  label: string;
  value: number;
  icon: typeof FileText;
  active?: boolean;
  tone: "blue" | "emerald" | "amber" | "slate" | "red";
}) {
  const iconStyles = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-600",
    red: "bg-red-50 text-red-700",
  };
  return (
    <Card className={`min-h-28 border p-4 shadow-sm ${active ? "border-[#1E3A8A] bg-[#1E3A8A] text-white" : "border-slate-200 bg-white text-slate-900"}`}>
      <div className={`grid size-7 place-items-center rounded-md ${active ? "bg-white/15 text-white" : iconStyles[tone]}`}><Icon className="size-4" /></div>
      <p className="mt-3 text-2xl font-black leading-none">{value}</p>
      <p className={`mt-2 text-[10px] font-bold uppercase tracking-wide ${active ? "text-white/80" : "text-slate-500"}`}>{label}</p>
    </Card>
  );
}

export function CDRRMOOperationsDashboard({
  data,
  displayName,
  distributionFilter,
  onDistributionFilterChange,
  onSelectReport,
  onViewAnalytics,
  onViewAudit,
  onViewRoster,
}: CDRRMOOperationsDashboardProps) {
  const totalPeriodReports = data.distribution.reduce((sum, item) => sum + item.value, 0);
  const leadingType = [...data.distribution].sort((first, second) => second.value - first.value)[0];

  return (
    <div className="h-full min-h-0 overflow-y-auto pr-1">
      <div className="space-y-5 pb-5">
        <section className="relative overflow-hidden rounded-xl border border-blue-100 bg-[#EAF1FF] px-6 py-5">
          <div className="relative z-10 max-w-xl">
            <p className="text-lg font-black text-[#1E3A8A]">Hello, {displayName}!</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">Welcome back. City activity is currently being monitored in real time — here is where operations stand this shift.</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#1E3A8A]">
              <span className="inline-flex items-center gap-1.5"><Activity className="size-3.5" /> {data.kpis.activeIncidents} active incidents</span>
              <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" /> {data.kpis.avgResponseTime === '0' ? 'No completed field responses today' : `${formatDurationMinutes(data.kpis.avgResponseTime)} average field response`}</span>
            </div>
          </div>
          <div className="absolute right-7 top-1/2 grid size-16 -translate-y-1/2 place-items-center rounded-full bg-blue-100 text-[#1E3A8A] ring-8 ring-blue-100/50"><MapPinned className="size-8" /></div>
        </section>

        <section aria-labelledby="operations-overview-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div><h2 id="operations-overview-heading" className="text-base font-bold text-slate-900">CDRRMO Operations Center</h2><p className="mt-1 text-xs text-slate-500">Incident overview and current operational status</p></div>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500"><span>{data.kpis.totalIncidentsToday} reported today</span><span>{data.kpis.totalResolvedToday} resolved today</span></div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <MetricCard label="Reported today" value={data.kpis.totalIncidentsToday} icon={FileText} tone="blue" />
            <MetricCard label="Active incidents" value={data.kpis.activeIncidents} icon={Activity} active tone="blue" />
            <MetricCard label="Pending verification" value={data.kpis.pendingVerification} icon={Clock3} tone="amber" />
            <MetricCard label="Resolved today" value={data.kpis.totalResolvedToday} icon={CheckCircle2} tone="emerald" />
            <MetricCard label="Rejected today" value={data.kpis.totalRejectedToday} icon={ShieldX} tone="red" />
          </div>
        </section>

        <CDRRMOIncidentSummary data={data.distribution} filter={distributionFilter} onFilterChange={onDistributionFilterChange} />

        <section className="grid gap-5 xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.35fr)]">
          <div className="space-y-5">
            <CDRRMOResponderOverview responders={data.responders} onViewRoster={onViewRoster} />
            <Card className="border-slate-200 p-5 shadow-sm">
              <h2 className="text-base font-bold text-[#1E3A8A]">Incident Trends</h2>
              <p className="mt-1 text-xs text-slate-500">Full breakdown in Command Analytics</p>
              <dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-500">Today</dt><dd className="font-bold text-slate-900">{data.kpis.totalIncidentsToday} incidents</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Selected period</dt><dd className="font-bold text-slate-900">{totalPeriodReports} incidents</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Most reported</dt><dd className="text-right font-bold text-slate-900">{leadingType?.name ?? "No reports"}</dd></div></dl>
              <Button type="button" className="mt-6 w-full bg-[#1E3A8A] text-xs font-bold hover:bg-[#172F6E]" onClick={onViewAnalytics}>View analytics</Button>
            </Card>
          </div>
          <CDRRMORecentActivity reports={data.reports} onViewAudit={onViewAudit} onSelectReport={onSelectReport} />
        </section>
      </div>
    </div>
  );
}
