"use client";

import { Info } from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { IncidentDistribution } from "@/types/dashboard";

interface CDRRMOIncidentSummaryProps {
  data: IncidentDistribution[];
  filter: string;
  onFilterChange: (filter: string) => void;
}

const filterLabels: Record<string, string> = {
  today: "Today",
  this_week: "This week",
  this_month: "This month",
  this_year: "This year",
};

export function CDRRMOIncidentSummary({ data, filter, onFilterChange }: CDRRMOIncidentSummaryProps) {
  const reported = data.filter((item) => item.value > 0);
  const total = reported.reduce((sum, item) => sum + item.value, 0);
  const leading = [...reported].sort((first, second) => second.value - first.value)[0];

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 p-5 pb-3">
        <div>
          <CardTitle className="text-base font-bold text-[#1E3A8A]">Incident Summary</CardTitle>
          <p className="mt-1 text-xs text-slate-500">Reported incidents by type for the selected period</p>
        </div>
        <Select value={filter} onValueChange={(value) => { if (value) onFilterChange(value); }}>
          <SelectTrigger aria-label="Incident summary period" className="h-9 w-32 border-slate-200 bg-white text-xs font-semibold">
            <SelectValue>{filterLabels[filter] ?? "This month"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(filterLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-5 pt-1">
        {total === 0 ? (
          <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">No incidents reported for this period.</div>
        ) : (
          <>
            <div className="grid gap-5 lg:grid-cols-[150px_1fr]">
              <div className="grid grid-cols-[108px_1fr] items-center gap-3 lg:block">
                <div className="relative size-[108px]">
                  <PieChart width={108} height={108} aria-label="Incident type distribution">
                    <Pie data={reported} dataKey="value" nameKey="name" innerRadius={33} outerRadius={52} paddingAngle={2} stroke="none">
                      {reported.map((item) => <Cell key={item.name} fill={item.fill} />)}
                    </Pie>
                  </PieChart>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-[#1E3A8A]">{total}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Reports</span>
                  </div>
                </div>
                <div className="lg:mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Leading type</p>
                  <p className="mt-1 text-sm font-black text-[#1E3A8A]">{leading?.name}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">{leading ? `${Math.round((leading.value / total) * 100)}% of reports` : "—"}</p>
                </div>
              </div>
              <div className="space-y-3">
                {reported.map((item) => {
                  const percentage = Math.round((item.value / total) * 100);
                  return (
                    <div key={item.name}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-slate-700">{item.name}</span>
                        <span className="shrink-0 text-slate-500">{item.value} · {percentage}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: item.fill }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-950">
              <Info className="mt-0.5 size-3.5 shrink-0 text-[#1E3A8A]" />
              <span><strong>{leading?.name}</strong> has the highest number of reports in {filterLabels[filter]?.toLowerCase() ?? "the selected period"}.</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
