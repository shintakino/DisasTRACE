"use client";

import { cn } from "@/lib/utils";
import { MapPin, Navigation, Hospital } from "lucide-react";

interface MapMarkerProps {
  type: "incident" | "responder" | "hospital";
  status: string;
  label: string;
  isSelected?: boolean;
  hospitalAddress?: string;
  hospitalPhone?: string | null;
  caters?: boolean;
  reporterName?: string | null;
  reporterPhone?: string | null;
  destination?: string;
}

export function MapMarker({ 
  type, 
  status, 
  label, 
  isSelected,
  hospitalAddress,
  hospitalPhone,
  caters = true,
  reporterName,
  reporterPhone,
  destination
}: MapMarkerProps) {
  if (type === "hospital") {
    return (
      <div className="relative group cursor-pointer flex flex-col items-center">
        {/* Google Maps-style Hover Preview Card */}
        <div className="absolute bottom-full mb-2 w-64 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50 flex flex-col gap-1.5 text-slate-800 text-left">
          <div className="text-xs font-black text-slate-900 leading-tight">{label}</div>
          <div className="text-[10px] text-slate-500 font-medium leading-normal">{hospitalAddress || "Baliwag City, Bulacan"}</div>
          
          <div className="h-px bg-slate-100 my-1" />
          
          {hospitalPhone && (
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600">
              <span className="text-[#1E3A8A] font-black uppercase tracking-wider">Tel:</span>
              <span>{hospitalPhone}</span>
            </div>
          )}
          
          <div className="flex items-center mt-0.5">
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
              caters 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                : "bg-red-50 text-red-700 border-red-200"
            )}>
              {caters ? "Caters to Emergency" : "Limited Availability"}
            </span>
          </div>
          {/* Small Arrow down */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white" />
        </div>

        {/* Marker Icon */}
        <div className="relative z-10 p-1.5 rounded-full border-2 bg-blue-600 border-blue-200 text-white shadow-lg group-hover:scale-110 transition-transform">
          <Hospital size={16} fill="currentColor" />
        </div>
      </div>
    );
  }

  if (type === "incident") {
    return (
      <div className="relative group cursor-pointer flex flex-col items-center">
        {/* Google Maps-style Hover Preview Card */}
        <div className="absolute bottom-full mb-2 w-64 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50 flex flex-col gap-1.5 text-slate-800 text-left">
          <div className="text-xs font-black text-slate-900 leading-tight flex justify-between items-center">
            <span>{label}</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
              status === "COMPLETED" 
                ? "bg-green-50 text-green-700 border-green-200" 
                : "bg-red-50 text-red-700 border-red-200"
            )}>
              {status}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-bold">{status === "COMPLETED" ? "Resolved Incident" : "Active Request"}</div>
          <div className="h-px bg-slate-100 my-1" />
          {reporterName && (
            <div className="text-[9px] text-slate-600 font-medium">
              <span className="font-bold text-slate-900">Reporter:</span> {reporterName}
            </div>
          )}
          {reporterPhone && (
            <div className="text-[9px] text-slate-600 font-medium">
              <span className="font-bold text-slate-900">Phone:</span> {reporterPhone}
            </div>
          )}
          <div className="text-[9px] text-slate-600 font-medium">
            <span className="font-bold text-slate-900">Location:</span> {destination || "Baliwag City"}
          </div>
          {/* Small Arrow down */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white" />
        </div>

        {/* Pulse Effect for Active Incidents */}
        {status === "NEW" || status === "ONGOING" || status === "PENDING" ? (
          <div className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-red-500/30 animate-ping" />
        ) : null}

        {/* Marker Icon */}
        <div className={cn(
          "relative z-10 p-1 rounded-full border-2 transition-transform",
          isSelected ? "scale-125 border-primary bg-primary text-primary-foreground" : "bg-red-500 border-red-200 text-white",
          status === "COMPLETED" && !isSelected && "bg-green-500 border-green-200"
        )}>
          <MapPin size={16} fill="currentColor" />
        </div>
      </div>
    );
  }

  // Responder Marker
  const isDispatched = status === "ONGOING";
  return (
    <div className="relative group cursor-pointer flex flex-col items-center">
      {/* Label */}
      <div className="absolute -top-8 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap bg-background border shadow-sm">
        {label}
      </div>

      {/* Marker Icon */}
      <div className={cn(
        "relative z-10 p-1.5 rounded-full border-2 transition-transform",
        isDispatched 
          ? "bg-orange-500 border-orange-200 text-white" 
          : "bg-yellow-400 border-yellow-100 text-yellow-900"
      )}>
        <Navigation size={14} fill="currentColor" className={isDispatched ? "" : "rotate-45"} />
      </div>
    </div>
  );
}
