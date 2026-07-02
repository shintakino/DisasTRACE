"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Truck, Phone, MapPin, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Responder {
  id: string
  fullName: string
  phone: string
  address: string
  status: string
}

interface ManualDispatchModalProps {
  isOpen: boolean
  onClose: () => void
  requestId: string | null
  requestNum: string | null // e.g. REQ-2026-0046
  onSuccess: () => void
}

export function ManualDispatchModal({
  isOpen,
  onClose,
  requestId,
  requestNum,
  onSuccess,
}: ManualDispatchModalProps) {
  const [activeTab, setActiveTab] = useState<"CDRRMO" | "BARANGAY">("CDRRMO")
  const [cdrrmoResponders, setCdrrmoResponders] = useState<Responder[]>([])
  const [barangayResponders, setBarangayResponders] = useState<Responder[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const fetchResponders = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/verification/available-responders")
        if (!response.ok) throw new Error("Failed to fetch available responders")
        const data = await response.json()
        if (data.success) {
          setCdrrmoResponders(data.cdrrmo)
          setBarangayResponders(data.barangay)
        }
      } catch (error) {
        console.error(error)
        toast.error("Failed to load available responders")
      } finally {
        setIsLoading(false)
      }
    }

    fetchResponders()
  }, [isOpen])

  const handleSelectResponder = async (responderId: string, responderName: string) => {
    if (!requestId) return
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/verification/${requestId}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responderId }),
      })

      if (!response.ok) throw new Error("Failed to dispatch responder")
      
      const data = await response.json()
      if (data.success) {
        toast.success(`Successfully dispatched ${responderName}!`)
        onSuccess()
        onClose()
      } else {
        throw new Error(data.error || "Failed to dispatch responder")
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to dispatch responder")
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentList = activeTab === "CDRRMO" ? cdrrmoResponders : barangayResponders

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md md:max-w-2xl lg:max-w-4xl p-0 border-0 shadow-2xl rounded-[24px] max-h-[90vh] flex flex-col overflow-hidden bg-white" showCloseButton={true}>
        <div className="bg-gradient-to-r from-[#1e1b4b] to-[#2B4C9B] p-6 text-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-xl font-bold text-white tracking-tight">Manual Dispatch</DialogTitle>
              <DialogDescription className="text-blue-100 text-xs font-medium mt-1">
                Review available drivers and assign manually.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50/30 flex-1 overflow-y-auto space-y-5 flex flex-col">
          {/* Tab-selector */}
          <div className="bg-slate-200/50 p-1 rounded-xl flex gap-1 border border-slate-200/25 shrink-0">
            <button
              onClick={() => setActiveTab("CDRRMO")}
              disabled={isSubmitting}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider",
                activeTab === "CDRRMO"
                  ? "bg-[#1E3A8A] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/30"
              )}
            >
              CDRRMO HQ
            </button>
            <button
              onClick={() => setActiveTab("BARANGAY")}
              disabled={isSubmitting}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider",
                activeTab === "BARANGAY"
                  ? "bg-[#1E3A8A] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/30"
              )}
            >
              BARANGAY
            </button>
          </div>

          {/* Scrollable list of responders */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-[200px]">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
                <span className="text-xs font-medium">Fetching available responders...</span>
              </div>
            ) : currentList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-slate-400 italic text-center gap-2">
                <Truck className="w-10 h-10 opacity-20 text-slate-500" />
                <span className="text-xs font-medium">No available units standby at this time.</span>
              </div>
            ) : (
              currentList.map((resp) => (
                <button
                  key={resp.id}
                  onClick={() => handleSelectResponder(resp.id, resp.fullName)}
                  disabled={isSubmitting}
                  className="w-full text-left bg-white border border-slate-200 hover:border-[#1E3A8A] hover:bg-blue-50/10 p-3.5 rounded-xl flex items-center gap-4 transition-all hover:scale-[1.01] hover:shadow-md group active:scale-[0.99] disabled:opacity-50"
                >
                  <div className="w-11 h-11 bg-[#EFF6FF] rounded-xl flex items-center justify-center shrink-0 border border-blue-50/50 group-hover:bg-[#1E3A8A]/10">
                    <Truck className="w-5 h-5 text-[#1E3A8A]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-sm tracking-tight mb-1 truncate">
                      {resp.fullName}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{resp.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{resp.address}</span>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">
                    <span className={cn(
                      "text-[10px] tracking-widest font-black uppercase px-2.5 py-1 rounded-full shadow-sm",
                      resp.status === "OFFLINE" ? "bg-rose-100 text-rose-700" : "bg-green-100 text-green-700"
                    )}>
                      {resp.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <DialogFooter className="p-6 bg-white border-t border-slate-100 flex justify-end gap-2 shrink-0">
          <Button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto min-w-[120px] bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white font-bold rounded-xl py-5 h-11 text-xs uppercase tracking-wider transition-all"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
