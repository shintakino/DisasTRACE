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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Reject Application
            </DialogTitle>
            <DialogDescription>
              Please provide a clear reason for rejecting this application. This will be sent to the applicant.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="reason" className="text-xs font-bold uppercase text-slate-500">
              Reason for Rejection
            </Label>
            <Textarea
              id="reason"
              placeholder="e.g., Blurry ID image, Name mismatch, Expired document..."
              className="min-h-[100px] resize-none"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isProcessing}
              className="font-bold"
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
