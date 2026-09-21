"use client";

import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecentReport } from "@/types/dashboard";

interface CDRRMORecentActivityProps {
  reports: RecentReport[];
  onViewAudit: () => void;
  onSelectReport: (id: string) => void;
}

function activityLabel(report: RecentReport) {
  if (report.requestStatus === "REJECTED") return "Rejected incident report";
  if (report.incidentStatus === "RESOLVED") return "Case closed";
  if (report.incidentStatus === "EN_ROUTE" || report.incidentStatus === "ARRIVED") return "Response in progress";
  if (report.requestStatus === "VERIFIED") return "Verified incident report";
  return "New incident report";
}

export function CDRRMORecentActivity({ reports, onViewAudit, onSelectReport }: CDRRMORecentActivityProps) {
  return (
    <Card className="h-full border-slate-200 shadow-sm">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-base font-bold text-[#1E3A8A]">Recent Activity</CardTitle>
        <p className="mt-1 text-xs text-slate-500">System and incident activity log</p>
      </CardHeader>
      <CardContent className="flex h-[calc(100%-75px)] min-h-0 flex-col p-5 pt-1">
        <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
          {reports.slice(0, 7).map((report) => (
            <button key={report.id} type="button" onClick={() => onSelectReport(report.id)} className="flex w-full items-start justify-between gap-4 py-2.5 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]">
              <span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-800">{activityLabel(report)}: {report.requestId} ({report.type})</span><span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-slate-400">{report.destination}</span></span>
              <span className="shrink-0 text-[10px] font-semibold text-slate-500">{formatDistanceToNow(new Date(report.timestamp), { addSuffix: true })}</span>
            </button>
          ))}
          {reports.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No recent report activity.</p> : null}
        </div>
        <Button type="button" className="mt-4 w-full bg-[#1E3A8A] text-xs font-bold hover:bg-[#172F6E]" onClick={onViewAudit}>View audit log</Button>
      </CardContent>
    </Card>
  );
}
