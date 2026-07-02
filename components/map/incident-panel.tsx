"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapIncident, MapSummary, IncidentStatus } from "@/types/map";
import { Calendar as CalendarIcon, ArrowRight, Activity, Flame, Car, ShieldAlert, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as UICalendar } from "@/components/ui/calendar";
import { format } from "date-fns";

interface IncidentPanelProps {
  summary: MapSummary;
  incidents: MapIncident[];
  onSelectIncident: (incident: MapIncident) => void;
  selectedIncidentId?: string;
  filter: string;
  onFilterChange: (filter: string) => void;
  onOpenDetails?: (id: string) => void;
  category?: "user" | "responder";
  onCategoryChange?: (category: "user" | "responder") => void;
}

export function IncidentPanel({
  summary: externalSummary,
  incidents,
  onSelectIncident,
  selectedIncidentId,
  filter,
  onFilterChange,
  onOpenDetails,
  category: externalCategory,
  onCategoryChange,
}: IncidentPanelProps) {
  const [internalCategory, setInternalCategory] = React.useState<"user" | "responder">("user");
  const category = externalCategory !== undefined ? externalCategory : internalCategory;
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);

  // Auto-scroll list when an incident pin is selected on the map
  React.useEffect(() => {
    if (selectedIncidentId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`incident-card-${selectedIncidentId}`);
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedIncidentId, category]);

  // Handle category tab toggle
  const handleCategoryChange = (cat: "user" | "responder") => {
    if (onCategoryChange) {
      onCategoryChange(cat);
    } else {
      setInternalCategory(cat);
    }
    onFilterChange("ALL");
  };

  // Client-side statistics calculations for high-fidelity widgets
  const stats = React.useMemo(() => {
    const userPending = incidents.filter(i => i.category === "user" && i.status === "PENDING").length;
    const userVerified = incidents.filter(i => i.category === "user" && i.status === "VERIFIED").length;
    const userRejected = incidents.filter(i => i.category === "user" && i.status === "REJECTED").length;
    const userDuplicate = incidents.filter(i => i.category === "user" && i.status === "DUPLICATE").length;

    const respOngoing = incidents.filter(i => i.category === "responder" && i.status === "ONGOING").length;
    const respCompleted = incidents.filter(i => i.category === "responder" && i.status === "COMPLETED").length;

    return {
      user: {
        PENDING: userPending,
        VERIFIED: userVerified,
        REJECTED: userRejected,
        DUPLICATE: userDuplicate,
      },
      responder: {
        ONGOING: respOngoing,
        COMPLETED: respCompleted,
      }
    };
  }, [incidents]);

  const filteredIncidents = incidents.filter((incident) => {
    // 0. Category Filter
    if (incident.category !== category) return false;

    // 1. Status Filter
    let statusMatch = true;
    if (filter === "ALL") statusMatch = true;
    else statusMatch = incident.status === filter;

    if (!statusMatch) return false;

    // 2. Date Filter
    if (selectedDate) {
      const incidentDate = new Date(incident.createdAt);
      return (
        incidentDate.getFullYear() === selectedDate.getFullYear() &&
        incidentDate.getMonth() === selectedDate.getMonth() &&
        incidentDate.getDate() === selectedDate.getDate()
      );
    }

    return true;
  });

  const displayDateStr = selectedDate 
    ? format(selectedDate, "MM.dd.yyyy") 
    : new Date().toLocaleDateString("en-US", {
        timeZone: "Asia/Manila",
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }).replace(/\//g, ".");

  return (
    <div className="flex flex-col h-full w-[400px] border-r bg-white shadow-xl z-10">
      {/* Header */}
      <div className="flex flex-col px-6 pt-6 pb-4 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-20 gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Incident Reports</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time Command Feed</p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 text-[10px] font-black border border-slate-200 shadow-sm transition-colors cursor-pointer outline-none">
                <CalendarIcon size={12} className="text-slate-400" />
                <span>{selectedDate ? format(selectedDate, "MM.dd.yyyy") : "ALL DATES"}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50 bg-white shadow-2xl border border-slate-100 rounded-2xl" align="end">
              <div className="p-2 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider pl-1">Filter by Date</span>
                {selectedDate && (
                  <button 
                    onClick={() => setSelectedDate(undefined)} 
                    className="text-[9px] font-bold text-red-500 hover:text-red-700 uppercase pr-1 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <UICalendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Category Toggles (User vs Responder) */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1 border border-slate-200/50">
          <button
            onClick={() => handleCategoryChange("user")}
            className={cn(
              "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200",
              category === "user"
                ? "bg-[#1E3A8A] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            )}
          >
            User Submitted Reports
          </button>
          <button
            onClick={() => handleCategoryChange("responder")}
            className={cn(
              "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200",
              category === "responder"
                ? "bg-[#1E3A8A] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            )}
          >
            Responder Submitted Reports
          </button>
        </div>
      </div>

      {/* Summary Cards with descriptive label */}
      <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2.5 block">
          Overall Incident Statistics
        </span>
        {category === "user" ? (
          <div className="grid grid-cols-4 gap-2">
            <SummaryCard
              label="PENDING"
              count={stats.user.PENDING}
              className="bg-orange-50 text-orange-700 border-orange-100"
              accent="bg-orange-500"
            />
            <SummaryCard
              label="VERIFIED"
              count={stats.user.VERIFIED}
              className="bg-green-50 text-green-700 border-green-100"
              accent="bg-green-500"
            />
            <SummaryCard
              label="REJECTED"
              count={stats.user.REJECTED}
              className="bg-red-50 text-red-700 border-red-100"
              accent="bg-red-500"
            />
            <SummaryCard
              label="DUPLICATE"
              count={stats.user.DUPLICATE}
              className="bg-slate-50 text-slate-700 border-slate-100"
              accent="bg-slate-500"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              label="ONGOING"
              count={stats.responder.ONGOING}
              className="bg-orange-50 text-orange-700 border-orange-100"
              accent="bg-orange-500"
            />
            <SummaryCard
              label="COMPLETED"
              count={stats.responder.COMPLETED}
              className="bg-emerald-50 text-emerald-700 border-emerald-100"
              accent="bg-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Filter Tabs with descriptive label */}
      <div className="px-6 py-4 border-b border-slate-100">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2.5 block">
          Incident Status Overview
        </span>
        <Tabs value={filter} onValueChange={onFilterChange} className="w-full">
          <TabsList className="flex w-full bg-slate-100/80 p-1 rounded-xl h-11">
            <TabTrigger value="ALL">ALL</TabTrigger>
            {category === "user" ? (
              <>
                <TabTrigger value="PENDING">PENDING</TabTrigger>
                <TabTrigger value="VERIFIED">VERIFIED</TabTrigger>
                <TabTrigger value="REJECTED">REJECTED</TabTrigger>
              </>
            ) : (
              <>
                <TabTrigger value="ONGOING">ONGOING</TabTrigger>
                <TabTrigger value="COMPLETED">COMPLETED</TabTrigger>
              </>
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredIncidents.map((incident, index) => (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                id={`incident-card-${incident.id}`}
              >
                <IncidentCard
                  incident={incident}
                  isSelected={selectedIncidentId === incident.id}
                  onClick={() => onSelectIncident(incident)}
                  onOpenDetails={onOpenDetails}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredIncidents.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-slate-300"
            >
              <ShieldAlert size={48} strokeWidth={1} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">No active reports in this sector</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, count, className, accent }: { label: string; count: number; className?: string; accent: string }) {
  return (
    <div className={cn("relative p-4 flex flex-col items-start justify-center rounded-2xl border shadow-sm h-24 overflow-hidden group hover:scale-[1.02] transition-transform", className)}>
      <div className={cn("absolute top-0 left-0 w-full h-1", accent)} />
      <span className="text-3xl font-black leading-none tracking-tighter">{count}</span>
      <span className="text-[10px] font-black tracking-widest mt-2 opacity-70 uppercase">{label}</span>
      <div className={cn("absolute -right-2 -bottom-2 w-12 h-12 rounded-full opacity-5 group-hover:scale-150 transition-transform", accent)} />
    </div>
  );
}

function TabTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <TabsTrigger 
      value={value} 
      className="flex-1 text-[10px] font-black py-2 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all text-slate-500 hover:text-slate-700"
    >
      {children}
    </TabsTrigger>
  );
}

function IncidentCard({
  incident,
  isSelected,
  onClick,
  onOpenDetails,
}: {
  incident: MapIncident;
  isSelected: boolean;
  onClick: () => void;
  onOpenDetails?: (id: string) => void;
}) {
  const getIncidentIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("medical")) return <Activity size={14} className="text-blue-500" />;
    if (t.includes("fire")) return <Flame size={14} className="text-orange-500" />;
    if (t.includes("accident") || t.includes("vehicular")) return <Car size={14} className="text-slate-700" />;
    return <ShieldAlert size={14} className="text-slate-500" />;
  };

  const statusColors: Record<string, string> = {
    NEW: "bg-blue-500",
    ONGOING: "bg-orange-500",
    COMPLETED: "bg-emerald-500",
    STANDBY: "bg-amber-500",
    PENDING: "bg-orange-500",
    VERIFIED: "bg-green-500",
    REJECTED: "bg-red-500",
    DUPLICATE: "bg-slate-500",
  };

  return (
    <div
      className={cn(
        "relative group cursor-pointer transition-all rounded-2xl border bg-white overflow-hidden flex flex-col",
        isSelected 
          ? "border-slate-900 shadow-xl ring-1 ring-slate-900 translate-x-1" 
          : "border-slate-100 shadow-sm hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5"
      )}
      onClick={onClick}
    >
      {/* Status Accent Line */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", statusColors[incident.status] || "bg-slate-400")} />

      <div className="p-5 pl-6 flex-1">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                {incident.category === "user" ? "Resident Request" : (incident.vehicleId && incident.vehicleId !== "NONE" ? incident.vehicleId : "Dispatched Ambulance")}
              </span>
              <div className="h-1 w-1 rounded-full bg-slate-200" />
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 rounded text-[9px] font-bold text-slate-500 border border-slate-100">
                <Clock size={10} />
                <span>{incident.submittedTime || "Just now"}</span>
              </div>
            </div>
            <div className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              {incident.caseId}
              {getIncidentIcon(incident.type)}
            </div>
          </div>
          
          <div className={cn(
            "px-2 py-1 rounded-full text-[9px] font-black tracking-widest uppercase text-white shadow-sm",
            statusColors[incident.status] || "bg-slate-500"
          )}>
            {incident.status}
          </div>
        </div>

        <div className="flex flex-col gap-3 relative">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-0.5">Origin</span>
              <span className="text-[11px] font-bold text-slate-600 truncate max-w-[300px]">{incident.origin}</span>
            </div>
          </div>

          {/* Connection Line */}
          <div className="absolute left-[9px] top-4 bottom-4 w-0.5 border-l-2 border-dashed border-slate-100" />

          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center shadow-lg">
              <MapPin size={10} className="text-white" fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-0.5">Destination</span>
              <span className="text-[11px] font-black text-slate-900 truncate max-w-[300px]">{incident.destination}</span>
            </div>
          </div>
        </div>

        {/* Date Submitted and Last Updated Grid */}
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
          <div>
            <span className="font-bold uppercase tracking-wider block text-[8px] text-slate-400">Date Submitted</span>
            <span className="font-medium text-slate-700">{incident.submittedDate || "N/A"}</span>
          </div>
          <div>
            <span className="font-bold uppercase tracking-wider block text-[8px] text-slate-400">Last Updated</span>
            <span className="font-medium text-slate-700">{incident.lastUpdated || "N/A"}</span>
          </div>
        </div>
      </div>

      {isSelected && onOpenDetails && (
        <div className="px-5 pb-5 pt-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(incident.id);
            }}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-none shadow-md hover:shadow-lg"
          >
            View Full Report Details
          </button>
        </div>
      )}
    </div>
  );
}
