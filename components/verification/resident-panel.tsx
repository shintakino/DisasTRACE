"use client"

import { useState } from "react"
import { Check, CheckCircle2, GitMerge, History, MapPin, Phone, PhoneCall, ShieldCheck, XCircle } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RejectIncidentDialog } from "@/components/verification/reject-incident-dialog"
import { getPaccEmergencyAssistance } from "@/lib/pacc-emergency-assistance"
import type { VerificationRequest } from "@/types/verification"

interface ResidentPanelProps {
  request: VerificationRequest | null
  onAccept: (id: string) => void
  onReject: (id: string, rejectionReason: string) => Promise<boolean>
  onMerge?: (id: string) => void
  isProcessing: boolean
}

function standingFor(request: VerificationRequest) {
  if (request.resident.priorReports === 0) return "New reporter"
  if ((request.resident.reliabilityScore ?? 100) >= 80) return "Good standing"
  if ((request.resident.reliabilityScore ?? 100) >= 50) return "Review with care"
  return "Low-confidence history"
}

export function ResidentPanel({ request, onAccept, onReject, onMerge, isProcessing }: ResidentPanelProps) {
  const [rejectOpen, setRejectOpen] = useState(false)
  if (!request) return <aside className="flex w-[320px] shrink-0 items-center justify-center border-l border-slate-200 bg-white p-5 text-center text-sm text-slate-500">Select an incident to review available actions and dispatch information.</aside>

  const needsManualDispatch = request.requiresPaccReassignment === true || (request.status === "VERIFIED" && request.incident?.status === "DISPATCHED" && !request.incident.responderId && !request.incident.currentOfferResponderId)
  const canMergeDuplicate = request.status === "PENDING" && request.nature === "EMERGENCY" && !request.incident
  const terminal = request.status === "REJECTED" || request.status === "DUPLICATE" || request.incident?.status === "RESOLVED"
  const canAccept = !terminal && !isProcessing && !(request.status === "VERIFIED" && request.incident && Boolean(request.incident.responderId || request.incident.currentOfferResponderId))
  const canReject = !terminal && !isProcessing && (request.status === "PENDING" || needsManualDispatch)
  const initials = request.resident.fullName.split(/\s|,/).filter(Boolean).slice(0, 2).map((name) => name[0]).join("").toUpperCase()
  const statusText = request.incident?.status === "RESOLVED" ? "Case closed" : request.status === "REJECTED" ? "Rejected with public feedback" : request.incident?.responderId ? "Responder assigned" : needsManualDispatch ? "PACC reassignment required" : request.status === "VERIFIED" ? "Awaiting response workflow" : "Awaiting PACC decision"
  const assistance = getPaccEmergencyAssistance(request.type)

  return <aside className="flex w-[320px] shrink-0 flex-col gap-3 overflow-hidden border-l border-slate-200 bg-white p-3">
    {!terminal ? <Card className="border-slate-200 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">PACC actions</p><div className="mt-2 grid gap-2"><Button type="button" className="h-9 gap-2 bg-[#1E3A8A] text-sm font-bold hover:bg-[#172F6E]" onClick={() => onAccept(request.id)} disabled={!canAccept}><Check className="size-4" />{request.status === "VERIFIED" ? "Dispatch report" : "Accept report"}</Button>{canMergeDuplicate ? <Button type="button" variant="outline" className="h-9 gap-2 border-amber-200 bg-amber-50 text-sm font-bold text-amber-900 hover:bg-amber-100" onClick={() => onMerge?.(request.id)} disabled={isProcessing}><GitMerge className="size-4" />Merge duplicate</Button> : null}<Button type="button" variant="outline" className="h-9 gap-2 border-red-100 text-sm font-bold text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => setRejectOpen(true)} disabled={!canReject}><XCircle className="size-4" />Reject report</Button></div></Card> : null}
    <Card className="border-blue-100 bg-blue-50/40 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-[#1E3A8A]">External emergency assistance</p><div className="mt-2 rounded-md bg-white p-2.5"><p className="text-sm font-bold text-slate-900">{assistance.agency}</p><p className="mt-0.5 text-xs text-slate-500">{assistance.purpose}</p><div className="mt-2 flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-sm font-black text-slate-800"><Phone className="size-3.5 text-[#1E3A8A]" />{assistance.hotline}</span><a href={assistance.telHref} aria-label={`Call ${assistance.agency} at ${assistance.hotline}`} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"><PhoneCall className="size-3.5" />Call</a></div></div></Card>
    {request.status === "REJECTED" ? <Card className="border-red-200 bg-red-50 p-3 text-red-900"><div className="flex items-center gap-2 text-sm font-bold"><XCircle className="size-4" />Rejected</div><p className="mt-1 text-xs leading-5">{request.rejectionReason ?? "No rejection reason was recorded for this legacy report."}</p></Card> : null}
    <details className="rounded-md border border-blue-100 bg-blue-50/50"><summary className="cursor-pointer list-none px-3 py-2 text-xs font-black uppercase tracking-wide text-[#1E3A8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1E3A8A]">Decision support</summary><div className="border-t border-blue-100 px-3 py-2"><p className="text-sm font-bold text-slate-900">{standingFor(request)}</p><p className="mt-1 text-xs leading-4 text-slate-600">{request.triageReasons?.join(" ") || "Review the report evidence, location, and reporter context before deciding."}</p></div></details>
    <section className="border-t border-slate-100 pt-3"><p className="text-[10px] font-black uppercase tracking-wide text-[#1E3A8A]">Dispatch log</p><div className="mt-2 rounded-md bg-slate-50 p-2.5 text-xs"><p className="font-bold text-slate-900">{request.type} · {request.severity} severity</p><p className="mt-1 flex gap-1.5 text-slate-600"><MapPin className="size-3.5 shrink-0 text-[#1E3A8A]" />{request.location}</p><p className="mt-1 text-slate-600">{request.peopleInvolved} person{request.peopleInvolved === 1 ? "" : "s"} reported · {request.reporterType === "REGISTERED" ? "Registered reporter" : "Guest reporter"}</p></div><div className="mt-3 space-y-2.5"><div className="flex gap-2 text-xs"><CheckCircle2 className="size-4 shrink-0 text-emerald-600" /><div><p className="font-bold text-slate-800">Report received</p><p className="text-slate-500">{new Date(request.receivedAt).toLocaleString()}</p></div></div><div className="flex gap-2 text-xs"><CheckCircle2 className="size-4 shrink-0 text-blue-600" /><div><p className="font-bold text-slate-800">Triage recorded</p><p className="text-slate-500">{request.triageClassification.replaceAll("_", " ")}</p></div></div><div className="flex gap-2 text-xs"><span className="mt-0.5 size-3.5 shrink-0 rounded-full border-2 border-slate-300" /><div><p className="font-bold text-slate-800">{statusText}</p><p className="text-slate-500">Continue with the applicable PACC action.</p></div></div></div></section>
    <details className="border-t border-slate-100 pt-2"><summary className="cursor-pointer list-none text-xs font-black uppercase tracking-wide text-[#1E3A8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]">Reporter context</summary><div className="mt-2"><div className="flex items-center gap-2"><Avatar className="size-8"><AvatarFallback className="bg-[#1E3A8A] text-[10px] font-black text-white">{initials || "GR"}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{request.resident.fullName}</p><p className="flex items-center gap-1 text-[11px] text-slate-500">{request.resident.isVerified ? <><ShieldCheck className="size-3 text-emerald-600" />Verified account</> : "Guest reporter"}</p></div></div><div className="mt-2 space-y-1.5 text-xs text-slate-600"><p className="flex gap-2"><Phone className="size-3.5 shrink-0 text-[#1E3A8A]" />{request.resident.phone}</p><p className="flex gap-2"><History className="size-3.5 shrink-0 text-[#1E3A8A]" />{request.resident.priorReports} prior report{request.resident.priorReports === 1 ? "" : "s"}</p></div></div></details>
    <RejectIncidentDialog open={rejectOpen} onOpenChange={setRejectOpen} onConfirm={(reason) => onReject(request.id, reason)} isProcessing={isProcessing} />
  </aside>
}
