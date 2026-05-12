"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "motion/react";

export default function SignInPage() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { error } = await signIn.password({
        identifier: email,
        password: password,
      });

      if (error) {
        toast.error(error.message || "Failed to sign in. Please check your credentials.");
        return;
      }

      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            router.push(decorateUrl("/dashboard"));
          },
        });
      }
    } catch (err) {
      console.error("Sign in error:", err);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0a2e7a] font-sans selection:bg-blue-500/30">
      {/* High-Fidelity Background Mesh - Mirroring loginWeb.png exactly */}
      <div className="absolute inset-0 z-0">
        {/* Base Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_40%,#1e40af_0%,transparent_50%),radial-gradient(circle_at_80%_60%,#1d4ed8_0%,transparent_50%),radial-gradient(circle_at_50%_50%,#1e3a8a_0%,#0a2e7a_100%)] opacity-90" />
        
        {/* Glowing Orbs for that "Cloudy" blue effect */}
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
        {/* Left Section: Logos - Mirrored layout and sizing */}
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
              className="object-contain scale-[2.2]" // Aggressive scale to compensate for asset padding
              priority
            />
          </motion.div>
          
          {/* 'X' Symbol Asset */}
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
            />
          </motion.div>
        </div>

        {/* Vertical Separator Line */}
        <div className="my-16 h-px w-full bg-white/25 lg:my-0 lg:h-[450px] lg:w-px" />

        {/* Right Section: Welcome & Form */}
        <div className="flex w-full flex-col items-center lg:flex-1 lg:items-start">
          <div className="w-full max-w-[440px] space-y-12">
            <h1 className="text-center text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-left">
              Welcome to DisasTRACE!
            </h1>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* EMAIL */}
              <div className="space-y-3">
                <Label htmlFor="email" className="block text-[11px] font-bold tracking-[0.2em] text-white">
                  EMAIL
                </Label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-[56px] w-full rounded-xl border-none bg-white px-6 text-base text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400/40 transition-all"
                />
              </div>

              {/* EMPLOYEE ID */}
              <div className="space-y-3">
                <Label htmlFor="employeeId" className="block text-[11px] font-bold tracking-[0.2em] text-white">
                  EMPLOYEE ID
                </Label>
                <input
                  id="employeeId"
                  type="text"
                  placeholder="Enter your ID"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="h-[56px] w-full rounded-xl border-none bg-white px-6 text-base text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400/40 transition-all"
                />
              </div>

              {/* PASSWORD */}
              <div className="space-y-3">
                <Label htmlFor="password" className="block text-[11px] font-bold tracking-[0.2em] text-white">
                  PASSWORD
                </Label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-[56px] w-full rounded-xl border-none bg-white px-6 pr-14 text-base text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
                <div className="flex justify-end pt-1">
                  <button type="button" className="text-sm font-semibold text-white/90 hover:text-white transition-colors">
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* LOGIN BUTTON */}
              <div className="pt-6">
                <Button
                  type="submit"
                  disabled={fetchStatus === "fetching"}
                  className="h-[60px] w-full rounded-xl bg-[#1a2b5a] text-lg font-bold text-white shadow-2xl hover:bg-[#111c3a] active:scale-[0.99] transition-all disabled:opacity-70"
                >
                  {fetchStatus === "fetching" ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    "Login"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
