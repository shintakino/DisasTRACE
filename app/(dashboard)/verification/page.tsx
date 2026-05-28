"use client"

import { useEffect, useState } from "react"
import { VerificationQueue } from "@/components/verification/verification-queue"
import { VerificationDetails } from "@/components/verification/verification-details"
import { ResidentPanel } from "@/components/verification/resident-panel"
import { ManualDispatchModal } from "@/components/verification/manual-dispatch-modal"
import { VerificationRequest, VerificationStatus } from "@/types/verification"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"

export default function VerificationPage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<VerificationStatus>("PENDING")
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  // Manual Dispatch States
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false)
  const [dispatchReqId, setDispatchReqId] = useState<string | null>(null)
  const [dispatchReqNum, setDispatchReqNum] = useState<string | null>(null)

  // Helper to determine if a request needs manual PACC dispatch
  const needsManualDispatch = (r: VerificationRequest) => {
    return (
      r.status === "VERIFIED" &&
      r.incident &&
      r.incident.dispatchMethod === "PACC_MANUAL" &&
      !r.incident.responderId &&
      !r.incident.currentOfferResponderId
    );
  };

  const fetchRequests = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/verification")
      if (!response.ok) throw new Error("Failed to fetch requests")
      const data = await response.json()
      setRequests(data)
      
      // Select the first pending request if none selected
      if (data.length > 0 && !selectedId) {
        const firstPending = data.find((r: VerificationRequest) => r.status === "PENDING" || needsManualDispatch(r))
        if (firstPending) setSelectedId(firstPending.id)
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to load verification requests")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleUpdateStatus = async (id: string, status: VerificationStatus) => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/verification/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) throw new Error("Failed to update status")

      toast.success(`Request ${status === "VERIFIED" ? "accepted" : "rejected"}`)
      
      // Optimistic update
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      )
      
      // Move to next pending request
      const currentIdx = requests.findIndex(r => r.id === id)
      const nextPending = requests.slice(currentIdx + 1).find(r => r.status === "PENDING" || needsManualDispatch(r)) || 
                          requests.slice(0, currentIdx).find(r => r.status === "PENDING" || needsManualDispatch(r))
      
      if (nextPending) {
        setSelectedId(nextPending.id)
      } else {
        setSelectedId(null)
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to update status")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAccept = (id: string) => {
    const req = requests.find((r) => r.id === id)
    if (req) {
      setDispatchReqId(id)
      setDispatchReqNum(req.requestId)
      setIsDispatchModalOpen(true)
    }
  }

  const selectedRequest = requests.find((r) => r.id === selectedId) || null

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner className="size-12 text-[#1E3A8A]" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex h-[calc(100vh-4rem)] overflow-hidden">
      <VerificationQueue
        requests={requests}
        selectedId={selectedId}
        onSelect={(r) => setSelectedId(r.id)}
        filter={filter}
        onFilterChange={setFilter}
      />
      <VerificationDetails request={selectedRequest} />
      <ResidentPanel
        request={selectedRequest}
        onAccept={handleAccept}
        onReject={(id) => handleUpdateStatus(id, "REJECTED")}
        isProcessing={isProcessing}
      />
      <ManualDispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => {
          setIsDispatchModalOpen(false)
          setDispatchReqId(null)
          setDispatchReqNum(null)
        }}
        requestId={dispatchReqId}
        requestNum={dispatchReqNum}
        onSuccess={fetchRequests}
      />
    </div>
  )
}
