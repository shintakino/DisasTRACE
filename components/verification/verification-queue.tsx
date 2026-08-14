"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { VerificationRequest, VerificationStatus } from "@/types/verification"
import { formatDistanceToNow } from "date-fns"

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
        "p-4 cursor-pointer transition-all border-none relative overflow-hidden flex flex-col bg-gradient-to-br shadow-sm rounded-2xl",
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
      <div className="text-2xl font-black mt-1 text-white relative z-10 leading-none">
        {count}
      </div>
    </Card>
  )
}

export type VerificationQueueFilter = 'ACTION' | 'REVIEW' | VerificationStatus;

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
  // Helper to determine if a request needs manual PACC dispatch (PACC_MANUAL status and no assigned responder)
  const needsManualDispatch = (r: VerificationRequest) => {
    return (
      r.status === "VERIFIED" &&
      r.incident &&
      r.incident.dispatchMethod === "PACC_MANUAL" &&
      !r.incident.responderId &&
      !r.incident.currentOfferResponderId
    );
  };

  const isActionable = (r: VerificationRequest) => r.status === 'PENDING' || needsManualDispatch(r);
  const isAction = (r: VerificationRequest) => isActionable(r) && (r.triageClassification === 'HIGH_CONFIDENCE_EMERGENCY' || r.triageClassification === 'HIGH_CONFIDENCE_NON_EMERGENCY');
  const isReview = (r: VerificationRequest) => isActionable(r) && (r.triageClassification === 'UNCERTAIN_INCOMPLETE' || r.triageClassification === 'SUSPICIOUS_POSSIBLE_PRANK');
  const counts = {
    ACTION: requests.filter(isAction).length,
    REVIEW: requests.filter(isReview).length,
    VERIFIED: requests.filter((r) => r.status === "VERIFIED" && !needsManualDispatch(r)).length,
    REJECTED: requests.filter((r) => r.status === "REJECTED").length,
  }

  const filteredRequests = requests.filter((r) => {
    if (filter === "ACTION") return isAction(r);
    if (filter === "REVIEW") return isReview(r);
    if (filter === "PENDING") {
      return r.status === "PENDING" || needsManualDispatch(r);
    }
    if (filter === "VERIFIED") {
      return r.status === "VERIFIED" && !needsManualDispatch(r);
    }
    return r.status === filter;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    // Priority 1: Manual dispatch (needs attention right now)
    const aManual = needsManualDispatch(a);
    const bManual = needsManualDispatch(b);
    if (aManual && !bManual) return -1;
    if (!aManual && bManual) return 1;

    // Priority 2: EMERGENCY nature
    if (a.nature === "EMERGENCY" && b.nature !== "EMERGENCY") return -1;
    if (a.nature !== "EMERGENCY" && b.nature === "EMERGENCY") return 1;

    // Priority 3: Oldest first or newest first? Usually older emergencies need immediate attention. Let's do oldest first if they are pending, newest if not.
    // For now, let's keep it oldest first for PENDING queue so older items get handled.
    if (filter === "PENDING" || filter === 'REVIEW') {
      return new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
    }
    return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
  });

  return (
    <div className="flex flex-col h-full gap-4 w-80 shrink-0 border-r bg-white p-4">
      <div className="grid grid-cols-1 gap-3">
        <SummaryCard
          label="For Action"
          count={counts.ACTION}
          gradient="from-[#4776E6] to-[#3843D0]"
          isActive={filter === "ACTION"}
          onClick={() => onFilterChange("ACTION")}
        />
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="For Review"
            count={counts.REVIEW}
            gradient="from-[#F97316] to-[#FB923C]"
            isActive={filter === "REVIEW"}
            onClick={() => onFilterChange("REVIEW")}
          />
          <SummaryCard
            label="Closed"
            count={counts.REJECTED}
            gradient="from-[#FF416C] to-[#FF4B2B]"
            isActive={filter === "REJECTED"}
            onClick={() => onFilterChange("REJECTED")}
          />
        </div>
      </div>

      <div className="font-semibold text-sm mt-2">{filter === 'ACTION' ? 'For Action' : filter === 'REVIEW' ? 'For Review' : 'Queue List'}</div>

      <div 
        className="flex-1 -mx-4 px-4 overflow-y-auto pacc-queue-scroll pr-2"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "oklch(0.708 0 0 / 40%) transparent"
        }}
      >
        <div className="flex flex-col gap-3 py-2">
          {sortedRequests.map((request) => (
            <Card
              key={request.id}
              className={cn(
                "p-3 cursor-pointer transition-colors hover:bg-accent",
                selectedId === request.id && "border-primary ring-1 ring-primary"
              )}
              onClick={() => onSelect(request)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-mono font-bold text-muted-foreground">
                  {request.requestId}
                </span>
                <Badge
                  variant={request.nature === "EMERGENCY" ? "default" : "secondary"}
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    request.nature === "EMERGENCY" ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-500 hover:bg-gray-600"
                  )}
                >
                  {request.nature}
                </Badge>
              </div>
              <div className="font-bold text-sm leading-tight mb-1">
                {request.type}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {request.location}
              </div>
              <div className="text-[10px] text-muted-foreground mt-2">
                {formatDistanceToNow(new Date(request.receivedAt), { addSuffix: true })}
              </div>
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
