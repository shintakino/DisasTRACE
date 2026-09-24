"use client"

import { useEffect, useState, useRef } from "react"
import { VerificationQueue } from "@/components/verification/verification-queue"
import { ActionFeedback } from "@/components/verification/action-feedback"
import { VerificationDetails } from "@/components/verification/verification-details"
import { ResidentPanel } from "@/components/verification/resident-panel"
import { ManualDispatchModal } from "@/components/verification/manual-dispatch-modal"
import { MergeDuplicateModal } from "@/components/verification/merge-duplicate-modal"
import { VerificationRequest, VerificationStatus, TriageClassification } from "@/types/verification"
import { VerificationQueueFilter } from "@/components/verification/verification-queue"
import { toast } from "sonner"
import { createClientBrowser } from "@/lib/supabase"
import { Volume2, VolumeX, ShieldAlert, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { WebPreloader } from "@/components/ui/web-preloader"
import { getIncidentAlertPriority, type IncidentAlertPriority } from "@/lib/incident-severity"
import { formatOfficialBaliwagLocation } from "@/lib/report-location"
import { classifyActiveVerificationBucket } from "@/lib/rejected-report-workflow"
import { compareActiveVerificationItems, selectHighestPriorityVerificationItem } from "@/lib/verification-queue-priority"
import {
  createActionErrorFeedback,
  createActionProcessingFeedback,
  createActionSuccessFeedback,
  type OperatorActionFeedback,
} from "@/lib/operator-action-feedback"

function isActiveRequest(request: VerificationRequest) {
  const bucket = classifyActiveVerificationBucket({
    requestStatus: request.status,
    incidentStatus: request.incident?.status,
    triageClassification: request.triageClassification,
    requiresPaccReassignment: request.requiresPaccReassignment,
    responderId: request.incident?.responderId,
    currentOfferResponderId: request.incident?.currentOfferResponderId,
  })
  return bucket === 'ACTION' || bucket === 'REVIEW'
}

function selectNextActiveRequest(
  requests: readonly VerificationRequest[],
  preferredBucket?: 'ACTION' | 'REVIEW' | null,
) {
  const active = requests.filter((request) => {
    if (!isActiveRequest(request)) return false
    if (!preferredBucket) return true
    return classifyActiveVerificationBucket({
      requestStatus: request.status,
      incidentStatus: request.incident?.status,
      triageClassification: request.triageClassification,
      requiresPaccReassignment: request.requiresPaccReassignment,
      responderId: request.incident?.responderId,
      currentOfferResponderId: request.incident?.currentOfferResponderId,
    }) === preferredBucket
  })
  return selectHighestPriorityVerificationItem(active)
}

export default function VerificationPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<VerificationQueueFilter>("ACTION")
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [actionFeedback, setActionFeedback] = useState<OperatorActionFeedback | null>(null)
  const [isMuted, setIsMuted] = useState(false)

  const isMutedRef = useRef(isMuted)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const silentFetchRunningRef = useRef(false)
  const silentFetchQueuedRef = useRef(false)

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

  const initAudio = () => {
    if (audioCtxRef.current) return audioCtxRef.current;
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

  const fetchRequests = async (): Promise<VerificationRequest[]> => {
    setIsLoading(true)
    setLoadError(null)
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 12_000)
    try {
      const response = await fetch("/api/verification", { signal: controller.signal })
      if (!response.ok) throw new Error("Failed to fetch requests")
      const data = await response.json()
      setRequests(data)
      
      // Select the first pending request if none selected
      if (data.length > 0 && !selectedId) {
        const firstPending = selectNextActiveRequest(data)
        if (firstPending) setSelectedId(firstPending.id)
      }
      return data
    } catch (error) {
      console.error(error)
      const message = error instanceof DOMException && error.name === "AbortError"
        ? "The verification queue took too long to respond."
        : "Unable to load verification requests."
      setLoadError(message)
      toast.error(message)
      return []
    } finally {
      window.clearTimeout(timeoutId)
      setIsLoading(false)
    }
  }

  const fetchRequestsSilent = async () => {
    if (silentFetchRunningRef.current) {
      silentFetchQueuedRef.current = true
      return
    }
    silentFetchRunningRef.current = true
    try {
      do {
        silentFetchQueuedRef.current = false
        const controller = new AbortController()
        const timeoutId = window.setTimeout(() => controller.abort(), 12_000)
        try {
          const response = await fetch("/api/verification", { signal: controller.signal })
          if (!response.ok) throw new Error("Failed to fetch requests")
          const data = await response.json()
          setRequests(data)
        } finally {
          window.clearTimeout(timeoutId)
        }
      } while (silentFetchQueuedRef.current)
    } catch (error) {
      console.error("Silent verification update failed:", error)
    } finally {
      silentFetchRunningRef.current = false
    }
  }

  useEffect(() => {
    // Defer the first stateful client fetch until after this effect commits.
    // A stalled request has its own abort/retry handling in fetchRequests.
    const requestId = window.setTimeout(() => void fetchRequests(), 0)
    return () => window.clearTimeout(requestId)
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
            const isAutomaticEmergency = newRequest.nature === 'EMERGENCY'
              && newRequest.triage_classification === 'HIGH_CONFIDENCE_EMERGENCY';
            // The server attempts automatic emergency dispatch before PACC
            // triage. Do not interrupt PACC or preselect this transient queue
            // row; fetchRequestsSilent above will show it only if no responder
            // can receive the offer.
            if (isAutomaticEmergency) return;
            const isEmergency = newRequest.nature === "EMERGENCY";
            const reqNum = newRequest.request_id || newRequest.requestId || "REQ-NEW";
            const reqType = newRequest.type || "Unknown Emergency";
            const reqLoc = formatOfficialBaliwagLocation(newRequest.barangay);
            
            if (isEmergency) {
              const priority = getIncidentAlertPriority(newRequest.severity);
              if (priority === "critical" || priority === "severe") {
                setFilter(
                  newRequest.triage_classification === 'HIGH_CONFIDENCE_EMERGENCY'
                    || newRequest.triage_classification === 'HIGH_CONFIDENCE_NON_EMERGENCY'
                    ? 'ACTION'
                    : 'REVIEW',
                );
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
            
            const noResponder = !newInc.responder_id && !newInc.current_offer_responder_id && !newInc.responderId && !newInc.currentOfferResponderId;
            const hadResponder = oldInc.responder_id || oldInc.current_offer_responder_id || oldInc.responderId || oldInc.currentOfferResponderId;
            
            // An exhausted automatic offer is also safe to override. It must
            // not be hidden just because it started as AUTO_1KM.
            if (newInc.status === 'DISPATCHED' && noResponder && hadResponder) {
              playAlertSound("critical");
              toast.error(`OVERRIDE DISPATCH REQUIRED: A responder rejected the offer or the timer expired!`, {
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

  const handleUpdateStatus = async (
    id: string,
    status: VerificationStatus,
    rejectionReason?: string,
  ): Promise<boolean> => {
    setIsProcessing(true)
    const currentRequest = requests.find((request) => request.id === id)
    const requestLabel = currentRequest?.requestId ?? id
    setActionFeedback(createActionProcessingFeedback(
      status === 'REJECTED' ? `Rejecting ${requestLabel}` : `Updating ${requestLabel}`,
      'The status is being confirmed with the server.',
    ))
    try {
      const response = await fetch(`/api/verification/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || "Failed to update status")

      const nextRequests = requests.map((request) =>
        request.id === id
          ? { ...request, status, rejectionReason: payload?.rejectionReason ?? rejectionReason ?? null }
          : request,
      )
      setRequests(nextRequests)

      const preferredBucket = filter === "ACTION" || filter === "REVIEW" ? filter : null
      const nextPending = selectNextActiveRequest(nextRequests, preferredBucket)
        ?? selectNextActiveRequest(nextRequests)

      setSelectedId(nextPending?.id ?? null)
      const feedback = status === 'REJECTED'
        ? createActionSuccessFeedback({
            title: `${requestLabel} rejected`,
            detail: `Removed from the active queue. Reason: ${payload?.rejectionReason ?? rejectionReason}`,
            nextStep: 'The reporter can see the rejection reason and may submit a new report when appropriate.',
            userAction: nextPending ? `Review ${nextPending.requestId}, the next priority report.` : 'No active report remains in this queue.',
          })
        : createActionSuccessFeedback({
            title: `${requestLabel} updated`,
            detail: 'The report status was confirmed by the server.',
            nextStep: nextPending ? `${nextPending.requestId} is now selected.` : 'The active queue is clear.',
            userAction: nextPending ? 'Continue with the selected report.' : 'Monitor for new reports.',
          })
      setActionFeedback(feedback)
      toast.success(feedback.title)
      void fetchRequestsSilent()
      return true
    } catch (error: unknown) {
      console.error(error)
      const message = error instanceof Error ? error.message : "Failed to update status"
      setActionFeedback(createActionErrorFeedback(`${requestLabel} was not changed`, message))
      toast.error(message)
      // A conflict can be an accepted, reassigned, or just-recovered offer.
      // Refresh the authoritative queue before PACC tries another action.
      if (status === 'REJECTED') void fetchRequestsSilent()
      return false
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

  const handleClassificationOverride = async (id: string, triageClassification: TriageClassification) => {
    setIsProcessing(true)
    const currentRequest = requests.find((request) => request.id === id)
    const requestLabel = currentRequest?.requestId ?? id
    setActionFeedback(createActionProcessingFeedback(`Updating ${requestLabel} classification`, 'PACC classification and dispatch eligibility are being checked.'))
    try {
      const response = await fetch(`/api/verification/${id}/classification`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ triageClassification }) })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to override classification')
      setRequests((current) => current.map((request) => request.id === id ? { ...request, triageClassification, triageReasons: ['PACC manually overrode the automated classification.'] } : request))
      const emergency = triageClassification === 'HIGH_CONFIDENCE_EMERGENCY'
      const existingIncident = payload?.incident as { status?: string; responderId?: string | null; currentOfferResponderId?: string | null } | null
      const resolvedIncident = existingIncident?.status === 'RESOLVED'
      const reassignmentRequired = existingIncident?.status === 'DISPATCHED'
        && !existingIncident.responderId
        && !existingIncident.currentOfferResponderId
      const retainedActiveIncident = Boolean(existingIncident) && !resolvedIncident && !reassignmentRequired
      const feedback = createActionSuccessFeedback({
        title: `${requestLabel} classification changed`,
        detail: emergency
          ? payload?.autoDispatched
            ? 'Emergency classification saved and a responder offer was sent.'
            : resolvedIncident
              ? 'Emergency classification saved. The linked incident is already Case Closed.'
              : retainedActiveIncident
              ? 'Emergency classification saved. The existing incident response remains active.'
              : 'Emergency classification saved; no eligible responder received an automatic offer.'
          : 'Classification saved and the report remains in PACC review.',
        nextStep: emergency
          ? payload?.autoDispatched
            ? 'The system is awaiting responder acceptance.'
            : resolvedIncident
              ? 'No additional dispatch will be started for this closed case.'
              : retainedActiveIncident ? 'Continue monitoring the existing response.' : 'Manual dispatch is required.'
          : 'No automatic dispatch will occur for this classification.',
        userAction: emergency && !payload?.autoDispatched && !retainedActiveIncident && !resolvedIncident ? 'Choose Dispatch to select an eligible unit.' : 'Continue reviewing the report status.',
      })
      setActionFeedback(feedback)
      toast.success(feedback.title)
      void fetchRequestsSilent()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to override classification'
      setActionFeedback(createActionErrorFeedback(`${requestLabel} classification was not changed`, message))
      toast.error(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCoordinationUpdate = async (id: string, agencies: string[]) => {
    setIsProcessing(true)
    const currentRequest = requests.find((request) => request.id === id)
    const requestLabel = currentRequest?.requestId ?? id
    const previousAgencies = currentRequest?.coordinationAgencies ?? []
    const added = agencies.filter((agency) => !previousAgencies.includes(agency))
    const removed = previousAgencies.filter((agency) => !agencies.includes(agency))
    const action = added.length ? `Adding ${added.join(', ')}` : removed.length ? `Removing ${removed.join(', ')}` : 'Updating agencies'
    setActionFeedback(createActionProcessingFeedback(`${action} for ${requestLabel}`, 'Agency coordination is being saved.'))
    try {
      const response = await fetch(`/api/verification/${id}/coordination`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agencies }) })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to update agency coordination')
      setRequests((current) => current.map((request) => request.id === id ? { ...request, coordinationAgencies: agencies } : request))
      const change = added.length ? `Added ${added.join(', ')}` : removed.length ? `Removed ${removed.join(', ')}` : 'Agency coordination updated'
      const feedback = createActionSuccessFeedback({
        title: `${change} for ${requestLabel}`,
        detail: agencies.length ? `Active coordination: ${agencies.join(', ')}.` : 'No external agency is currently marked as coordinating.',
        nextStep: 'The reporter-facing status now reflects this coordination.',
        userAction: 'Continue triage or dispatch when ready.',
      })
      setActionFeedback(feedback)
      toast.success(feedback.title)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update agency coordination'
      setActionFeedback(createActionErrorFeedback(`${requestLabel} coordination was not changed`, message))
      toast.error(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRelatedReportDecision = async (relatedId: string, action: 'CONFIRM_LINK' | 'KEEP_SEPARATE') => {
    const primary = selectedRequest
    const related = primary?.relatedReports.find((report) => report.id === relatedId)
    setIsProcessing(true)
    setActionFeedback(createActionProcessingFeedback(
      action === 'CONFIRM_LINK' ? `Linking ${related?.requestId ?? relatedId}` : `Separating ${related?.requestId ?? relatedId}`,
      action === 'CONFIRM_LINK'
        ? 'PACC is confirming that both reports describe one request.'
        : 'PACC is returning this report to the active queue for independent review.',
    ))
    try {
      const response = await fetch(`/api/verification/${relatedId}/related`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to decide the related report')
      const feedback = createActionSuccessFeedback({
        title: action === 'CONFIRM_LINK' ? `${related?.requestId ?? relatedId} linked` : `${related?.requestId ?? relatedId} kept separate`,
        detail: action === 'CONFIRM_LINK'
          ? 'The reporter now follows this primary response. No duplicate dispatch will be created.'
          : 'The report has returned to the active queue for its own PACC review and response.',
        nextStep: action === 'CONFIRM_LINK' ? 'Continue coordinating the primary request.' : 'Review the newly separate report when it reaches priority.',
        userAction: 'Continue PACC triage.',
      })
      setActionFeedback(feedback)
      toast.success(feedback.title)
      await fetchRequestsSilent()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to decide the related report'
      setActionFeedback(createActionErrorFeedback(`${related?.requestId ?? relatedId} was not updated`, message))
      toast.error(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDispatchSuccess = async (outcome: 'DISPATCHED' | 'STALE' = 'DISPATCHED') => {
    const dispatchedId = dispatchReqId;
    if (dispatchedId) {
      const dispatchedRequest = requests.find((request) => request.id === dispatchedId)
      const nextPending = selectNextActiveRequest(requests.filter((request) => request.id !== dispatchedId))

      if (nextPending) {
        setSelectedId(nextPending.id)
      } else {
        setSelectedId(null)
      }
      if (outcome === 'DISPATCHED') {
        setActionFeedback(createActionSuccessFeedback({
          title: `${dispatchedRequest?.requestId ?? dispatchedId} dispatch offer sent`,
          detail: 'The selected responder has been notified.',
          nextStep: 'The system is awaiting responder acceptance.',
          userAction: nextPending ? `Review ${nextPending.requestId}, the next priority report.` : 'Monitor the offer and incoming reports.',
        }))
      }
    }
    void fetchRequestsSilent()
  }

  const handleMerge = async (duplicateId: string, parentId: string) => {
    setIsProcessing(true)
    const duplicate = requests.find((request) => request.id === duplicateId)
    const parent = requests.find((request) => request.id === parentId)
    setActionFeedback(createActionProcessingFeedback(`Merging ${duplicate?.requestId ?? duplicateId}`, `Linking this duplicate to ${parent?.requestId ?? parentId}.`))
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

      // Update the duplicate request status in local state to 'DUPLICATE'
      const nextRequests = requests.map((r) => (r.id === duplicateId ? { ...r, status: "DUPLICATE" as const } : r))
      setRequests(nextRequests)

      // Close the modal and reset ID
      setIsMergeModalOpen(false)
      setMergeReqId(null)

      // Automatically select the next pending request (or null)
      const nextPending = selectNextActiveRequest(nextRequests)

      if (nextPending) {
        setSelectedId(nextPending.id)
      } else {
        setSelectedId(null)
      }
      const feedback = createActionSuccessFeedback({
        title: `${duplicate?.requestId ?? duplicateId} merged`,
        detail: `Marked as a duplicate of ${parent?.requestId ?? parentId}.`,
        nextStep: `Dispatch and status updates follow ${parent?.requestId ?? parentId}.`,
        userAction: nextPending ? `Review ${nextPending.requestId}, the next priority report.` : 'Monitor for new reports.',
      })
      setActionFeedback(feedback)
      toast.success(feedback.title)
    } catch (error: unknown) {
      console.error(error)
      const message = error instanceof Error ? error.message : "Failed to merge incident"
      setActionFeedback(createActionErrorFeedback(`${duplicate?.requestId ?? duplicateId} was not merged`, message))
      toast.error(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const selectedRequest = requests.find((r) => r.id === selectedId) || null
  const activeAlerts = requests.filter(isActiveRequest)
  const mostUrgentAlert = [...activeAlerts].sort(compareActiveVerificationItems)[0] ?? null
  const focusForTriage = (request: VerificationRequest | null) => {
    if (!request) return
    const bucket = classifyActiveVerificationBucket({
      requestStatus: request.status,
      incidentStatus: request.incident?.status,
      triageClassification: request.triageClassification,
      requiresPaccReassignment: request.requiresPaccReassignment,
      responderId: request.incident?.responderId,
      currentOfferResponderId: request.incident?.currentOfferResponderId,
    })
    if (bucket) setFilter(bucket === "ACTION" ? "ACTION" : "REVIEW")
    setSelectedId(request.id)
  }
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

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F3F4F6] p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm" role="alert">
          <h2 className="text-lg font-bold text-slate-900">Verification queue unavailable</h2>
          <p className="mt-2 text-sm text-slate-600">{loadError}</p>
          <button
            type="button"
            onClick={() => void fetchRequests()}
            className="mt-5 rounded-md bg-[#1E3A8A] px-4 py-2 text-sm font-bold text-white hover:bg-[#172F6E]"
          >
            Try again
          </button>
        </div>
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
          <div className="flex items-center gap-3 relative z-10">
            <div className="rounded-full bg-white/20 p-1.5">
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
              onClick={() => focusForTriage(mostUrgentAlert ?? activeAlerts[0])}
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
                  <Volume2 className="size-3.5" />
                  Sound On
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {actionFeedback ? (
        <ActionFeedback feedback={actionFeedback} onDismiss={() => setActionFeedback(null)} />
      ) : null}

      {/* Main Panel Content */}
      <div className="flex-1 flex overflow-hidden">
        <VerificationQueue
          requests={requests}
          selectedId={selectedId}
          onSelect={(r) => setSelectedId(r.id)}
          filter={filter}
          onFilterChange={setFilter}
        />
        <VerificationDetails
          request={selectedRequest}
          onOverrideClassification={handleClassificationOverride}
          onUpdateCoordination={handleCoordinationUpdate}
          onConfirmRelatedReport={(id) => void handleRelatedReportDecision(id, 'CONFIRM_LINK')}
          onKeepRelatedReportSeparate={(id) => void handleRelatedReportDecision(id, 'KEEP_SEPARATE')}
          isProcessing={isProcessing}
        />
        <ResidentPanel
          request={selectedRequest}
          onAccept={handleAccept}
          onReject={(id, rejectionReason) => handleUpdateStatus(id, "REJECTED", rejectionReason)}
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
        request={requests.find((request) => request.id === mergeReqId) ?? null}
        activeRequests={requests}
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
