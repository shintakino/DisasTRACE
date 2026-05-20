"use client"

import { useEffect, useState } from "react"
import { VerificationQueue } from "@/components/verification/verification-queue"
import { VerificationDetails } from "@/components/verification/verification-details"
import { ResidentPanel } from "@/components/verification/resident-panel"
import { VerificationRequest, VerificationStatus } from "@/types/verification"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"

export default function VerificationPage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<VerificationStatus>("PENDING")
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchRequests = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/verification")
      if (!response.ok) throw new Error("Failed to fetch requests")
      const data = await response.json()
      setRequests(data)
      
      // Select the first pending request if none selected
      if (data.length > 0 && !selectedId) {
        const firstPending = data.find((r: VerificationRequest) => r.status === "PENDING")
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
      const nextPending = requests.slice(currentIdx + 1).find(r => r.status === "PENDING") || 
                          requests.slice(0, currentIdx).find(r => r.status === "PENDING")
      
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
        onAccept={(id) => handleUpdateStatus(id, "VERIFIED")}
        onReject={(id) => handleUpdateStatus(id, "REJECTED")}
        isProcessing={isProcessing}
      />
    </div>
  )
}
