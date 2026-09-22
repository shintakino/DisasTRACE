"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, FileWarning, MessageCircleWarning, Send, ShieldX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MAX_REJECTION_REASON_LENGTH, normalizeRequiredRejectionReason } from "@/lib/rejected-report-workflow";

interface RejectIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<boolean>;
  isProcessing: boolean;
}

const reasonOptions = [
  { id: "false_report", label: "False or prank report", description: "The incident details could not be verified or appear intentionally false.", template: "PACC could not verify this report and identified it as a false or prank submission.", icon: FileWarning },
  { id: "low_confidence", label: "Insufficient or inconsistent details", description: "The available location, evidence, or incident details do not support a response.", template: "PACC could not verify this report because the submitted details were insufficient or inconsistent.", icon: AlertTriangle },
  { id: "repeated", label: "Repeated or spam submission", description: "The report duplicates repeated submissions without new actionable information.", template: "PACC rejected this report because it is a repeated submission without new actionable information.", icon: MessageCircleWarning },
  { id: "other", label: "Other verified reason", description: "Provide a clear explanation that the public reporter can understand.", template: "", icon: ShieldX },
] as const;

export function RejectIncidentDialog({ open, onOpenChange, onConfirm, isProcessing }: RejectIncidentDialogProps) {
  const [selectedReason, setSelectedReason] = useState<(typeof reasonOptions)[number]["id"] | null>(null);
  const [notes, setNotes] = useState("");
  const option = reasonOptions.find((item) => item.id === selectedReason);
  const maxNotesLength = Math.max(0, MAX_REJECTION_REASON_LENGTH - (option?.template.length ?? 0) - (option?.template ? 1 : 0));
  const fullReason = useMemo(() => [option?.template, notes.trim()].filter(Boolean).join(" "), [notes, option?.template]);
  const normalizedReason = normalizeRequiredRejectionReason(fullReason);
  const close = () => { if (!isProcessing) { setSelectedReason(null); setNotes(""); onOpenChange(false); } };
  const submit = async () => { if (normalizedReason && await onConfirm(normalizedReason)) close(); };

  return <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : close()}>
    <DialogContent className="w-[min(94vw,64rem)] max-w-none border-slate-200 bg-white p-0 shadow-xl" showCloseButton={false}>
      <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-red-50 text-red-600"><ShieldX className="size-6" /></span><div><DialogTitle className="text-xl font-black text-[#1E3A8A]">Reject Incident</DialogTitle><DialogDescription className="mt-1 text-sm">Select a verified reason for rejecting this incident report.</DialogDescription></div></div><Button type="button" size="icon" variant="ghost" onClick={close} disabled={isProcessing} aria-label="Close rejection dialog"><X className="size-4" /></Button></div></DialogHeader>
      <div className="space-y-4 px-6 py-5"><div role="alert" className="flex gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" /><span>This decision removes the report from the active verification queue. The selected explanation is shown to the public reporter.</span></div><fieldset><legend className="text-sm font-bold text-slate-900">Reason for rejection</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{reasonOptions.map((item) => { const Icon = item.icon; const selected = selectedReason === item.id; return <label key={item.id} className={`cursor-pointer rounded-lg border p-4 transition-colors ${selected ? "border-[#1E3A8A] bg-blue-50 ring-1 ring-[#1E3A8A]" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"}`}><input type="radio" name="rejection-reason" value={item.id} checked={selected} onChange={() => setSelectedReason(item.id)} className="sr-only" disabled={isProcessing} /><span className="flex gap-3"><span className={`grid size-8 shrink-0 place-items-center rounded-md ${selected ? "bg-[#1E3A8A] text-white" : "bg-slate-100 text-slate-600"}`}><Icon className="size-4" /></span><span><span className="block text-sm font-bold text-slate-900">{item.label}</span><span className="mt-1 block text-xs leading-4 text-slate-500">{item.description}</span></span></span></label>; })}</div></fieldset><div><label htmlFor="rejection-notes" className="text-sm font-bold text-slate-900">Additional notes {selectedReason === "other" ? "(required)" : "(optional)"}</label><Textarea id="rejection-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={maxNotesLength} disabled={isProcessing || !selectedReason} placeholder={selectedReason === "other" ? "Explain the verified reason for rejection." : "Add details that will help the public reporter understand this decision."} className="mt-2 min-h-24 resize-none" /><div className="mt-1 flex justify-between text-xs text-slate-500"><span>{normalizedReason ? "Public feedback ready" : "Select a reason and provide an explanation when required."}</span><span>{notes.length}/{maxNotesLength}</span></div></div></div>
      <DialogFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4"><Button type="button" variant="outline" onClick={close} disabled={isProcessing}>Cancel</Button><Button type="button" variant="destructive" onClick={submit} disabled={!normalizedReason || isProcessing} className="gap-2"><Send className="size-4" />{isProcessing ? "Rejecting…" : "Reject incident"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
