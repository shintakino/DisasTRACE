"use client";

import { useEffect, useState } from "react";
import { Applicant } from "@/types/approval";
import { ApprovalQueue } from "@/components/users/approval/approval-queue";
import { ApplicantDetails } from "@/components/users/approval/applicant-details";
import { ApprovalActions } from "@/components/users/approval/approval-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";

export default function UsersApprovalPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [summary, setSummary] = useState({ pending: 0, reviewedToday: 0 });
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchApplicants();
  }, []);

  const fetchApplicants = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/users/approval");
      const data = await response.json();
      setApplicants(data.applicants);
      setSummary(data.summary);
      if (data.applicants.length > 0) {
        setSelectedApplicant(data.applicants[0]);
      }
    } catch (error) {
      toast.error("Failed to fetch applicants");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApplicant) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/users/approval/${selectedApplicant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      if (response.ok) {
        toast.success(`Account for ${selectedApplicant.fullName} approved`);
        // Refresh list and select next
        const nextApplicants = applicants.filter(a => a.id !== selectedApplicant.id);
        setApplicants(nextApplicants);
        setSummary(prev => ({ ...prev, pending: prev.pending - 1, reviewedToday: prev.reviewedToday + 1 }));
        setSelectedApplicant(nextApplicants.length > 0 ? nextApplicants[0] : null);
      } else {
        toast.error("Failed to approve application");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!selectedApplicant) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/users/approval/${selectedApplicant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", reason }),
      });

      if (response.ok) {
        toast.error(`Account for ${selectedApplicant.fullName} rejected`);
        // Refresh list and select next
        const nextApplicants = applicants.filter(a => a.id !== selectedApplicant.id);
        setApplicants(nextApplicants);
        setSummary(prev => ({ ...prev, pending: prev.pending - 1, reviewedToday: prev.reviewedToday + 1 }));
        setSelectedApplicant(nextApplicants.length > 0 ? nextApplicants[0] : null);
      } else {
        toast.error("Failed to reject application");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-120px)] bg-white border rounded-xl overflow-hidden">
        <div className="w-80 border-r flex flex-col">
          <div className="p-4 border-b space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="p-6 border-b space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="p-8 space-y-8">
            <Skeleton className="h-64 w-full" />
            <div className="grid grid-cols-2 gap-8">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white border rounded-xl overflow-hidden shadow-sm">
      {/* Master View: Queue */}
      <div className="w-80 shrink-0">
        <ApprovalQueue
          applicants={applicants}
          selectedId={selectedApplicant?.id}
          onSelect={setSelectedApplicant}
          summary={summary}
        />
      </div>

      {/* Detail View: Applicant Details & Actions */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedApplicant ? (
          <>
            <div className="flex-1 overflow-hidden">
              <ApplicantDetails applicant={selectedApplicant} />
            </div>
            <ApprovalActions
              onApprove={handleApprove}
              onReject={handleReject}
              isProcessing={isProcessing}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
            <div className="bg-white p-6 rounded-full shadow-sm mb-4">
              <UserCheck className="w-12 h-12 text-slate-200" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Queue is Clear</h3>
            <p className="text-sm">All registration requests have been reviewed.</p>
          </div>
        )}
      </div>
    </div>
  );
}
