"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { TriageClassification, VerificationRequest } from "@/types/verification"
import { formatDistanceToNow } from "date-fns"
import { MapPin, Users, Info, AlertTriangle } from "lucide-react"
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

  const isPendingDispatch = request.status === "VERIFIED" && 
    request.incident && 
    request.incident.dispatchMethod === "PACC_MANUAL" &&
    !request.incident.responderId &&
    !request.incident.currentOfferResponderId;

  const displayStatus = isPendingDispatch ? "EMERGENCY (PENDING DISPATCH)" : request.status;

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
                "font-semibold uppercase text-[10px]",
                isPendingDispatch && "bg-red-100 text-red-800 border-red-200"
              )}
            >
              {displayStatus}
            </Badge>
          </div>
        </div>
      </div>

      <Card className="mb-6 shrink-0 p-4 border-amber-200 bg-amber-50/50">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-900">Automated initial verification</div>
        <div className="mt-1 font-bold text-sm text-slate-900">{request.triageClassification.replaceAll('_', ' ')}</div>
        <div className="mt-1 text-xs text-slate-600">{request.triageReasons.join(' ')}</div>
        <label className="mt-3 block text-xs font-semibold text-slate-700">PACC override</label>
        <select disabled={isProcessing} value={request.triageClassification} onChange={(event) => onOverrideClassification(request.id, event.target.value as TriageClassification)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
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
            const active = request.coordinationAgencies.includes(agency)
            return <label key={agency} className={cn('flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold transition-colors', active ? 'border-[#1E3A8A] bg-[#1E3A8A] text-white' : 'border-blue-300 bg-white text-[#1E3A8A] hover:bg-blue-100', isProcessing && 'cursor-not-allowed opacity-60')}>
              <input
                type="checkbox"
                checked={active}
                disabled={isProcessing}
                onChange={() => onUpdateCoordination(request.id, active ? request.coordinationAgencies.filter((item) => item !== agency) : [...request.coordinationAgencies, agency])}
                className="size-4 shrink-0 accent-[#1E3A8A]"
              />
              <span>{agency}</span>
            </label>
          })}
        </div>
      </Card>

      <div className="relative mb-8 shrink-0 overflow-hidden rounded-xl border bg-muted shadow-sm aspect-video">
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
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Incident Information
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Nature of Call</div>
                  <div className="font-semibold">{request.nature}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Type of Emergency</div>
                  <div className="font-semibold">{request.type}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">People Involved</div>
                  <div className="font-semibold">{request.peopleInvolved}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Location
            </div>
            <Card className="p-4 bg-muted/20 border-dashed">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm font-medium leading-relaxed">
                  {request.location}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
