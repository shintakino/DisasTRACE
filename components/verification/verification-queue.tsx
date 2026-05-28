"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { VerificationRequest, VerificationStatus } from "@/types/verification"
import { formatDistanceToNow } from "date-fns"

interface SummaryCardProps {
  label: string
  count: number
  color: string
  isActive: boolean
  onClick: () => void
}

function SummaryCard({ label, count, color, isActive, onClick }: SummaryCardProps) {
  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all border-2",
        isActive ? "ring-2 ring-primary ring-offset-2" : "hover:bg-accent"
      )}
      style={{ backgroundColor: color }}
      onClick={onClick}
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-2xl font-bold mt-1">{count}</div>
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

  return (
    <div className="flex flex-col h-full gap-4 w-80 shrink-0 border-r bg-muted/30 p-4">
      <div className="grid grid-cols-1 gap-3">
        <SummaryCard
          label="Pending"
          count={counts.PENDING}
          color="#E0F2FE"
          isActive={filter === "PENDING"}
          onClick={() => onFilterChange("PENDING")}
        />
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="Verified"
            count={counts.VERIFIED}
            color="#DCFCE7"
            isActive={filter === "VERIFIED"}
            onClick={() => onFilterChange("VERIFIED")}
          />
          <SummaryCard
            label="Rejected"
            count={counts.REJECTED}
            color="#FEE2E2"
            isActive={filter === "REJECTED"}
            onClick={() => onFilterChange("REJECTED")}
          />
        </div>
      </div>

      <div className="font-semibold text-sm mt-2">Queue List</div>

      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="flex flex-col gap-3 py-2">
          {filteredRequests.map((request) => (
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
          {filteredRequests.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm italic">
              No {filter.toLowerCase()} requests
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
