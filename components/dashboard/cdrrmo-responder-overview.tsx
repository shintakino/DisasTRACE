"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Responder } from "@/types/dashboard";

interface CDRRMOResponderOverviewProps {
  responders: Responder[];
  onViewRoster: () => void;
}

function ResponderState({ label, value, tone }: { label: string; value: number; tone: "green" | "blue" | "slate" }) {
  const styles = {
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  };
  return <div className={`rounded-lg border p-3 ${styles[tone]}`}><p className="text-xl font-black">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide">{label}</p></div>;
}

export function CDRRMOResponderOverview({ responders, onViewRoster }: CDRRMOResponderOverviewProps) {
  const available = responders.filter((responder) => responder.status === "STANDBY").length;
  const dispatched = responders.filter((responder) => responder.status === "DISPATCHED").length;
  const unavailable = responders.filter((responder) => responder.status === "OFF DUTY" || responder.status === "OFFER PENDING").length;

  return (
    <Card className="h-full border-slate-200 shadow-sm">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-base font-bold text-[#1E3A8A]">Responder Status</CardTitle>
        <p className="mt-1 text-xs text-slate-500">Current availability of response personnel</p>
      </CardHeader>
      <CardContent className="p-5 pt-1">
        <div className="grid grid-cols-3 gap-2">
          <ResponderState label="Available" value={available} tone="green" />
          <ResponderState label="Dispatched" value={dispatched} tone="blue" />
          <ResponderState label="Off duty / offer" value={unavailable} tone="slate" />
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {responders.slice(0, 5).map((responder) => (
            <div key={responder.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[#1E3A8A] text-[10px] font-black text-white">{responder.initials}</span>
                <span className="truncate text-xs font-semibold text-slate-800">{responder.name}</span>
              </div>
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-500">{responder.status}</span>
            </div>
          ))}
          {responders.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No active responder accounts found.</p> : null}
        </div>
        <Button type="button" variant="outline" className="mt-4 w-full border-[#1E3A8A] text-xs font-bold text-[#1E3A8A] hover:bg-blue-50" onClick={onViewRoster}>View responder roster</Button>
      </CardContent>
    </Card>
  );
}
