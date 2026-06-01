"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { VerificationRequest } from "@/types/verification"
import { CheckCircle2, Phone, MapPin, History, ShieldCheck, XCircle, Check, GitMerge } from "lucide-react"

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
      <div className="w-80 shrink-0 border-l bg-muted/30 p-4 flex flex-col items-center justify-center text-muted-foreground text-sm italic">
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

  return (
    <div className="w-80 shrink-0 border-l bg-muted/30 p-4 flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => onReject(request.id)}
            disabled={isProcessing || request.status !== "PENDING"}
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
        {request.status === "PENDING" && (
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
              <div className="text-muted-foreground text-[10px] uppercase font-bold">Account Standing</div>
              <div className="font-medium">{resident.priorReports} prior reports</div>
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
              className="h-full bg-green-500"
              style={{ width: `${Math.min(100, (resident.priorReports / 5) * 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground mt-2 text-center italic">
            Based on historical accuracy of reports
          </div>
        </Card>
      </div>
    </div>
  )
}
