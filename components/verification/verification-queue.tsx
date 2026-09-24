"use client"

import { useDeferredValue, useState } from "react"
import { ImageOff, Search } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { classifyActiveVerificationBucket, classifyVerificationQueueItem, classifyVerificationWorkspaceFilter, type VerificationWorkspaceFilter } from "@/lib/rejected-report-workflow"
import { compareActiveVerificationItems, getVerificationPriorityReason, isNewVerificationItem } from "@/lib/verification-queue-priority"
import { cn } from "@/lib/utils"
import type { VerificationRequest } from "@/types/verification"

interface SummaryCardProps { label: string; count: number; activeClassName: string; isActive: boolean; onClick: () => void }

function SummaryCard({ label, count, activeClassName, isActive, onClick }: SummaryCardProps) {
  return <button type="button" aria-pressed={isActive} onClick={onClick} className={cn("relative flex min-w-0 flex-col overflow-hidden rounded-lg border p-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-offset-1", isActive ? cn("border-transparent text-white shadow-sm", activeClassName) : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50")}>
    {isActive ? <span className="absolute inset-0 bg-black/[0.03]" /> : null}
    <span className={cn("relative text-[9px] font-extrabold uppercase leading-tight tracking-wide", isActive ? "text-white/85" : "text-slate-600")}>{label}</span>
    <span className={cn("relative mt-1 text-xl font-black leading-none", isActive ? "text-white" : "text-slate-900")}>{count}</span>
  </button>
}

export type VerificationQueueFilter = VerificationWorkspaceFilter

function queueState(request: VerificationRequest) {
  return { requestStatus: request.status, incidentStatus: request.incident?.status, triageClassification: request.triageClassification, requiresPaccReassignment: request.requiresPaccReassignment, responderId: request.incident?.responderId, currentOfferResponderId: request.incident?.currentOfferResponderId }
}

function classificationLabel(request: VerificationRequest) {
  switch (request.triageClassification) {
    case "HIGH_CONFIDENCE_EMERGENCY": return "High-confidence emergency"
    case "HIGH_CONFIDENCE_NON_EMERGENCY": return "High-confidence non-emergency"
    case "SUSPICIOUS_POSSIBLE_PRANK": return "Suspicious / possible prank"
    default: return "Uncertain / incomplete"
  }
}

interface VerificationQueueProps { requests: VerificationRequest[]; selectedId: string | null; onSelect: (request: VerificationRequest) => void; filter: VerificationQueueFilter; onFilterChange: (status: VerificationQueueFilter) => void }

export function VerificationQueue({ requests, selectedId, onSelect, filter, onFilterChange }: VerificationQueueProps) {
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase())
  const bucketFor = (request: VerificationRequest) => classifyActiveVerificationBucket(queueState(request))
  const outcomeFor = (request: VerificationRequest) => classifyVerificationQueueItem(queueState(request))
  const filterFor = (request: VerificationRequest) => classifyVerificationWorkspaceFilter(queueState(request))
  const counts = {
    ACTION: requests.filter((request) => bucketFor(request) === "ACTION").length,
    REVIEW: requests.filter((request) => { const bucket = bucketFor(request); return bucket === "REVIEW" || bucket === "AWAITING" }).length,
    CLOSED: requests.filter((request) => filterFor(request) === "CLOSED").length,
    REJECTED: requests.filter((request) => outcomeFor(request) === "REJECTED").length,
  }
  const visibleRequests = requests.filter((request) => {
    if (filterFor(request) !== filter) return false
    if (!deferredSearch) return true
    return [request.requestId, request.type, request.location, request.resident.fullName].some((value) => value.toLocaleLowerCase().includes(deferredSearch))
  })
  const sortedRequests = [...visibleRequests].sort((first, second) => filter === "ACTION" || filter === "REVIEW" ? compareActiveVerificationItems(first, second) : new Date(second.receivedAt).getTime() - new Date(first.receivedAt).getTime())
  const queueLabel = filter === "ACTION" ? "Active Queue · For Action" : filter === "REVIEW" ? "Active Queue · For Review" : filter === "REJECTED" ? "Rejected Records" : "Closed Records"

  return <aside className="flex h-full w-[340px] shrink-0 flex-col gap-3 border-r border-slate-200 bg-slate-50/80 p-3">
    <div className="flex items-center justify-between px-1 pt-1"><div><h2 className="text-base font-black text-[#123B82]">Incident Queue</h2><p className="text-[11px] text-slate-500">Live operational reports</p></div><Badge variant="outline" className="border-blue-100 bg-blue-50 text-xs font-bold text-[#1E3A8A]">Total: {requests.length}</Badge></div>
    <div className="grid grid-cols-4 gap-1.5"><SummaryCard label="For Action" count={counts.ACTION} activeClassName="bg-[#1E3A8A]" isActive={filter === "ACTION"} onClick={() => onFilterChange("ACTION")} /><SummaryCard label="For Review" count={counts.REVIEW} activeClassName="bg-blue-600" isActive={filter === "REVIEW"} onClick={() => onFilterChange("REVIEW")} /><SummaryCard label="Closed" count={counts.CLOSED} activeClassName="bg-emerald-600" isActive={filter === "CLOSED"} onClick={() => onFilterChange("CLOSED")} /><SummaryCard label="Rejected" count={counts.REJECTED} activeClassName="bg-red-700" isActive={filter === "REJECTED"} onClick={() => onFilterChange("REJECTED")} /></div>
    <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reports..." aria-label="Search incident reports" className="h-9 border-slate-200 bg-white pl-8 text-xs" /></div>
    <div className="border-t border-slate-200 pt-3 text-sm font-semibold">{queueLabel}</div>
    <div className="-mx-4 flex-1 overflow-y-auto px-4 pr-2 pacc-queue-scroll" style={{ scrollbarWidth: "thin", scrollbarColor: "oklch(0.708 0 0 / 40%) transparent" }}><div className="flex flex-col gap-1.5 py-1.5">
      {sortedRequests.map((request, index) => {
        const isPriority = (filter === "ACTION" || filter === "REVIEW") && index === 0
        const isAwaiting = bucketFor(request) === "AWAITING"
        return <Card key={request.id} className={cn("cursor-pointer border-slate-200 bg-white p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/30", isPriority && "border-red-200 bg-red-50/60 shadow-sm", selectedId === request.id && "border-primary ring-1 ring-primary")} onClick={() => onSelect(request)}>
          {isPriority ? <div className="mb-2 flex items-center justify-between gap-2"><Badge className="bg-red-700 text-[11px] font-black uppercase tracking-wide">Priority now</Badge><span className="text-xs font-semibold text-red-800">{getVerificationPriorityReason(request)}</span></div> : null}
          <div className="flex gap-2"><div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-100">{request.imageUrl ? <img src={request.imageUrl} alt="Submitted report evidence" className="size-full object-cover" /> : <ImageOff className="size-4 text-slate-400" aria-label="No submitted evidence photo" />}</div><div className="min-w-0 flex-1"><div className="mb-1 flex items-start justify-between gap-1"><span className="font-mono text-[11px] font-bold text-muted-foreground">{request.requestId}</span><div className="flex shrink-0 items-center gap-1">{isNewVerificationItem(request.receivedAt) && (filter === "ACTION" || filter === "REVIEW") ? <Badge className="bg-red-600 px-1.5 py-0 text-xs">NEW</Badge> : null}<Badge className={cn("px-1.5 py-0 text-xs", request.severity === "Critical" ? "bg-red-700" : request.severity === "High" ? "bg-orange-600" : "bg-slate-500")}>{request.severity}</Badge></div></div><div className="flex items-center justify-between gap-2"><div className={cn("truncate font-bold leading-tight text-[#123B82]", isPriority ? "text-base" : "text-sm")}>{request.type}</div><div className="whitespace-nowrap text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(request.receivedAt), { addSuffix: true })}</div></div><div className="truncate text-xs font-semibold text-[#1E3A8A]">{classificationLabel(request)}</div></div></div>
          {request.relatedReports.length > 0 ? <div className="mt-1 text-xs font-bold text-violet-800">{request.relatedReports.length} related report{request.relatedReports.length === 1 ? "" : "s"}{request.relatedReports.some((related) => related.relation === "PACC_REVIEW") ? " awaiting review" : ""}</div> : null}
          {isAwaiting ? <div className="mt-1 text-xs font-semibold text-sky-800">Offer pending{request.incident?.offerExpiresAt ? ` · expires ${new Date(request.incident.offerExpiresAt).toLocaleTimeString()}` : ""}. You may continue other work.</div> : null}
          <div className={cn("truncate text-slate-600", isPriority ? "mt-1 text-sm font-medium" : "text-xs")}>{request.location}</div>
          {(filter === "REJECTED" || filter === "CLOSED") ? <Badge variant="outline" className={cn("mt-2 text-xs font-bold uppercase", filter === "REJECTED" ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700")}>{filter === "REJECTED" ? "Rejected" : "Closed"}</Badge> : null}
        </Card>
      })}
      {sortedRequests.length === 0 ? <div className="py-8 text-center text-sm italic text-muted-foreground">No {filter.toLowerCase()} requests{search ? " matching your search" : ""}</div> : null}
    </div></div>
  </aside>
}
