"use client";

import { cn } from "@/lib/utils";
import { MapPin, Navigation, Hospital } from "lucide-react";

interface MapMarkerProps {
  type: "incident" | "responder" | "hospital";
  status: string;
  label: string;
  isSelected?: boolean;
}

export function MapMarker({ type, status, label, isSelected }: MapMarkerProps) {
  if (type === "hospital") {
    return (
      <div className="relative group cursor-pointer flex flex-col items-center">
        {/* Label */}
        <div className="absolute -top-8 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
          {label}
        </div>

        {/* Marker Icon */}
        <div className="relative z-10 p-1.5 rounded-full border-2 bg-blue-600 border-blue-200 text-white shadow-lg">
          <Hospital size={16} fill="currentColor" />
        </div>
      </div>
    );
  }

  if (type === "incident") {
    return (
      <div className="relative group cursor-pointer flex flex-col items-center">
        {/* Label */}
        <div className={cn(
          "absolute -top-8 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap bg-background border shadow-sm transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          {label}
        </div>

        {/* Pulse Effect for Active Incidents */}
        {status === "NEW" || status === "ONGOING" ? (
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
