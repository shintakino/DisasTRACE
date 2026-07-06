"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { VerificationRequest } from "@/types/verification"
import { CheckCircle2, Phone, MapPin, History, ShieldCheck, XCircle, Check, GitMerge, HelpCircle } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

interface ResidentPanelProps {
  request: VerificationRequest | null
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onMerge?: (id: string) => void
  isProcessing: boolean
}

export function ResidentPanel({ request, onAccept, onReject, onMerge, isProcessing }: ResidentPanelProps) {
  if (!request) {
    return (
      <div className="w-80 shrink-0 border-l bg-white p-4 flex flex-col items-center justify-center text-slate-400 text-sm italic">
        No resident selected
      </div>
    )
  }

  const { resident } = request
  const initials = resident.fullName
    .split(", ")
    .reverse()
    .map((n) => n[0])
    .join("")

  const needsManualDispatch =
    request.status === "VERIFIED" &&
    request.incident &&
    request.incident.dispatchMethod === "PACC_MANUAL" &&
    !request.incident.responderId &&
    !request.incident.currentOfferResponderId;

  return (
    <div className="w-80 shrink-0 border-l bg-white p-4 flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => onReject(request.id)}
            disabled={
              isProcessing || 
              !(request.status === "PENDING" || needsManualDispatch)
            }
          >
            <XCircle className="w-4 h-4" />
            Reject
          </Button>
          <Button
            className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white flex items-center justify-center gap-2"
            onClick={() => onAccept(request.id)}
            disabled={
              isProcessing || 
              (request.status === "REJECTED") ||
              (request.status === "VERIFIED" && request.incident ? !!(request.incident.responderId || request.incident.currentOfferResponderId) : false)
            }
          >
            <Check className="w-4 h-4" />
            {request.status === "VERIFIED" ? "Dispatch" : "Accept"}
          </Button>
        </div>
        {request.status === "PENDING" && request.nature === "EMERGENCY" && (
          <Button
            className="w-full bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-2"
            onClick={() => onMerge?.(request.id)}
            disabled={isProcessing}
          >
            <GitMerge className="w-4 h-4" />
            Merge Duplicate
          </Button>
        )}
      </div>

      <Separator />

      <div className="space-y-6">
        <div className="flex flex-col items-center text-center">
          <Avatar className="w-20 h-20 mb-3 border-2 border-white shadow-sm">
            <AvatarFallback className="bg-[#1E3A8A] text-white text-xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-bold text-lg">{resident.fullName}</h3>
          {resident.isVerified && (
            <div className="flex items-center gap-1.5 text-blue-600 text-xs font-semibold mt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified account
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <div className="text-muted-foreground text-[10px] uppercase font-bold">Phone Number</div>
              <div className="font-medium">{resident.phone}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <div className="text-muted-foreground text-[10px] uppercase font-bold">Home Address</div>
              <div className="font-medium">{resident.address}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <History className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <div className="text-muted-foreground text-[10px] uppercase font-bold flex items-center gap-1">
                Account Standing
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-950 border border-slate-800 text-white p-3 rounded-lg text-xs max-w-[280px] shadow-lg leading-relaxed z-50">
                    <div className="space-y-2 text-left">
                      <p className="font-bold border-b border-white/10 pb-1 text-[11px] uppercase tracking-wide text-blue-400">Account Standing Levels</p>
                      <div className="space-y-1 text-[10px] text-slate-200">
                        <p><strong className="text-green-400">Good Standing (≥80%):</strong> User has zero rejected reports. Fully reliable.</p>
                        <p><strong className="text-amber-400">Fair Standing (50-79%):</strong> User has 1 rejected false report. Validated with caution.</p>
                        <p><strong className="text-red-400">Poor Standing (&lt;50%):</strong> User has 2+ rejected false reports. Highly likely spam/fake.</p>
                        <p className="text-slate-400 mt-1.5 italic pt-1 border-t border-white/5">Note: Rejection reduces reliability by 33% per report.</p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="font-medium">
                {resident.priorReports === 0 ? (
                  "New Account"
                ) : (
                  resident.reliabilityScore !== undefined ? (
                    resident.reliabilityScore >= 80 ? "Good Standing" :
                    resident.reliabilityScore >= 50 ? "Fair Standing" : "Poor Standing"
                  ) : (
                    "New Account"
                  )
                )} ({resident.priorReports} reports)
              </div>
            </div>
          </div>
        </div>

        <Card className="p-4 bg-white/50 border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-xs font-bold">Reliability Score</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${
                resident.priorReports === 0 ? "bg-slate-300" :
                (resident.reliabilityScore ?? 100) >= 80 ? "bg-green-500" :
                (resident.reliabilityScore ?? 100) >= 50 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${resident.priorReports === 0 ? 0 : (resident.reliabilityScore ?? 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground mt-2 text-center italic">
            {resident.priorReports === 0 ? (
              "No historical reports submitted yet"
            ) : (
              `Based on historical accuracy of reports (${resident.reliabilityScore ?? 100}% reliable)`
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-150 grid grid-cols-3 gap-1 text-[9px] font-bold text-slate-500">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span>Good (≥80%)</span>
            </div>
            <div className="flex items-center gap-1 justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>Fair (50-79%)</span>
            </div>
            <div className="flex items-center gap-1 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span>Poor (&lt;50%)</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
