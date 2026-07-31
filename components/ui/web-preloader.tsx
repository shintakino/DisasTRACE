"use client"

import * as React from "react"
import { ShieldAlert, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface WebPreloaderProps {
  title?: string
  subtitle?: string
  className?: string
}

export function WebPreloader({
  title = "Initializing DisasTRACE System...",
  subtitle = "Loading live telemetry, active dispatches, and emergency response maps",
  className,
}: WebPreloaderProps) {
  return (
    <div className={cn(
      "w-full h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#0B132B] text-white relative overflow-hidden rounded-2xl shadow-2xl border border-blue-900/40 animate-in fade-in duration-500",
      className
    )}>
      {/* Ambient background glow rings */}
      <div className="absolute w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Main preloader card */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md space-y-6">
        {/* Animated Badge Icon */}
        <div className="relative flex items-center justify-center">
          <div className="w-20 h-20 bg-white/10 rounded-3xl backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
            <ShieldAlert className="w-10 h-10 text-blue-400 animate-bounce" />
          </div>
          <div className="absolute -inset-2 bg-blue-500/20 rounded-3xl blur-md -z-10 animate-ping opacity-75" />
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h3 className="text-xl font-black uppercase tracking-tight text-white">{title}</h3>
          <p className="text-xs font-medium text-blue-200/80 leading-relaxed">{subtitle}</p>
        </div>

        {/* Dynamic Spinner Bar */}
        <div className="flex items-center gap-3 bg-white/5 px-5 py-2.5 rounded-full border border-white/10 shadow-inner">
          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
            CONNECTING REALTIME TILES
          </span>
        </div>
      </div>
    </div>
  )
}
