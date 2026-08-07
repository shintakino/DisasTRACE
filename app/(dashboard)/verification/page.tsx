"use client"

import { useEffect, useState, useRef } from "react"
import { VerificationQueue } from "@/components/verification/verification-queue"
import { VerificationDetails } from "@/components/verification/verification-details"
import { ResidentPanel } from "@/components/verification/resident-panel"
import { ManualDispatchModal } from "@/components/verification/manual-dispatch-modal"
import { MergeDuplicateModal } from "@/components/verification/merge-duplicate-modal"
import { VerificationRequest, VerificationStatus } from "@/types/verification"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { createClientBrowser } from "@/lib/supabase"
import { Volume2, VolumeX, ShieldAlert, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { WebPreloader } from "@/components/ui/web-preloader"
import { getIncidentAlertPriority, INCIDENT_ALERT_PRIORITY_RANK, type IncidentAlertPriority } from "@/lib/incident-severity"

export default function VerificationPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<VerificationStatus>("PENDING")
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const isMutedRef = useRef(isMuted)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Sync mute state to ref for realtime callbacks
  useEffect(() => {
    isMutedRef.current = isMuted
  }, [isMuted])

  // Manual Dispatch States
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false)
  const [dispatchReqId, setDispatchReqId] = useState<string | null>(null)
  const [dispatchReqNum, setDispatchReqNum] = useState<string | null>(null)

  // Merge Duplicate States
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false)
  const [mergeReqId, setMergeReqId] = useState<string | null>(null)

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

  const initAudio = () => {
    if (audioCtxRef.current) return audioCtxRef.current;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;
      return ctx;
    } catch (e) {
      console.error("AudioContext initialization failed:", e);
      return null;
    }
  }

  const playAlertSound = (type: IncidentAlertPriority | 'info', customCtx?: AudioContext | null) => {
    if (isMutedRef.current) return;
    
    try {
      const ctx = customCtx || audioCtxRef.current || initAudio();
      if (!ctx) return;
      
      // Resume if suspended (browser autoplay security check)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (type === 'critical') {
        // High-urgency warning siren using a sawtooth wave that sweeps frequency rapidly
        const playSirenBlock = (startTime: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = "sawtooth";
          
          // Start at 880Hz, sweep up to 1320Hz, then back down
          osc.frequency.setValueAtTime(880, startTime);
          osc.frequency.linearRampToValueAtTime(1320, startTime + duration * 0.4);
          osc.frequency.linearRampToValueAtTime(880, startTime + duration * 0.8);
          
          gain.gain.setValueAtTime(0.18, startTime);
          gain.gain.linearRampToValueAtTime(0.18, startTime + duration * 0.75);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
          
          osc.start(startTime);
          osc.stop(startTime + duration);
        };

        const now = ctx.currentTime;
        // Three rapid, high-pitch wailing siren cycles (0.5s each)
        playSirenBlock(now, 0.45);
        playSirenBlock(now + 0.5, 0.45);
        playSirenBlock(now + 1.0, 0.45);
      } else if (type === 'severe' || type === 'standard') {
        // Fast pulsing double beep
        const playTone = (freq: number, startTime: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, startTime);
          
          gain.gain.setValueAtTime(0.12, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          
          osc.start(startTime);
          osc.stop(startTime + duration);
        };
        
        const now = ctx.currentTime;
        playTone(587.33, now, 0.25);
        playTone(587.33, now + 0.3, 0.25);
      } else {
        // Sweet chime (Info)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        
        osc1.start();
        osc2.start(ctx.currentTime + 0.08);
        osc1.stop(ctx.currentTime + 0.4);
        osc2.stop(ctx.currentTime + 0.4);
      }
    } catch (err) {
      console.error("Failed to play alert sound:", err);
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    
    if (!nextMuted) {
      const ctx = initAudio();
      if (ctx) {
        ctx.resume().then(() => {
          playAlertSound("info", ctx);
        });
      }
    }
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

  const fetchRequestsSilent = async () => {
    try {
      const response = await fetch("/api/verification")
      if (!response.ok) throw new Error("Failed to fetch requests")
      const data = await response.json()
      setRequests(data)
    } catch (error) {
      console.error("Silent verification update failed:", error)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  // Setup Real-Time Subscriptions
  useEffect(() => {
    if (!user) return;

    const supabase = createClientBrowser();
    
    const vrChannel = supabase
      .channel("pacc-verification-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "verification_requests" },
        async (payload) => {
          console.log("Realtime verification_request change:", payload);
          
          // Keep the queue synchronized without delaying the immediate priority prompt.
          void fetchRequestsSilent();
          
          if (payload.eventType === "INSERT") {
            const newRequest = payload.new;
            const isEmergency = newRequest.nature === "EMERGENCY";
            const reqNum = newRequest.request_id || newRequest.requestId || "REQ-NEW";
            const reqType = newRequest.type || "Unknown Emergency";
            const reqLoc = newRequest.location_description || newRequest.locationDescription || "Baliwag City";
            
            if (isEmergency) {
              const priority = getIncidentAlertPriority(newRequest.severity);
              if (priority === "critical" || priority === "severe") {
                setSelectedId(newRequest.id);
                playAlertSound(priority);
                toast[priority === "critical" ? "error" : "warning"](
                  `${priority === "critical" ? "CRITICAL" : "HIGH-SEVERITY"} INCIDENT: ${reqType} (${reqNum})`,
                  {
                    duration: priority === "critical" ? 20000 : 15000,
                    description: `${priority === "critical" ? "Immediate dispatch coordination is required" : "Prioritize triage and unit readiness"}. Location: ${reqLoc}.`,
                  }
                );
              } else {
                playAlertSound("standard");
                toast.error(`NEW EMERGENCY INCIDENT: ${reqType} reported! (${reqNum})`, {
                  duration: 10000,
                  description: `Location: ${reqLoc}. Immediate triage and dispatch required.`,
                });
              }
            } else {
              playAlertSound("standard");
              toast.warning(`New Incident Report: ${reqType} submitted. (${reqNum})`, {
                duration: 6000,
                description: `Location: ${reqLoc}. Review for triage.`,
              });
            }
          }
          
          if (payload.eventType === "UPDATE") {
            const oldReq = payload.old;
            const newReq = payload.new;
            const reqNum = newReq.request_id || newReq.requestId || "REQ-UPD";
            
            // Reverted to PENDING status
            if (newReq.status === "PENDING" && oldReq.status !== "PENDING") {
              playAlertSound("critical");
              toast.error(`CRITICAL: Request ${reqNum} has reverted to PENDING status!`, {
                duration: 10000,
                description: "Dispatcher attention required immediately.",
              });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        async (payload) => {
          console.log("Realtime incident change:", payload);
          
          // Silent fetch to update current incident tracking states
          await fetchRequestsSilent();
          
          if (payload.eventType === "UPDATE") {
            const oldInc = payload.old;
            const newInc = payload.new;
            
            const isPaccManual = newInc.dispatch_method === "PACC_MANUAL" || newInc.dispatchMethod === "PACC_MANUAL";
            const noResponder = !newInc.responder_id && !newInc.current_offer_responder_id && !newInc.responderId && !newInc.currentOfferResponderId;
            const wasAlreadyManual = oldInc.dispatch_method === "PACC_MANUAL" || oldInc.dispatchMethod === "PACC_MANUAL";
            const hadResponder = oldInc.responder_id || oldInc.current_offer_responder_id || oldInc.responderId || oldInc.currentOfferResponderId;
            
            // If it needs manual dispatch and either just transitioned or was rejected/expired
            if (isPaccManual && noResponder && (!wasAlreadyManual || hadResponder)) {
              playAlertSound("critical");
              toast.error(`MANUAL DISPATCH REQUIRED: A responder rejected the offer or the timer expired!`, {
                duration: 10000,
                description: "Open the request to dispatch a backup unit manually.",
              });
            }
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(vrChannel);
    };
  }, [user]);

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

  const handleDispatchSuccess = async () => {
    const dispatchedId = dispatchReqId;
    await fetchRequests()
    if (dispatchedId) {
      const currentIdx = requests.findIndex((r) => r.id === dispatchedId)
      const nextPending =
        requests.slice(currentIdx + 1).find((r) => r.status === "PENDING" || needsManualDispatch(r)) ||
        requests.slice(0, currentIdx).find((r) => r.status === "PENDING" || needsManualDispatch(r))

      if (nextPending) {
        setSelectedId(nextPending.id)
      } else {
        setSelectedId(null)
      }
    }
  }

  const handleMerge = async (duplicateId: string, parentId: string) => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/verification/${duplicateId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentRequestId: parentId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to merge incident")
      }

      toast.success("Incident successfully merged as duplicate")

      // Update the duplicate request status in local state to 'DUPLICATE'
      setRequests((prev) =>
        prev.map((r) => (r.id === duplicateId ? { ...r, status: "DUPLICATE" } : r))
      )

      // Close the modal and reset ID
      setIsMergeModalOpen(false)
      setMergeReqId(null)

      // Automatically select the next pending request (or null)
      const currentIdx = requests.findIndex((r) => r.id === duplicateId)
      const nextPending =
        requests.slice(currentIdx + 1).find((r) => r.status === "PENDING" || needsManualDispatch(r)) ||
        requests.slice(0, currentIdx).find((r) => r.status === "PENDING" || needsManualDispatch(r))

      if (nextPending) {
        setSelectedId(nextPending.id)
      } else {
        setSelectedId(null)
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to merge incident")
    } finally {
      setIsProcessing(false)
    }
  }

  const selectedRequest = requests.find((r) => r.id === selectedId) || null
  const activeAlerts = requests.filter((r) => r.status === "PENDING" || needsManualDispatch(r))
  const mostUrgentAlert = activeAlerts.reduce<VerificationRequest | null>((currentMostUrgent, request) => {
    if (!currentMostUrgent) return request;

    return INCIDENT_ALERT_PRIORITY_RANK[getIncidentAlertPriority(request.severity)] > INCIDENT_ALERT_PRIORITY_RANK[getIncidentAlertPriority(currentMostUrgent.severity)]
      ? request
      : currentMostUrgent;
  }, null);
  const activeAlertPriority = mostUrgentAlert ? getIncidentAlertPriority(mostUrgentAlert.severity) : "standard";
  const alertInterval = activeAlertPriority === "critical" ? 3000 : activeAlertPriority === "severe" ? 4500 : 7000;

  // Loop sound alerts while there are active unhandled reports
  useEffect(() => {
    if (isLoading || isMuted) return;

    const hasActiveAlerts = activeAlerts.length > 0;
    if (!hasActiveAlerts) return;

    // Play initial sound immediately
    playAlertSound(activeAlertPriority);

    const intervalId = setInterval(() => {
      playAlertSound(activeAlertPriority);
    }, alertInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [activeAlerts.length, activeAlertPriority, alertInterval, isLoading, isMuted]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0B132B]">
        <WebPreloader title="Loading Verification & Dispatch..." subtitle="Synchronizing incident queues and establishing real-time communication" />
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#F3F4F6]">
      {/* Real-time Triage Alert HUD */}
      {activeAlerts.length > 0 && (
        <div
          role="alert"
          aria-live="assertive"
          className={cn(
            "text-white px-6 py-2.5 flex items-center justify-between shadow-lg relative overflow-hidden shrink-0 border-b",
            activeAlertPriority === "critical" ? "bg-red-700 border-red-800" : activeAlertPriority === "severe" ? "bg-orange-600 border-orange-700" : "bg-[#1E3A8A] border-[#172554]"
          )}
        >
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:40px_40px] opacity-10 animate-[pulse_2s_infinite]" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-white/20 p-1.5 rounded-full animate-bounce">
              <ShieldAlert className="size-5 text-white" />
            </div>
            <span className="rounded-md bg-white/20 px-2 py-1 text-[11px] font-black tracking-wide">
              {activeAlertPriority === "critical" ? "CRITICAL" : activeAlertPriority === "severe" ? "HIGH SEVERITY" : "STANDARD"}
            </span>
            <span className="font-extrabold tracking-wide text-sm">
              🚨 {activeAlerts.length} URGENT INCIDENT(S) PENDING TRIAGE
            </span>
            <span className="text-white/80 text-xs hidden lg:inline border-l border-white/20 pl-3">
              Most Urgent: <span className="font-black text-white">{mostUrgentAlert?.type}</span> at <span className="italic font-bold">{mostUrgentAlert?.location}</span>
            </span>
          </div>
          
          <div className="flex items-center gap-3 relative z-10">
            <button 
              onClick={() => setSelectedId(mostUrgentAlert?.id ?? activeAlerts[0].id)}
              className="bg-white text-red-600 font-bold px-3 py-1 rounded-lg text-xs hover:bg-red-50 hover:scale-105 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
            >
              <Sparkles className="size-3.5" />
              Triage Now
            </button>
            
            <button
              onClick={toggleMute}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm border",
                isMuted 
                  ? "bg-red-700/50 hover:bg-red-700 text-red-100 border-red-500" 
                  : "bg-white/20 hover:bg-white/30 text-white border-white/30"
              )}
            >
              {isMuted ? (
                <>
                  <VolumeX className="size-3.5" />
                  Muted
                </>
              ) : (
                <>
                  <Volume2 className="size-3.5 animate-bounce" />
                  Sound On
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Panel Content */}
      <div className="flex-1 flex overflow-hidden">
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
          onMerge={(id) => {
            setMergeReqId(id)
            setIsMergeModalOpen(true)
          }}
          isProcessing={isProcessing}
        />
      </div>

      <ManualDispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => {
          setIsDispatchModalOpen(false)
          setDispatchReqId(null)
          setDispatchReqNum(null)
        }}
        requestId={dispatchReqId}
        requestNum={dispatchReqNum}
        onSuccess={handleDispatchSuccess}
      />

      <MergeDuplicateModal
        isOpen={isMergeModalOpen}
        onClose={() => {
          setIsMergeModalOpen(false)
          setMergeReqId(null)
        }}
        requestId={mergeReqId}
        activeVerifiedRequests={requests.filter((r) => r.status === "VERIFIED")}
        onConfirm={async (parentRequestId) => {
          if (mergeReqId) {
            await handleMerge(mergeReqId, parentRequestId)
          }
        }}
        isProcessing={isProcessing}
      />
    </div>
  )
}
