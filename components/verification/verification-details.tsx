"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { VerificationRequest } from "@/types/verification"
import { formatDistanceToNow } from "date-fns"
import { MapPin, Users, Info, AlertTriangle } from "lucide-react"

interface VerificationDetailsProps {
  request: VerificationRequest | null
}

export function VerificationDetails({ request }: VerificationDetailsProps) {
  if (!request) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground italic">
        Select a verification request to view details
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold">{request.requestId}</h2>
          <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
            <span>Received {formatDistanceToNow(new Date(request.receivedAt), { addSuffix: true })}</span>
            <span>•</span>
            <Badge variant="outline" className="font-semibold uppercase text-[10px]">
              {request.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="relative rounded-xl overflow-hidden aspect-video bg-muted mb-8 border shadow-sm">
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
