"use client"

import { AlertTriangle, MapPin } from "lucide-react";
import { format } from "date-fns";
import { motion } from "motion/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isOperationalIncidentActive } from "@/lib/incident-display-priority";
import { cn } from "@/lib/utils";
import type { RecentReport } from "@/types/dashboard";

export function RecentReports({ reports, onReportClick, className }: {
  reports: RecentReport[];
  onReportClick?: (id: string) => void;
  className?: string;
}) {
  return (
    <Card className={cn("flex min-h-[360px] flex-col overflow-hidden rounded-xl border border-slate-200 shadow-sm", className)}>
      <CardHeader className="p-6 pb-3">
        <CardTitle className="text-lg font-bold text-[#1E3A8A]">Priority & Recent Incidents</CardTitle>
        <CardDescription>One operational priority, followed by recent command-center activity</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-6 pb-6">
          <div className="space-y-2">
            {reports.map((report, index) => {
              const status = report.incidentStatus ?? report.requestStatus;
              const isPriority = index === 0 && isOperationalIncidentActive({ status });
              return (
                <motion.button
                  type="button"
                  key={report.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => onReportClick?.(report.id)}
                  className={cn(
                    "flex w-full flex-col text-left transition-all duration-200 hover:shadow-sm",
                    isPriority ? "rounded-xl border border-red-200 bg-red-50 p-5" : "rounded-lg border border-[#F1F5F9] bg-[#F8FAFC] p-3 hover:bg-[#F1F5F9]/80",
                  )}
                >
                  {isPriority ? (
                    <div className="mb-3 flex w-full items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-700 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-white">
                        <AlertTriangle className="size-3.5" /> Priority now
                      </span>
                      <span className="text-sm font-bold text-red-800">{report.severity} severity</span>
                    </div>
                  ) : null}
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{status.replaceAll('_', ' ')}</span>
                    <span className="text-xs font-medium text-slate-500">{format(new Date(report.timestamp), "MMM d, yyyy · h:mm a")}</span>
                  </div>
                  <span className={cn("mt-1 font-bold leading-tight text-slate-900", isPriority ? "text-xl" : "text-base")}>{report.type}</span>
                  <span className="mt-0.5 text-sm font-semibold text-slate-600">{report.requestId} · {report.vehicleId}</span>
                  <span className="mt-2 flex w-full min-w-0 items-center gap-1 text-sm font-semibold text-slate-700">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{report.destination}</span>
                  </span>
                  {report.requiresPaccReassignment ? <span className="mt-2 text-sm font-bold text-red-700">Responder reassignment required</span> : null}
                </motion.button>
              );
            })}
            {reports.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No incident activity is available.</p> : null}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
