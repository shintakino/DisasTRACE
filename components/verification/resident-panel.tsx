"use client";

import { useState } from "react";
import { Check, CheckCircle2, GitMerge, History, MapPin, Phone, ShieldCheck, XCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RejectIncidentDialog } from "@/components/verification/reject-incident-dialog";
import type { VerificationRequest } from "@/types/verification";

interface ResidentPanelProps {
  request: VerificationRequest | null;
  onAccept: (id: string) => void;
  onReject: (id: string, rejectionReason: string) => Promise<boolean>;
  onMerge?: (id: string) => void;
  isProcessing: boolean;
}

function standingFor(request: VerificationRequest) {
  if (request.resident.priorReports === 0) return "New reporter";
  if ((request.resident.reliabilityScore ?? 100) >= 80) return "Good standing";
  if ((request.resident.reliabilityScore ?? 100) >= 50) return "Review with care";
  return "Low-confidence history";
}

export function ResidentPanel({ request, onAccept, onReject, onMerge, isProcessing }: ResidentPanelProps) {
  const [rejectOpen, setRejectOpen] = useState(false);
  if (!request) return <aside className="flex w-[300px] shrink-0 items-center justify-center border-l border-slate-200 bg-white p-5 text-center text-sm text-slate-500">Select an incident to review available actions and reporter context.</aside>;

  const needsManualDispatch = request.requiresPaccReassignment === true || (request.status === "VERIFIED" && request.incident?.status === "DISPATCHED" && !request.incident.responderId && !request.incident.currentOfferResponderId);
  const canMergeDuplicate = request.status === "PENDING" && request.nature === "EMERGENCY" && !request.incident;
  const terminal = request.status === "REJECTED" || request.status === "DUPLICATE" || request.incident?.status === "RESOLVED";
  const canAccept = !terminal && !isProcessing && !(request.status === "VERIFIED" && request.incident && Boolean(request.incident.responderId || request.incident.currentOfferResponderId));
  const canReject = !terminal && !isProcessing && (request.status === "PENDING" || needsManualDispatch);
  const initials = request.resident.fullName.split(/\s|,/).filter(Boolean).slice(0, 2).map((name) => name[0]).join("").toUpperCase();
  const statusText = request.incident?.status === "RESOLVED" ? "Case closed" : request.status === "REJECTED" ? "Rejected with public feedback" : request.incident?.responderId ? "Responder assigned" : needsManualDispatch ? "PACC reassignment required" : request.status === "VERIFIED" ? "Awaiting response workflow" : "Awaiting PACC decision";

  return <aside className="flex w-[300px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-slate-200 bg-white p-4">
    {!terminal ? <><div className="grid grid-cols-2 gap-2"><Button type="button" variant="destructive" className="gap-2 font-bold" onClick={() => setRejectOpen(true)} disabled={!canReject}><XCircle className="size-4" />Reject</Button><Button type="button" className="gap-2 bg-[#1E3A8A] font-bold hover:bg-[#172F6E]" onClick={() => onAccept(request.id)} disabled={!canAccept}><Check className="size-4" />{request.status === "VERIFIED" ? "Dispatch" : "Accept"}</Button></div>{canMergeDuplicate ? <Button type="button" variant="outline" className="w-full gap-2 border-amber-200 bg-amber-50 font-bold text-amber-900 hover:bg-amber-100" onClick={() => onMerge?.(request.id)} disabled={isProcessing}><GitMerge className="size-4" />Merge duplicate</Button> : null}</> : null}
    {request.status === "REJECTED" ? <Card className="border-red-200 bg-red-50 p-4 text-red-900"><div className="flex items-center gap-2 text-sm font-bold"><XCircle className="size-4" />Rejected</div><p className="mt-2 text-xs leading-5">{request.rejectionReason ?? "No rejection reason was recorded for this legacy report."}</p></Card> : null}
    <Card className="border-blue-100 bg-blue-50/50 p-4"><p className="text-xs font-black uppercase tracking-wide text-[#1E3A8A]">Decision support</p><p className="mt-2 text-sm font-bold text-slate-900">{standingFor(request)}</p><p className="mt-1 text-xs leading-5 text-slate-600">{request.triageReasons?.join(" ") || "Review the report evidence, location, and reporter context before deciding."}</p></Card>
    <section className="border-t border-slate-100 pt-4"><div className="flex items-center gap-3"><Avatar className="size-10"><AvatarFallback className="bg-[#1E3A8A] text-xs font-black text-white">{initials || "GR"}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{request.resident.fullName}</p><p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">{request.resident.isVerified ? <><ShieldCheck className="size-3 text-emerald-600" />Verified account</> : "Guest reporter"}</p></div></div><div className="mt-4 space-y-3 text-xs"><p className="flex gap-2 text-slate-600"><Phone className="size-3.5 shrink-0 text-[#1E3A8A]" /><span>{request.resident.phone}</span></p><p className="flex gap-2 text-slate-600"><MapPin className="size-3.5 shrink-0 text-[#1E3A8A]" /><span>{request.resident.address}</span></p><p className="flex gap-2 text-slate-600"><History className="size-3.5 shrink-0 text-[#1E3A8A]" /><span>{request.resident.priorReports} prior report{request.resident.priorReports === 1 ? "" : "s"}</span></p></div></section>
    <section className="border-t border-slate-100 pt-4"><p className="text-xs font-black uppercase tracking-wide text-[#1E3A8A]">Dispatch log</p><div className="mt-3 space-y-3"><div className="flex gap-3 text-xs"><CheckCircle2 className="size-4 shrink-0 text-emerald-600" /><div><p className="font-bold text-slate-800">Report received</p><p className="text-slate-500">{new Date(request.receivedAt).toLocaleString()}</p></div></div><div className="flex gap-3 text-xs"><CheckCircle2 className="size-4 shrink-0 text-blue-600" /><div><p className="font-bold text-slate-800">Triage recorded</p><p className="text-slate-500">{request.triageClassification.replaceAll("_", " ")}</p></div></div><div className="flex gap-3 text-xs"><span className="mt-0.5 size-3.5 shrink-0 rounded-full border-2 border-slate-300" /><div><p className="font-bold text-slate-800">{statusText}</p><p className="text-slate-500">Continue with the applicable PACC action.</p></div></div></div></section>
    <RejectIncidentDialog open={rejectOpen} onOpenChange={setRejectOpen} onConfirm={(reason) => onReject(request.id, reason)} isProcessing={isProcessing} />
  </aside>;
}
