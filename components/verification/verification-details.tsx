"use client"

import type { ReactNode } from "react"
import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, CheckCircle2, Info, MapPin, ShieldAlert, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TriageClassification, VerificationRequest } from "@/types/verification"

interface VerificationDetailsProps {
  request: VerificationRequest | null
  onOverrideClassification: (id: string, value: TriageClassification) => void
  onUpdateCoordination: (id: string, agencies: string[]) => void
  onConfirmRelatedReport: (id: string) => void
  onKeepRelatedReportSeparate: (id: string) => void
  isProcessing: boolean
}

const AGENCIES = ["PNP", "BFP", "CDRRMO", "Barangay", "DSWD", "Hospital"]

function supportFor(classification: TriageClassification) {
  if (classification === "SUSPICIOUS_POSSIBLE_PRANK") return { title: "This report has signals that require careful verification.", detail: "Review the evidence, location, and reporter context before accepting or rejecting it.", className: "border-red-200 bg-red-50 text-red-900", icon: ShieldAlert }
  if (classification === "HIGH_CONFIDENCE_EMERGENCY") return { title: "This report appears internally consistent.", detail: "Confirm the details, then continue the emergency-response workflow.", className: "border-emerald-200 bg-emerald-50 text-emerald-900", icon: CheckCircle2 }
  return { title: "This report needs further verification.", detail: "Check supporting information and coordinate with the reporter when needed.", className: "border-amber-200 bg-amber-50 text-amber-950", icon: AlertTriangle }
}

function severityClass(severity: VerificationRequest["severity"]) {
  if (severity === "Critical") return "bg-red-700"
  if (severity === "High") return "bg-rose-600"
  if (severity === "Medium") return "bg-amber-500"
  return "bg-emerald-600"
}

export function VerificationDetails({ request, onOverrideClassification, onUpdateCoordination, onConfirmRelatedReport, onKeepRelatedReportSeparate, isProcessing }: VerificationDetailsProps) {
  if (!request) return <main className="flex flex-1 items-center justify-center bg-slate-50 p-6 text-base italic text-slate-500">Select an incident from the queue to start verification.</main>

  const isPendingDispatch = request.requiresPaccReassignment === true || (request.status === "VERIFIED" && request.incident?.status === "DISPATCHED" && !request.incident.responderId && !request.incident.currentOfferResponderId)
  const isAwaitingResponder = request.status === "VERIFIED" && request.incident?.status === "DISPATCHED" && !request.incident.responderId && Boolean(request.incident.currentOfferResponderId)
  const isTerminal = request.status === "REJECTED" || request.status === "DUPLICATE" || request.incident?.status === "RESOLVED"
  const controlsDisabled = isProcessing || isTerminal || isAwaitingResponder
  const classification = request.triageClassification || "UNCERTAIN_INCOMPLETE"
  const support = supportFor(classification)
  const SupportIcon = support.icon
  const coordinationAgencies = request.coordinationAgencies ?? []
  const workflow = isPendingDispatch ? "PACC reassignment required" : isAwaitingResponder ? "Awaiting responder" : request.incident?.status === "RESOLVED" ? "Case closed" : request.status === "REJECTED" ? "Rejected" : request.status === "VERIFIED" ? "Response in progress" : "For PACC decision"

  return <main className="min-w-0 flex-1 overflow-hidden bg-slate-50 p-3 lg:p-4"><section className="mx-auto max-w-6xl space-y-3">
    <header className="border-b border-slate-200 pb-3">
      <div className="flex flex-wrap items-center gap-2"><Badge className={cn("border-0 px-2.5 py-1 text-[11px] font-black uppercase", severityClass(request.severity))}>{request.severity} severity</Badge><Badge variant="outline" className="border-blue-100 bg-blue-50 font-mono text-xs font-bold text-[#1E3A8A]">{request.requestId}</Badge><span className="ml-auto text-xs font-medium text-slate-500">Received {formatDistanceToNow(new Date(request.receivedAt), { addSuffix: true })}</span></div>
      <h1 className="mt-2 text-2xl font-black tracking-tight text-[#123B82] lg:text-3xl">{request.type}</h1>
    </header>

    <div role="status" className={cn("flex gap-2 rounded-lg border px-3 py-2.5", support.className)}><SupportIcon className="mt-0.5 size-5 shrink-0" /><div><p className="text-sm font-bold">{support.title}</p><p className="mt-0.5 text-xs opacity-80">{support.detail}</p></div></div>

    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<Users className="size-4" />} label="People involved" value={String(request.peopleInvolved)} /><Metric icon={<AlertTriangle className="size-4" />} label="Priority" value={request.severity} color={severityClass(request.severity)} /><Card className="border-slate-200 bg-white p-3 shadow-none"><p className="text-[11px] font-semibold text-slate-500">Incident type</p><p className="mt-1 truncate text-sm font-black text-[#123B82]">{request.type}</p><Badge variant="outline" className="mt-1.5 text-[10px]">{request.nature}</Badge></Card><Card className="border-slate-200 bg-white p-3 shadow-none"><p className="text-[11px] font-semibold text-slate-500">Workflow status</p><p className="mt-1 text-sm font-black text-[#123B82]">{workflow}</p><p className="mt-1 text-[11px] text-slate-500">{isAwaitingResponder ? "Offer pending in background." : "Updated from the server."}</p></Card></div>

    <div className="grid gap-3 lg:grid-cols-[1.35fr_.85fr]"><div className="relative min-h-44 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">{request.imageUrl ? <img src={request.imageUrl} alt="User-submitted incident evidence" className="h-full min-h-44 w-full object-cover" /> : <div className="flex min-h-44 flex-col items-center justify-center gap-2 text-sm text-slate-500"><Info className="size-6 opacity-40" />No evidence photo submitted</div>}<Badge className="absolute left-3 top-3 border-0 bg-[#1E3A8A] px-2 py-0.5 text-[11px] font-bold">User submitted</Badge></div><Card className="flex min-h-44 flex-col justify-between border-slate-200 bg-white p-3 shadow-none"><div><p className="text-[11px] font-black uppercase tracking-wide text-[#1E3A8A]">Location review</p><MapPin className="mt-3 size-6 text-rose-600" /><p className="mt-2 text-sm font-bold text-slate-900">{request.location}</p><p className="mt-1 text-xs text-slate-500">Use the Command Map for the report pin and response context.</p></div>{request.photoLatitude !== undefined && request.photoLongitude !== undefined ? <p className="mt-3 text-[11px] text-slate-500">Evidence GPS: {request.photoLatitude.toFixed(5)}, {request.photoLongitude.toFixed(5)}</p> : null}</Card></div>

    <details className="group rounded-lg border border-slate-200 bg-white shadow-none"><summary className="cursor-pointer list-none px-3 py-2 text-sm font-bold text-[#1E3A8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1E3A8A]"><span className="flex items-center justify-between">Advanced review controls <span className="text-xs font-medium text-slate-500 group-open:hidden">Expand when needed</span></span></summary><div className="max-h-72 space-y-3 overflow-y-auto border-t border-slate-100 p-3">
    {request.relatedReports.length > 0 ? <Card className="border-violet-200 bg-violet-50/60 p-5 shadow-none"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-lg font-bold text-violet-950">Related reports</p><p className="text-base text-violet-900/70">Review whether these reports refer to the same incident before coordinating a separate response.</p></div><Badge className="bg-violet-700 text-sm">{request.relatedReports.length} related</Badge></div><div className="mt-3 space-y-2">{request.relatedReports.map((related) => <div key={related.id} className="rounded-lg border border-violet-200 bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-mono text-sm font-bold text-slate-800">{related.requestId}</p><Badge variant="outline" className="text-xs">{related.relation === "PACC_REVIEW" ? "PACC review required" : "Linked"}</Badge></div><p className="mt-1 text-sm text-slate-600">{related.reporterName} - {related.location} - {formatDistanceToNow(new Date(related.receivedAt), { addSuffix: true })}</p>{related.relation === "PACC_REVIEW" ? <div className="mt-3 flex gap-2"><button type="button" disabled={controlsDisabled} onClick={() => onConfirmRelatedReport(related.id)} className="rounded-md bg-violet-700 px-3 py-2 text-sm font-bold text-white disabled:bg-slate-300">Confirm same incident</button><button type="button" disabled={controlsDisabled} onClick={() => onKeepRelatedReportSeparate(related.id)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:text-slate-400">Keep separate</button></div> : null}</div>)}</div></Card> : null}

    <Card className="border-amber-200 bg-amber-50/60 p-5 shadow-none"><p className="text-sm font-black uppercase tracking-wide text-amber-900">Automated initial verification</p><p className="mt-1 text-lg font-bold text-slate-900">{classification.replaceAll("_", " ")}</p><p className="mt-1 text-base text-slate-600">{request.triageReasons?.join(" ") || "No automated verification details were recorded."}</p><label className="mt-4 block text-sm font-bold text-slate-700" htmlFor="pacc-classification">PACC classification override</label><select id="pacc-classification" disabled={controlsDisabled} value={classification} onChange={(event) => onOverrideClassification(request.id, event.target.value as TriageClassification)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base disabled:cursor-not-allowed disabled:bg-slate-100"><option value="HIGH_CONFIDENCE_EMERGENCY">High-confidence emergency</option><option value="HIGH_CONFIDENCE_NON_EMERGENCY">High-confidence non-emergency</option><option value="UNCERTAIN_INCOMPLETE">Uncertain / incomplete</option><option value="SUSPICIOUS_POSSIBLE_PRANK">Suspicious / possible prank</option></select></Card>

    <Card className="border-blue-200 bg-blue-50/50 p-5 shadow-none"><p className="text-sm font-black uppercase tracking-wide text-[#1E3A8A]">PACC agency coordination</p><p className="mt-1 text-base text-slate-600">Mark each other responding unit only when PACC is actively coordinating it. The reporter sees the same live coordination status.</p><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{AGENCIES.map((agency) => { const active = coordinationAgencies.includes(agency); return <label key={agency} className={cn("flex min-h-12 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-base font-bold", active ? "border-[#1E3A8A] bg-[#1E3A8A] text-white" : "border-blue-200 bg-white text-[#1E3A8A]", controlsDisabled && "cursor-not-allowed opacity-60")}><input type="checkbox" checked={active} disabled={controlsDisabled} onChange={() => onUpdateCoordination(request.id, active ? coordinationAgencies.filter((item) => item !== agency) : [...coordinationAgencies, agency])} className="size-4 accent-[#1E3A8A]" />{agency}</label>})}</div></Card>
    </div></details>
  </section></main>
}

function Metric({ icon, label, value, color }: { icon: ReactNode; label: string; value: string; color?: string }) {
  return <Card className="border-slate-200 bg-white p-3 shadow-none"><div className="flex items-center gap-2"><span className={cn("grid size-8 place-items-center rounded-full bg-blue-50 text-[#1E3A8A]", color && `${color} text-white`)}>{icon}</span><div><p className="text-[11px] font-semibold text-slate-500">{label}</p><p className="text-lg font-black text-slate-900">{value}</p></div></div></Card>
}
