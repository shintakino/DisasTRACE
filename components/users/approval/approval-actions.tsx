"use client";

import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";

interface ApprovalActionsProps {
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  isProcessing: boolean;
}

export function ApprovalActions({
  onApprove,
  onReject,
  isProcessing,
}: ApprovalActionsProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    await onReject(rejectionReason);
    setIsRejectDialogOpen(false);
    setRejectionReason("");
  };

  return (
    <div className="p-4 border-t bg-slate-50 flex items-center justify-end gap-3">
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="border-slate-300 text-slate-600 hover:bg-slate-100 font-bold"
            disabled={isProcessing}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject Application
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md md:max-w-2xl lg:max-w-4xl p-0 border-0 shadow-2xl rounded-[24px] max-h-[90vh] flex flex-col overflow-hidden bg-white" showCloseButton={true}>
          <div className="bg-gradient-to-r from-[#1e1b4b] to-[#2B4C9B] p-6 text-white shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-bold text-white tracking-tight">Reject Application</DialogTitle>
                <DialogDescription className="text-blue-100 text-xs font-medium mt-1">
                  Please provide a clear reason for rejecting this application.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50/30 flex-1 overflow-y-auto space-y-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="reason" className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">
                Reason for Rejection
              </Label>
              <Textarea
                id="reason"
                placeholder="e.g., Blurry ID image, Name mismatch, Expired document..."
                className="min-h-[100px] resize-none border-slate-200 bg-white font-medium focus-visible:ring-[#2B4C9B]"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="p-6 bg-white border-t border-slate-100 flex justify-end gap-2 shrink-0">
            <Button
              variant="ghost"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={isProcessing}
              className="font-bold text-slate-500"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isProcessing}
              className="font-bold rounded-xl px-5 h-11"
            >
              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white font-bold min-w-[140px]"
        onClick={onApprove}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <CheckCircle2 className="w-4 h-4 mr-2" />
        )}
        Approve Access
      </Button>
    </div>
  );
}
