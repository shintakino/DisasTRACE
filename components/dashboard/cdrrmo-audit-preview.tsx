"use client";

import { formatDistanceToNow } from "date-fns";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditPreview } from "@/types/dashboard";

interface CDRRMOAuditPreviewProps {
  entries: AuditPreview[];
  onViewAudit: () => void;
}

function formatAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function CDRRMOAuditPreview({ entries, onViewAudit }: CDRRMOAuditPreviewProps) {
  return (
    <Card className="h-full border-slate-200 shadow-sm">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-[#1E3A8A]"><ShieldCheck className="size-4" /> Audit Log Preview</CardTitle>
        <p className="mt-1 text-xs text-slate-500">Latest accountable system activity</p>
      </CardHeader>
      <CardContent className="flex h-[calc(100%-75px)] min-h-0 flex-col p-5 pt-1">
        <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-start justify-between gap-4 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-slate-800">{formatAction(entry.action)}</span>
                <span className="mt-1 block truncate text-[10px] font-medium uppercase tracking-wide text-slate-400">{entry.actorName} · {entry.entityType}</span>
              </span>
              <span className="shrink-0 text-[10px] font-semibold text-slate-500">{formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}</span>
            </div>
          ))}
          {entries.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No audit activity has been recorded yet.</p> : null}
        </div>
        <Button type="button" className="mt-4 w-full bg-[#1E3A8A] text-xs font-bold hover:bg-[#172F6E]" onClick={onViewAudit}>View audit log</Button>
      </CardContent>
    </Card>
  );
}
