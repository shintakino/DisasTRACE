"use client";

import { Activity, AlertTriangle, CheckCircle2, ChevronRight, Clock3, FileText, MapPinned, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData, RecentReport, Responder } from "@/types/dashboard";

function PaccMetricCard({ label, value, icon: Icon, active, tone }: {
  label: string;
  value: number;
  icon: typeof FileText;
  active?: boolean;
  tone: "blue" | "slate" | "emerald" | "amber";
}) {
  const iconTone = {
    blue: "bg-blue-50 text-blue-700",
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return <Card className={`min-h-28 border p-4 shadow-sm ${active ? "border-[#1E3A8A] bg-[#1E3A8A] text-white" : "border-slate-200 bg-white text-slate-900"}`}>
    <div className={`grid size-7 place-items-center rounded-md ${active ? "bg-white/15 text-white" : iconTone[tone]}`}><Icon className="size-4" /></div>
    <p className="mt-3 text-2xl font-black leading-none">{value}</p>
    <p className={`mt-2 text-[10px] font-bold uppercase tracking-wide ${active ? "text-white/80" : "text-slate-500"}`}>{label}</p>
  </Card>;
}

function responderStatusTone(status: string) {
  if (status === "STANDBY") return "bg-emerald-50 text-emerald-700";
  if (status === "DISPATCHED") return "bg-blue-50 text-blue-700";
  if (status === "OFFER PENDING") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function AttentionItem({ icon: Icon, title, detail, report, onSelectReport }: {
  icon: typeof AlertTriangle;
  title: string;
  detail: string;
  report?: RecentReport;
  onSelectReport: (id: string) => void;
}) {
  const content = <><span className="grid size-8 shrink-0 place-items-center rounded-md bg-[#1E3A8A] text-white"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800">{title}</span><span className="mt-1 block truncate text-[11px] text-slate-500">{detail}</span></span>{report ? <ChevronRight className="size-4 shrink-0 text-slate-400" /> : null}</>;
  return report
    ? <button type="button" onClick={() => onSelectReport(report.id)} className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]">{content}</button>
    : <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">{content}</div>;
}

export function PaccOperationsDashboard({ data, displayName, onSelectReport }: {
  data: DashboardData;
  displayName: string;
  onSelectReport: (id: string) => void;
}) {
  const pendingReports = data.reports.filter((report) => report.requestStatus === "PENDING");
  const reassignmentReports = data.reports.filter((report) => report.requiresPaccReassignment);
  const criticalReport = data.reports.find((report) => report.severity === "Critical" && report.incidentStatus !== "RESOLVED" && report.requestStatus !== "REJECTED");
  const available = data.responders.filter((responder) => responder.status === "STANDBY").length;
  const dispatched = data.responders.filter((responder) => responder.status === "DISPATCHED").length;
  const offDuty = data.responders.filter((responder) => responder.status === "OFF DUTY" || responder.status === "OFFER PENDING").length;

  return <div className="h-full min-h-0 overflow-y-auto pr-1">
    <div className="space-y-5 pb-5">
      <section className="relative overflow-hidden rounded-xl border border-blue-100 bg-[#EAF1FF] px-6 py-5">
        <div className="relative z-10 max-w-xl">
          <h1 className="text-lg font-black text-[#1E3A8A]">Welcome back, {displayName}!</h1>
          <p className="mt-1 text-xs leading-5 text-slate-600">Review incoming reports, coordinate verified emergencies, and keep dispatch operations moving this shift.</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#1E3A8A]"><span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" /> {data.kpis.pendingVerification} reports awaiting review</span><span className="inline-flex items-center gap-1.5"><Activity className="size-3.5" /> {data.kpis.activeIncidents} active incidents</span></div>
        </div>
        <div className="absolute right-7 top-1/2 grid size-16 -translate-y-1/2 place-items-center rounded-full bg-blue-100 text-[#1E3A8A] ring-8 ring-blue-100/50"><MapPinned className="size-8" /></div>
      </section>

      <section aria-label="PACC operations overview">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <PaccMetricCard label="For action" value={data.kpis.pendingVerification + reassignmentReports.length} icon={AlertTriangle} active tone="blue" />
          <PaccMetricCard label="For review" value={pendingReports.length} icon={FileText} tone="slate" />
          <PaccMetricCard label="Active incidents" value={data.kpis.activeIncidents} icon={Activity} tone="blue" />
          <PaccMetricCard label="Reassignment" value={reassignmentReports.length} icon={Radio} tone="amber" />
          <PaccMetricCard label="Completed today" value={data.kpis.totalResolvedToday} icon={CheckCircle2} tone="emerald" />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="border-slate-200 shadow-sm"><CardHeader className="p-5 pb-3"><CardTitle className="text-base font-bold text-[#1E3A8A]">Attention Required</CardTitle><p className="mt-1 text-xs text-slate-500">Items requiring immediate PACC attention</p></CardHeader><CardContent className="space-y-2 p-5 pt-1">
          {criticalReport ? <AttentionItem icon={AlertTriangle} title={`Critical incident: ${criticalReport.type}`} detail={`${criticalReport.requestId} · ${criticalReport.destination}`} report={criticalReport} onSelectReport={onSelectReport} /> : null}
          <AttentionItem icon={FileText} title={`${data.kpis.pendingVerification} reports awaiting verification`} detail={pendingReports[0] ? `${pendingReports[0].requestId} is next in the review queue.` : "No reports are currently awaiting PACC review."} report={pendingReports[0]} onSelectReport={onSelectReport} />
          <AttentionItem icon={Radio} title={reassignmentReports.length ? "Response coordination awaiting reassignment" : "Response coordination is up to date"} detail={reassignmentReports[0] ? `${reassignmentReports[0].requestId} needs another available responder.` : "No active response is awaiting a new responder."} report={reassignmentReports[0]} onSelectReport={onSelectReport} />
        </CardContent></Card>

        <Card className="border-slate-200 shadow-sm"><CardHeader className="p-5 pb-3"><CardTitle className="text-base font-bold text-[#1E3A8A]">Response Resource Status</CardTitle><p className="mt-1 text-xs text-slate-500">Current availability of response resources</p></CardHeader><CardContent className="p-5 pt-1">
          <div className="grid grid-cols-3 gap-2"><div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-emerald-700"><p className="text-xl font-black">{available}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide">Available</p></div><div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-blue-700"><p className="text-xl font-black">{dispatched}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide">Dispatched</p></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600"><p className="text-xl font-black">{offDuty}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide">Off duty / offer</p></div></div>
          <div className="mt-4 divide-y divide-slate-100">{data.responders.slice(0, 6).map((responder: Responder) => <div key={responder.id} className="flex items-center justify-between gap-3 py-2.5"><div className="flex min-w-0 items-center gap-2.5"><span className="grid size-7 shrink-0 place-items-center rounded-md bg-[#1E3A8A] text-[10px] font-black text-white">{responder.initials}</span><span className="truncate text-xs font-semibold text-slate-800">{responder.name}</span></div><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${responderStatusTone(responder.status)}`}>{responder.status}</span></div>)}{data.responders.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No active responder accounts found.</p> : null}</div>
        </CardContent></Card>
      </section>
    </div>
  </div>;
}
