"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { VerificationRequest } from "@/types/verification"
import { GitMerge, MapPin, Calendar, Check, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface MergeDuplicateModalProps {
  isOpen: boolean
  onClose: () => void
  requestId: string | null
  activeVerifiedRequests: VerificationRequest[]
  onConfirm: (parentRequestId: string) => Promise<void>
  isProcessing: boolean
}

export function MergeDuplicateModal({
  isOpen,
  onClose,
  requestId,
  activeVerifiedRequests,
  onConfirm,
  isProcessing,
}: MergeDuplicateModalProps) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!selectedParentId) return
    await onConfirm(selectedParentId)
    setSelectedParentId(null)
  }

  const handleClose = () => {
    setSelectedParentId(null)
    onClose()
  }

  // Filter out the current request itself and ensure only verified EMERGENCIES are listed
  const selectableRequests = activeVerifiedRequests.filter(
    (req) => req.id !== requestId && req.nature === "EMERGENCY"
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md md:max-w-2xl lg:max-w-4xl p-0 border-0 shadow-2xl rounded-[24px] max-h-[90vh] flex flex-col overflow-hidden bg-white" showCloseButton={true}>
        <div className="bg-gradient-to-r from-[#1e1b4b] to-[#2B4C9B] p-6 text-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
              <GitMerge className="h-6 w-6 text-white" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-xl font-bold text-white tracking-tight">Merge Duplicate Incident</DialogTitle>
              <DialogDescription className="text-blue-100 text-xs font-medium mt-1">
                Select the primary verified report that this pending incident is a duplicate of.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50/30 flex-1 overflow-y-auto space-y-4 flex flex-col">
          {/* Scrollable list of verified reports */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-[200px]">
            {selectableRequests.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 italic text-center gap-2">
                <AlertCircle className="w-10 h-10 opacity-20 text-amber-500" />
                <span className="text-xs font-semibold text-slate-500">No verified incidents available</span>
                <span className="text-[11px] text-slate-400 max-w-[280px]">
                  There are no other active verified incidents at this moment to merge this report into.
                </span>
              </div>
            ) : (
              selectableRequests.map((req) => {
                const isSelected = selectedParentId === req.id
                let formattedDate = ""
                try {
                  formattedDate = format(new Date(req.receivedAt), "MMM d, yyyy h:mm a")
                } catch (e) {
                  formattedDate = req.receivedAt
                }

                return (
                  <button
                    key={req.id}
                    onClick={() => setSelectedParentId(req.id)}
                    disabled={isProcessing}
                    className={cn(
                      "w-full text-left bg-white border p-3.5 rounded-xl flex items-start gap-4 transition-all hover:scale-[1.01] hover:shadow-md group active:scale-[0.99] disabled:opacity-50",
                      isSelected
                        ? "border-amber-500 bg-amber-50/20 shadow-sm ring-1 ring-amber-500/35"
                        : "border-slate-200 hover:border-amber-300 hover:bg-amber-50/5"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                      isSelected 
                        ? "bg-amber-500 text-white border-amber-500" 
                        : "bg-[#EFF6FF] text-[#1E3A8A] border-blue-50/50 group-hover:bg-amber-100 group-hover:text-amber-700"
                    )}>
                      {isSelected ? (
                        <Check className="w-5 h-5 stroke-[3]" />
                      ) : (
                        <GitMerge className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-bold text-slate-800 text-sm tracking-tight truncate">
                          {req.requestId}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={cn(
                            "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                            req.nature === "EMERGENCY" 
                              ? "bg-red-50 text-red-700 border border-red-100" 
                              : "bg-blue-50 text-blue-700 border border-blue-100"
                          )}>
                            {req.nature}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                            {req.type}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-[11px] text-slate-600 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{req.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <DialogFooter className="p-6 bg-white border-t border-slate-100 flex justify-end gap-2 shrink-0">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isProcessing}
            className="text-slate-500 hover:text-slate-800 font-semibold text-xs uppercase tracking-wider rounded-xl px-4"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || !selectedParentId}
            className={cn(
              "bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl px-5 py-5 h-11 text-xs uppercase tracking-wider transition-all flex items-center gap-2",
              !selectedParentId && "opacity-50 cursor-not-allowed"
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <GitMerge className="w-4 h-4" />
                Merge Incident
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
