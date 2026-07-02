"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { VerificationRequest, VerificationStatus } from "@/types/verification"
import { formatDistanceToNow } from "date-fns"

interface SummaryCardProps {
  label: string
  count: number
  className: string
  isActive: boolean
  onClick: () => void
}

function SummaryCard({ label, count, className, isActive, onClick }: SummaryCardProps) {
  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all border border-slate-200/60 shadow-sm",
        isActive ? "ring-2 ring-[#1E3A8A] ring-offset-1 border-[#1E3A8A]/50 bg-white" : "hover:bg-slate-50",
        className
      )}
      onClick={onClick}
    >
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="text-2xl font-black mt-1 text-slate-800">{count}</div>
    </Card>
  )
}

interface VerificationQueueProps {
  requests: VerificationRequest[]
  selectedId: string | null
  onSelect: (request: VerificationRequest) => void
  filter: VerificationStatus
  onFilterChange: (status: VerificationStatus) => void
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

  const counts = {
    PENDING: requests.filter((r) => r.status === "PENDING" || needsManualDispatch(r)).length,
    VERIFIED: requests.filter((r) => r.status === "VERIFIED" && !needsManualDispatch(r)).length,
    REJECTED: requests.filter((r) => r.status === "REJECTED").length,
  }

  const filteredRequests = requests.filter((r) => {
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
    if (filter === "PENDING") {
      return new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
    }
    return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
  });

  return (
    <div className="flex flex-col h-full gap-4 w-80 shrink-0 border-r bg-white p-4">
      <div className="grid grid-cols-1 gap-3">
        <SummaryCard
          label="Pending"
          count={counts.PENDING}
          className="bg-amber-50/40 border-amber-200/50"
          isActive={filter === "PENDING"}
          onClick={() => onFilterChange("PENDING")}
        />
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="Verified"
            count={counts.VERIFIED}
            className="bg-emerald-50/40 border-emerald-200/50"
            isActive={filter === "VERIFIED"}
            onClick={() => onFilterChange("VERIFIED")}
          />
          <SummaryCard
            label="Rejected"
            count={counts.REJECTED}
            className="bg-rose-50/40 border-rose-200/50"
            isActive={filter === "REJECTED"}
            onClick={() => onFilterChange("REJECTED")}
          />
        </div>
      </div>

      <div className="font-semibold text-sm mt-2">Queue List</div>

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
