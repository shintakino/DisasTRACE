"use client";

import { Applicant } from "@/types/approval";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ApprovalQueueProps {
  applicants: Applicant[];
  selectedId?: string;
  onSelect: (applicant: Applicant) => void;
  summary: {
    pending: number;
    reviewedToday: number;
  };
}

export function ApprovalQueue({
  applicants,
  selectedId,
  onSelect,
  summary,
}: ApprovalQueueProps) {
  return (
    <div className="flex flex-col h-full bg-slate-50/50 border-r">
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-bold text-[#1E3A8A] mb-4">Verification Gate</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
            <p className="text-xs text-orange-600 font-semibold uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-bold text-orange-700">{summary.pending}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Reviewed Today</p>
            <p className="text-2xl font-bold text-blue-700">{summary.reviewedToday}</p>
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
        </div>
      </div>
    </div>
  );
}
