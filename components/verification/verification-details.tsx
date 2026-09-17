"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { TriageClassification, VerificationRequest } from "@/types/verification"
import { formatDistanceToNow } from "date-fns"
import { MapPin, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface VerificationDetailsProps {
  request: VerificationRequest | null
  onOverrideClassification: (id: string, value: TriageClassification) => void
  onUpdateCoordination: (id: string, agencies: string[]) => void
  isProcessing: boolean
}

const AGENCIES = ['PNP', 'BFP', 'CDRRMO', 'Barangay', 'DSWD', 'Hospital'];

export function VerificationDetails({ request, onOverrideClassification, onUpdateCoordination, isProcessing }: VerificationDetailsProps) {
  if (!request) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground italic">
        Select a verification request to view details
      </div>
    )
  }

  const isPendingDispatch = request.requiresPaccReassignment === true || (
    request.status === "VERIFIED" &&
    request.incident && 
    request.incident.status === "DISPATCHED" &&
    !request.incident.responderId &&
    !request.incident.currentOfferResponderId
  );
  const isAwaitingResponder = request.status === 'VERIFIED'
    && request.incident?.status === 'DISPATCHED'
    && !request.incident.responderId
    && Boolean(request.incident.currentOfferResponderId);
  const isTerminal = request.status === 'REJECTED'
    || request.status === 'DUPLICATE'
    || request.incident?.status === 'RESOLVED';
  const controlsDisabled = isProcessing || isTerminal || isAwaitingResponder;

  const displayStatus = isPendingDispatch ? "PACC REASSIGNMENT REQUIRED" : isAwaitingResponder ? 'AWAITING RESPONDER' : request.incident?.status === 'RESOLVED' ? 'CASE CLOSED' : request.status;
  const classification = request.triageClassification || "UNCERTAIN_INCOMPLETE";
  const triageReasons = request.triageReasons?.length
    ? request.triageReasons
    : ["No automated verification details were recorded."];
  const coordinationAgencies = request.coordinationAgencies ?? [];
  const recommendedAction = isPendingDispatch
    ? 'Dispatch an eligible responder now.'
    : request.status === 'PENDING'
      ? 'Verify the incident details, then accept, reject, or merge this report.'
      : request.status === 'REJECTED'
        ? 'Review the recorded reason; no dispatch action is available.'
        : isAwaitingResponder
          ? `Continue other work while the responder offer is pending${request.incident?.offerExpiresAt ? ` until ${new Date(request.incident.offerExpiresAt).toLocaleTimeString()}` : ''}.`
          : request.incident?.status === 'RESOLVED'
            ? 'This response is Case Closed. Review the record; operational actions are disabled.'
            : 'Monitor the active response and coordination status.';

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-white">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold">{request.requestId}</h2>
          <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
            <span>Received {formatDistanceToNow(new Date(request.receivedAt), { addSuffix: true })}</span>
            <span>•</span>
            <Badge 
              variant="outline" 
              className={cn(
                "font-semibold uppercase text-xs",
                isPendingDispatch && "bg-red-100 text-red-800 border-red-200"
              )}
            >
              {displayStatus}
            </Badge>
          </div>
        </div>
      </div>

      <Card className="mb-6 shrink-0 border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Incident essentials</div>
            <h3 className="mt-1 text-xl font-black text-slate-950">{request.type}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge className={cn(
                request.severity === 'Critical' ? 'bg-red-700' : request.severity === 'High' ? 'bg-orange-600' : 'bg-slate-600',
              )}>{request.severity} severity</Badge>
              <Badge variant="outline">{request.nature}</Badge>
              <Badge variant="outline">{request.peopleInvolved} affected</Badge>
            </div>
          </div>
          <div className="max-w-sm rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
            <div className="text-xs font-bold uppercase tracking-wide text-blue-700">Recommended next action</div>
            <p className="mt-1 font-semibold">{recommendedAction}</p>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 border-t border-slate-200 pt-4 text-sm font-medium text-slate-700">
          <MapPin className="mt-0.5 size-4 shrink-0 text-[#1E3A8A]" />
          <span>{request.location}</span>
        </div>
      </Card>

      <Card className="mb-6 shrink-0 p-4 border-amber-200 bg-amber-50/50">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-900">Automated initial verification</div>
        <div className="mt-1 font-bold text-sm text-slate-900">{classification.replaceAll('_', ' ')}</div>
        <div className="mt-1 text-xs text-slate-600">{triageReasons.join(' ')}</div>
        <label className="mt-3 block text-xs font-semibold text-slate-700">PACC override</label>
        <select disabled={controlsDisabled} aria-disabled={controlsDisabled} value={classification} onChange={(event) => onOverrideClassification(request.id, event.target.value as TriageClassification)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500">
          <option value="HIGH_CONFIDENCE_EMERGENCY">High-confidence emergency</option>
          <option value="HIGH_CONFIDENCE_NON_EMERGENCY">High-confidence non-emergency</option>
          <option value="UNCERTAIN_INCOMPLETE">Uncertain / incomplete</option>
          <option value="SUSPICIOUS_POSSIBLE_PRANK">Suspicious / possible prank</option>
        </select>
      </Card>

      <Card className="mb-6 shrink-0 p-4 border-blue-200 bg-blue-50/50">
        <div className="text-xs font-bold uppercase tracking-wider text-blue-900">PACC agency coordination</div>
        <p className="mt-1 text-xs text-slate-600">Select every agency PACC is actively coordinating with. The reporter sees this status immediately.</p>
        <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Agencies being coordinated by PACC">
          {AGENCIES.map((agency) => {
            const active = coordinationAgencies.includes(agency)
            return <label key={agency} className={cn('flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold transition-colors', active ? 'border-[#1E3A8A] bg-[#1E3A8A] text-white' : 'border-blue-300 bg-white text-[#1E3A8A] hover:bg-blue-100', controlsDisabled && 'cursor-not-allowed opacity-60')}>
              <input
                type="checkbox"
                checked={active}
                disabled={controlsDisabled}
                onChange={() => onUpdateCoordination(request.id, active ? coordinationAgencies.filter((item) => item !== agency) : [...coordinationAgencies, agency])}
                className="size-4 shrink-0 accent-[#1E3A8A]"
              />
              <span>{agency}</span>
            </label>
          })}
        </div>
      </Card>

      <div className="relative mb-8 max-h-80 shrink-0 overflow-hidden rounded-xl border bg-muted shadow-sm aspect-video">
        {request.imageUrl ? (
          <img
            src={request.imageUrl}
            alt="User submitted scene"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground flex-col gap-2">
            <Info className="w-8 h-8 opacity-20" />
            <span>No image submitted</span>
          </div>
        )}
        <div className="absolute top-4 right-4">
          <Badge className="bg-black/60 backdrop-blur-md text-white border-none px-3 py-1">
            USER SUBMITTED
          </Badge>
        </div>
        {request.photoLatitude !== undefined && request.photoLongitude !== undefined && (
          <Badge className="absolute bottom-4 left-4 bg-[#1E3A8A]/90 text-white border-none px-3 py-1">
            Photo GPS {request.photoLatitude.toFixed(5)}, {request.photoLongitude.toFixed(5)}
          </Badge>
        )}
      </div>

    </div>
  )
}
