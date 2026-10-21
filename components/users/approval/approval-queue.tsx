"use client";

import { Applicant, IncompleteApplicant } from "@/types/approval";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ApprovalQueueProps {
  applicants: Applicant[];
  incompleteApplicants: IncompleteApplicant[];
  selectedId?: string;
  onSelect: (applicant: Applicant) => void;
  summary: {
    pending: number;
    reviewedToday: number;
  };
}

export function ApprovalQueue({
  applicants,
  incompleteApplicants,
  selectedId,
  onSelect,
  summary,
}: ApprovalQueueProps) {
  return (
    <div className="flex flex-col h-full bg-slate-50/50 border-r">
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-bold text-[#1E3A8A] mb-4">Verification Gate</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative h-24 overflow-hidden rounded-xl border border-[#1E3A8A] bg-[#1E3A8A] p-4 text-white shadow-sm">
            <div className="absolute inset-0 bg-black/5" />
            <p className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-white/80">Ready for Review</p>
            <p className="relative z-10 mt-1 text-2xl font-black leading-none">{summary.pending}</p>
          </div>
          <div className="relative h-24 overflow-hidden rounded-xl border border-emerald-700 bg-emerald-700 p-4 text-white shadow-sm">
            <div className="absolute inset-0 bg-black/5" />
            <p className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-white/80">Reviewed Today</p>
            <p className="relative z-10 mt-1 text-2xl font-black leading-none">{summary.reviewedToday}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
        <div className="p-4 space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
            Application Queue
          </p>
          {applicants.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-slate-500">No pending approvals</p>
            </div>
          ) : (
            applicants.map((applicant) => (
              <Card
                key={applicant.id}
                className={cn(
                  "p-4 cursor-pointer transition-all hover:border-[#1E3A8A] border-2",
                  selectedId === applicant.id
                    ? "border-[#1E3A8A] bg-blue-50/30 shadow-sm"
                    : "border-transparent bg-white shadow-none"
                )}
                onClick={() => onSelect(applicant)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-900 leading-tight">
                    {applicant.fullName}
                  </h3>
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] h-5">
                    PENDING
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#1E3A8A] uppercase">
                    {applicant.roleRequested.replace("_", " ")}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Registered {formatDistanceToNow(new Date(applicant.registeredAt))} ago
                  </p>
                </div>
              </Card>
            ))
          )}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-bold text-amber-800">
              Awaiting ID ({incompleteApplicants.length})
            </h3>
            <p className="text-xs text-slate-600 mt-2 mb-3">
              These accounts exist, but an ID has not been submitted. Ask the
              applicant to sign in and select Upload Identity Document.
              Approval becomes available after the upload succeeds.
            </p>
            {incompleteApplicants.map(applicant => (
              <div key={applicant.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-2">
                <p className="font-semibold text-sm text-slate-900">{applicant.fullName}</p>
                <p className="text-xs text-slate-600 break-all">{applicant.email}</p>
                <p className="text-xs text-slate-600">{applicant.phone}</p>
                <p className="text-xs font-medium text-amber-800 mt-1">ID upload required</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
