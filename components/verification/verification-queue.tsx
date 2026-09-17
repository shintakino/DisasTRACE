"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  classifyActiveVerificationBucket,
  classifyVerificationQueueItem,
} from "@/lib/rejected-report-workflow"
import { cn } from "@/lib/utils"
import { VerificationRequest } from "@/types/verification"
import { formatDistanceToNow } from "date-fns"
import { compareActiveVerificationItems, getVerificationPriorityReason, isNewVerificationItem } from "@/lib/verification-queue-priority"

interface SummaryCardProps {
  label: string
  count: number
  gradient: string
  isActive: boolean
  onClick: () => void
}

function SummaryCard({ label, count, gradient, isActive, onClick }: SummaryCardProps) {
  return (
    <Card
      className={cn(
        "p-3 cursor-pointer transition-all relative overflow-hidden flex flex-col rounded-xl",
        gradient,
        isActive 
          ? "border-transparent bg-gradient-to-br text-white shadow-md ring-2 ring-offset-1 ring-[#1E3A8A]/30"
          : "border-slate-200 bg-white text-slate-700 shadow-none hover:border-slate-300 hover:bg-slate-50"
      )}
      onClick={onClick}
    >
      {isActive ? <div className="absolute inset-0 bg-black/[0.03]" /> : null}
      <div className={cn("relative z-10 text-xs font-extrabold uppercase tracking-wide", isActive ? "text-white/85" : "text-slate-600")}>
        {label}
      </div>
      <div className={cn("relative z-10 mt-1 text-2xl font-black leading-none", isActive ? "text-white" : "text-slate-900")}>
        {count}
      </div>
    </Card>
  )
}

export type VerificationQueueFilter = 'ACTION' | 'REVIEW' | 'AWAITING' | 'REJECTED' | 'CASE_CLOSED';

function queueState(request: VerificationRequest) {
  return {
    requestStatus: request.status,
    incidentStatus: request.incident?.status,
    triageClassification: request.triageClassification,
    requiresPaccReassignment: request.requiresPaccReassignment,
    responderId: request.incident?.responderId,
    currentOfferResponderId: request.incident?.currentOfferResponderId,
  }
}

interface VerificationQueueProps {
  requests: VerificationRequest[]
  selectedId: string | null
  onSelect: (request: VerificationRequest) => void
  filter: VerificationQueueFilter
  onFilterChange: (status: VerificationQueueFilter) => void
}

export function VerificationQueue({
  requests,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
}: VerificationQueueProps) {
  const bucketFor = (request: VerificationRequest) =>
    classifyActiveVerificationBucket(queueState(request))
  const outcomeFor = (request: VerificationRequest) =>
    classifyVerificationQueueItem(queueState(request))
  const counts = {
    ACTION: requests.filter((request) => bucketFor(request) === 'ACTION').length,
    REVIEW: requests.filter((request) => bucketFor(request) === 'REVIEW').length,
    AWAITING: requests.filter((request) => bucketFor(request) === 'AWAITING').length,
    REJECTED: requests.filter((request) => outcomeFor(request) === 'REJECTED').length,
    CASE_CLOSED: requests.filter((request) => outcomeFor(request) === 'CASE_CLOSED').length,
  }

  const filteredRequests = requests.filter((r) => {
    if (filter === "ACTION" || filter === "REVIEW" || filter === 'AWAITING') return bucketFor(r) === filter
    return outcomeFor(r) === filter
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => (
    filter === 'ACTION' || filter === 'REVIEW'
      ? compareActiveVerificationItems(a, b)
      : new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  ));

  const classificationLabel = (request: VerificationRequest) => {
    switch (request.triageClassification) {
      case "HIGH_CONFIDENCE_EMERGENCY":
        return "High-confidence emergency";
      case "HIGH_CONFIDENCE_NON_EMERGENCY":
        return "High-confidence non-emergency";
      case "SUSPICIOUS_POSSIBLE_PRANK":
        return "Suspicious / possible prank";
      default:
        return "Uncertain / incomplete";
    }
  };

  return (
    <div className="flex h-full w-80 shrink-0 flex-col gap-2 border-r bg-white p-3">
      <div className="grid grid-cols-2 gap-2">
        <SummaryCard
          label="For Action"
          count={counts.ACTION}
          gradient="from-[#4776E6] to-[#3843D0]"
          isActive={filter === "ACTION"}
          onClick={() => onFilterChange("ACTION")}
        />
        <SummaryCard
          label="For Review"
          count={counts.REVIEW}
          gradient="from-[#F97316] to-[#FB923C]"
          isActive={filter === "REVIEW"}
          onClick={() => onFilterChange("REVIEW")}
        />
        <SummaryCard
          label="Awaiting"
          count={counts.AWAITING}
          gradient="from-[#0369A1] to-[#0284C7]"
          isActive={filter === "AWAITING"}
          onClick={() => onFilterChange("AWAITING")}
        />
        <SummaryCard
          label="Rejected"
          count={counts.REJECTED}
          gradient="from-[#DC2626] to-[#EF4444]"
          isActive={filter === "REJECTED"}
          onClick={() => onFilterChange("REJECTED")}
        />
        <SummaryCard
          label="Case Closed"
          count={counts.CASE_CLOSED}
          gradient="from-[#15803D] to-[#22C55E]"
          isActive={filter === "CASE_CLOSED"}
          onClick={() => onFilterChange("CASE_CLOSED")}
        />
      </div>

      <div className="font-semibold text-sm mt-2">
        {filter === 'ACTION'
          ? 'Active Queue · For Action'
          : filter === 'REVIEW'
            ? 'Active Queue · For Review'
            : filter === 'AWAITING'
              ? 'Background Dispatch · Awaiting Responder'
            : filter === 'REJECTED'
              ? 'Rejected Records'
              : 'Case Closed Records'}
      </div>

      <div 
        className="flex-1 -mx-4 px-4 overflow-y-auto pacc-queue-scroll pr-2"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "oklch(0.708 0 0 / 40%) transparent"
        }}
      >
        <div className="flex flex-col gap-1.5 py-1.5">
          {sortedRequests.map((request, index) => {
            const isPriority = (filter === 'ACTION' || filter === 'REVIEW') && index === 0;
            return (
            <Card
              key={request.id}
              className={cn(
                "cursor-pointer transition-colors hover:bg-accent",
                isPriority ? "border-red-200 bg-red-50/60 p-4 shadow-sm" : "p-3",
                selectedId === request.id && "border-primary ring-1 ring-primary"
              )}
              onClick={() => onSelect(request)}
            >
              {isPriority ? (
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge className="bg-red-700 text-[11px] font-black uppercase tracking-wide">Priority now</Badge>
                  <span className="text-xs font-semibold text-red-800">{getVerificationPriorityReason(request)}</span>
                </div>
              ) : null}
              <div className="mb-1 flex items-start justify-between gap-1">
                <span className="font-mono text-xs font-bold text-muted-foreground">
                  {request.requestId}
                </span>
                <div className="flex items-center gap-1">
                {isNewVerificationItem(request.receivedAt) && (filter === 'ACTION' || filter === 'REVIEW') ? (
                  <Badge className="bg-red-600 px-1.5 py-0 text-xs">NEW</Badge>
                ) : null}
                <Badge className={cn(
                  "px-1.5 py-0 text-xs",
                  request.severity === 'Critical' ? 'bg-red-700' : request.severity === 'High' ? 'bg-orange-600' : 'bg-slate-500',
                )}>{request.severity}</Badge>
                <Badge
                  variant={request.nature === "EMERGENCY" ? "default" : "secondary"}
                  className={cn(
                    "px-1.5 py-0 text-xs",
                    request.nature === "EMERGENCY" ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-500 hover:bg-gray-600"
                  )}
                >
                  {request.nature}
                </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className={cn("truncate font-bold leading-tight", isPriority ? "text-lg" : "text-sm")}>{request.type}</div>
                <div className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(request.receivedAt), { addSuffix: true })}
                </div>
              </div>
              <div className="truncate text-xs font-semibold text-[#1E3A8A]">{classificationLabel(request)}</div>
              {filter === 'AWAITING' ? (
                <div className="mt-1 text-xs font-semibold text-sky-800">
                  Offer pending{request.incident?.offerExpiresAt ? ` · expires ${new Date(request.incident.offerExpiresAt).toLocaleTimeString()}` : ''}. You may continue other work.
                </div>
              ) : null}
              <div className={cn("truncate text-slate-600", isPriority ? "mt-1 text-sm font-medium" : "text-xs")}>{request.location}</div>
              {(filter === 'REJECTED' || filter === 'CASE_CLOSED') && (
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-2 text-xs font-bold uppercase",
                    filter === 'REJECTED'
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-green-200 bg-green-50 text-green-700",
                  )}
                >
                  {filter === 'REJECTED' ? 'Rejected' : 'Case Closed'}
                </Badge>
              )}
            </Card>
          )})}
          {sortedRequests.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm italic">
              No {filter.toLowerCase()} requests
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
