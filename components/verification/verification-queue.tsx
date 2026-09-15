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
import { compareActiveVerificationItems, isNewVerificationItem } from "@/lib/verification-queue-priority"

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
        "p-3 cursor-pointer transition-all border-none relative overflow-hidden flex flex-col bg-gradient-to-br shadow-sm rounded-xl",
        gradient,
        isActive 
          ? "opacity-100 scale-100 shadow-md ring-2 ring-offset-1 ring-[#1E3A8A]/30" 
          : "opacity-45 hover:opacity-75 scale-95 hover:scale-[0.97]"
      )}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-black/[0.03]" />
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-white/80 relative z-10">
        {label}
      </div>
      <div className="text-xl font-black mt-1 text-white relative z-10 leading-none">
        {count}
      </div>
    </Card>
  )
}

export type VerificationQueueFilter = 'ACTION' | 'REVIEW' | 'REJECTED' | 'CASE_CLOSED';

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
    REJECTED: requests.filter((request) => outcomeFor(request) === 'REJECTED').length,
    CASE_CLOSED: requests.filter((request) => outcomeFor(request) === 'CASE_CLOSED').length,
  }

  const filteredRequests = requests.filter((r) => {
    if (filter === "ACTION" || filter === "REVIEW") return bucketFor(r) === filter
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
    <div className="flex flex-col h-full gap-2 w-72 shrink-0 border-r bg-white p-3">
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
          {sortedRequests.map((request) => (
            <Card
              key={request.id}
              className={cn(
                "p-2 cursor-pointer transition-colors hover:bg-accent",
                selectedId === request.id && "border-primary ring-1 ring-primary"
              )}
              onClick={() => onSelect(request)}
            >
              <div className="flex justify-between items-start gap-1 mb-1">
                <span className="text-[10px] font-mono font-bold text-muted-foreground">
                  {request.requestId}
                </span>
                <div className="flex items-center gap-1">
                {isNewVerificationItem(request.receivedAt) && (filter === 'ACTION' || filter === 'REVIEW') ? (
                  <Badge className="bg-red-600 text-[9px] px-1.5 py-0">NEW</Badge>
                ) : null}
                <Badge className={cn(
                  "text-[9px] px-1.5 py-0",
                  request.severity === 'Critical' ? 'bg-red-700' : request.severity === 'High' ? 'bg-orange-600' : 'bg-slate-500',
                )}>{request.severity}</Badge>
                <Badge
                  variant={request.nature === "EMERGENCY" ? "default" : "secondary"}
                  className={cn(
                    "text-[9px] px-1.5 py-0",
                    request.nature === "EMERGENCY" ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-500 hover:bg-gray-600"
                  )}
                >
                  {request.nature}
                </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-sm leading-tight truncate">{request.type}</div>
                <div className="text-[9px] text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(request.receivedAt), { addSuffix: true })}
                </div>
              </div>
              <div className="text-[10px] font-semibold text-[#1E3A8A] truncate">{classificationLabel(request)}</div>
              <div className="text-[10px] text-muted-foreground truncate">{request.location}</div>
              {(filter === 'REJECTED' || filter === 'CASE_CLOSED') && (
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-2 text-[9px] font-bold uppercase",
                    filter === 'REJECTED'
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-green-200 bg-green-50 text-green-700",
                  )}
                >
                  {filter === 'REJECTED' ? 'Rejected' : 'Case Closed'}
                </Badge>
              )}
            </Card>
          ))}
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
