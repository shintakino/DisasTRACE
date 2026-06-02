"use client";

import { createClientBrowser } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { z } from "zod";

const ResetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
  const supabase = createClientBrowser();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Auto-redirect countdown once success is triggered
  useEffect(() => {
    if (isSuccess && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isSuccess && countdown === 0) {
      const handleRedirect = async () => {
        try {
          await supabase.auth.signOut();
          router.push("/sign-in");
          router.refresh();
        } catch (err) {
          console.error("Sign out / redirect error:", err);
          router.push("/sign-in");
        }
      };
      handleRedirect();
    }
  }, [isSuccess, countdown, router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    // Validate inputs with Zod
    const validation = ResetPasswordSchema.safeParse({ password, confirmPassword });
    
    if (!validation.success) {
      const formattedErrors: { password?: string; confirmPassword?: string } = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0] === "password") {
          formattedErrors.password = err.message;
        } else if (err.path[0] === "confirmPassword") {
          formattedErrors.confirmPassword = err.message;
        }
      });
      setErrors(formattedErrors);
      return;
    }

    setIsLoading(true);

    try {
      // Update password client-side using the Supabase client
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error("Password update error:", error);
        setGeneralError(error.message || "Failed to update your password. The link may have expired or is invalid.");
        toast.error(error.message || "Failed to update your password.");
        return;
      }

      // Successful password update
      setIsSuccess(true);
      toast.success("Password updated successfully!");
    } catch (err) {
      console.error("Unexpected password update error:", err);
      setGeneralError("An unexpected error occurred. Please try again.");
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0a2e7a] font-sans selection:bg-blue-500/30">
      {/* High-Fidelity Background Mesh - Mirroring sign-in page styling */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_40%,#1e40af_0%,transparent_50%),radial-gradient(circle_at_80%_60%,#1d4ed8_0%,transparent_50%),radial-gradient(circle_at_50%_50%,#1e3a8a_0%,#0a2e7a_100%)] opacity-90" />
        
        {/* Glowing Orbs for cloudy blue effect */}
        <motion.div 
          animate={{
            x: [0, 40, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[10%] top-[10%] h-[600px] w-[600px] rounded-full bg-blue-500 opacity-20 blur-[140px]"
        />
        <motion.div 
          animate={{
            x: [0, -50, 0],
            y: [0, 40, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-[10%] bottom-[10%] h-[700px] w-[700px] rounded-full bg-blue-600 opacity-15 blur-[160px]"
        />
      </div>

      <div className="z-10 flex w-full max-w-[1400px] flex-col items-center justify-center px-12 lg:flex-row lg:gap-20 xl:gap-32">
        {/* Left Section: Logos */}
        <div className="flex w-full items-center justify-center gap-6 md:gap-12 lg:flex-1 lg:justify-end">
          {/* DisasTRACE Logo */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative flex h-[100px] w-[180px] items-center justify-center sm:h-[150px] sm:w-[280px] md:h-[200px] md:w-[350px]"
          >
            <Image
              src="/assets/DisasTRACELogo.png"
              alt="DisasTRACE Logo"
              fill
              className="object-contain scale-[2.2]"
              priority
              sizes="(max-width: 640px) 180px, (max-width: 768px) 280px, 350px"
            />
          </motion.div>
          
          {/* 'X' Symbol */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative h-10 w-10 shrink-0 md:h-14 md:w-14"
          >
            <Image
              src="/assets/close-square.png"
              alt="X"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 40px, 56px"
            />
          </motion.div>

          {/* Baliwag Seal */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative h-[90px] w-[90px] shrink-0 sm:h-[130px] sm:w-[130px] md:h-[180px] md:w-[180px]"
          >
            <Image
              src="/assets/logoBaliwag.png"
              alt="Baliwag CDRRMO Seal"
              fill
              className="object-contain scale-[1.1]"
              priority
              sizes="(max-width: 640px) 90px, (max-width: 768px) 130px, 180px"
            />
          </motion.div>
        </div>

        {/* Vertical Separator Line */}
        <div className="my-16 h-px w-full bg-white/25 lg:my-0 lg:h-[450px] lg:w-px" />

        {/* Right Section: Form Container */}
        <div className="flex w-full flex-col items-center lg:flex-1 lg:items-start">
          <div className="relative w-full max-w-[460px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-md md:p-12 space-y-10">
            
            {/* Header info */}
            <div>
              <h1 className="text-center text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-left">
                Reset Password
              </h1>
              <p className="text-slate-300 text-sm mt-3 text-center lg:text-left leading-relaxed">
                Establish a new secure access key for your verified administrative dashboard profile.
              </p>
            </div>

            {/* General Error Block */}
            {generalError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div>
                  <span className="font-bold">Recovery Failed</span>
                  <p className="mt-1 text-red-200/90 leading-relaxed">{generalError}</p>
                </div>
              </motion.div>
            )}

            {/* Password Reset Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* NEW PASSWORD */}
              <div className="space-y-2">
                <Label htmlFor="password" className="block text-[11px] font-bold tracking-[0.2em] text-white">
                  NEW PASSWORD
                </Label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-[56px] w-full rounded-xl border border-white/10 bg-white/5 px-6 pr-14 text-base text-white shadow-inner outline-none placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                    disabled={isLoading || isSuccess}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    disabled={isLoading || isSuccess}
                  >
                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-300 text-xs font-medium pl-1 animate-in fade-in duration-200">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="block text-[11px] font-bold tracking-[0.2em] text-white">
                  CONFIRM PASSWORD
                </Label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-[56px] w-full rounded-xl border border-white/10 bg-white/5 px-6 pr-14 text-base text-white shadow-inner outline-none placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                    disabled={isLoading || isSuccess}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    disabled={isLoading || isSuccess}
                  >
                    {showConfirmPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-300 text-xs font-medium pl-1 animate-in fade-in duration-200">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* COMMIT BUTTON */}
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={isLoading || isSuccess}
                  className="h-[60px] w-full rounded-xl bg-blue-600 text-lg font-bold text-white shadow-2xl hover:bg-blue-500 active:scale-[0.99] transition-all disabled:opacity-70"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span>Updating Credentials...</span>
                    </div>
                  ) : (
                    "Commit New Password"
                  )}
                </Button>
              </div>
            </form>

            {/* Elegant Success Overlay */}
            <AnimatePresence>
              {isSuccess && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md rounded-2xl text-center p-8 space-y-6"
                >
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400">
                    <motion.div
                      className="absolute inset-0 rounded-2xl bg-green-500/20 blur-md"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <ShieldCheck className="relative h-12 w-12" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white">Password Updated!</h2>
                    <p className="text-slate-300 text-sm max-w-[320px] mx-auto leading-relaxed">
                      Your credentials have been securely updated. Logging out all sessions to apply changes...
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-6 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    <span className="text-slate-300 text-xs font-bold uppercase tracking-wider">
                      Redirecting to Sign In in {countdown}s
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </div>
  );
}
