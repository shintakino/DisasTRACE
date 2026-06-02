"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleReset = () => {
    setEmail("");
    setEmployeeId("");
    setError(null);
    setIsSuccess(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !employeeId) {
      setError("Please fill in both Email Address and Employee ID.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, employeeId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to dispatch recovery link.");
        toast.error(data.error || "Failed to dispatch recovery link.");
        return;
      }

      setIsSuccess(true);
      toast.success("Password recovery link sent successfully!");
    } catch (err) {
      console.error("Forgot password submission error:", err);
      setError("An unexpected error occurred. Please check your connection and try again.");
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[460px] overflow-hidden rounded-2xl border border-white/20 bg-slate-900/90 p-0 text-white shadow-2xl backdrop-blur-xl sm:max-w-[460px]">
        
        {/* Glow overlay */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,#1e3a8a_0%,transparent_70%)] opacity-40" />

        <div className="p-8">
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div
                key="forgot-password-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <DialogHeader className="space-y-3">
                  <div className="flex justify-center sm:justify-start">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      <Mail className="h-6 w-6 animate-pulse" />
                    </div>
                  </div>
                  <DialogTitle className="text-2xl font-bold tracking-tight text-white text-center sm:text-left">
                    Forgot Password Recovery
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-sm leading-relaxed text-center sm:text-left">
                    Provide your registered Email Address and Employee ID to verify your identity and dispatch a password reset link.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Inline Error Block */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-300"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      <div>
                        <span className="font-bold">Verification Error</span>
                        <p className="mt-1 text-red-200/90 leading-relaxed">{error}</p>
                      </div>
                    </motion.div>
                  )}

                  {/* EMAIL ADDRESS */}
                  <div className="space-y-2">
                    <Label htmlFor="modal-email" className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Email Address
                    </Label>
                    <div className="relative">
                      <input
                        id="modal-email"
                        type="email"
                        placeholder="name@cdrrmo.gov.ph"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-[52px] w-full rounded-xl border border-white/10 bg-white/5 px-4 pl-12 text-sm text-white shadow-inner outline-none placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                        disabled={isLoading}
                      />
                      <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>

                  {/* EMPLOYEE ID */}
                  <div className="space-y-2">
                    <Label htmlFor="modal-employee-id" className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Employee ID
                    </Label>
                    <div className="relative">
                      <input
                        id="modal-employee-id"
                        type="text"
                        placeholder="CDRRMO-2026-XXXX"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        className="h-[52px] w-full rounded-xl border border-white/10 bg-white/5 px-4 pl-12 text-sm text-white shadow-inner outline-none placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                        disabled={isLoading}
                      />
                      <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>

                  {/* DISPATCH BUTTON */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="h-[52px] w-full rounded-xl bg-blue-600 text-sm font-bold text-white shadow-xl hover:bg-blue-500 active:scale-[0.99] transition-all disabled:opacity-50"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Dispatching Link...</span>
                        </div>
                      ) : (
                        "Dispatch Recovery Link"
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="forgot-password-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="flex flex-col items-center justify-center text-center space-y-6 py-6"
              >
                {/* pulsing recovery success card */}
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400">
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-green-500/20 blur-md"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <CheckCircle2 className="relative h-10 w-10" />
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl font-bold tracking-tight text-white">
                    Link Dispatched Successfully!
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed max-w-[340px] mx-auto">
                    A secure password reset link has been dispatched to <span className="font-bold text-white underline decoration-blue-400 underline-offset-4">{email}</span>.
                  </p>
                  <p className="text-slate-400 text-xs mt-2">
                    Please check your spam or junk folder if you don't receive it in a couple of minutes.
                  </p>
                </div>

                <div className="w-full pt-4">
                  <Button
                    onClick={handleClose}
                    className="h-[52px] w-full rounded-xl bg-slate-800 text-sm font-bold text-white border border-slate-700 hover:bg-slate-700 hover:text-white active:scale-[0.99] transition-all"
                  >
                    Return to Sign In
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
