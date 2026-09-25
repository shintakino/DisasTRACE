"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapIncident } from "@/types/map";
import { Activity, Flame, Car, ShieldAlert, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { compareOperationalIncidents, isOperationalIncidentActive } from "@/lib/incident-display-priority";

interface IncidentPanelProps {
  incidents: MapIncident[];
  onSelectIncident: (incident: MapIncident) => void;
  selectedIncidentId?: string;
  filter: string;
  onFilterChange: (filter: string) => void;
  onOpenDetails?: (id: string) => void;
  category?: "user" | "responder";
  onCategoryChange?: (category: "user" | "responder") => void;
  onPriorityChange?: (incidentId: string | undefined) => void;
  period?: "today" | "weekly" | "monthly" | "yearly";
  onPeriodChange?: (period: "today" | "weekly" | "monthly" | "yearly") => void;
}

export function IncidentPanel({
  incidents,
  onSelectIncident,
  selectedIncidentId,
  filter,
  onFilterChange,
  onOpenDetails,
  category: externalCategory,
  onCategoryChange,
  onPriorityChange,
  period = "today",
  onPeriodChange,
}: IncidentPanelProps) {
  const [internalCategory, setInternalCategory] = React.useState<"user" | "responder">("user");
  const category = externalCategory !== undefined ? externalCategory : internalCategory;
  const [barangay, setBarangay] = React.useState("all");

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

  const barangays = React.useMemo(() => Array.from(new Set(
    incidents.map((incident) => incident.barangay).filter((value): value is string => Boolean(value)),
  )).sort((first, second) => first.localeCompare(second)), [incidents]);

  const normaliseStatus = (incident: MapIncident) => {
    if (incident.status === "REJECTED" || incident.status === "DUPLICATE") return "REJECTED";
    if (incident.status === "COMPLETED") return "RESOLVED";
    return "ACTIVE";
  };

  // The top controls and overview deliberately use the same four categories.
  const stats = React.useMemo(() => {
    const categoryIncidents = incidents.filter((incident) => (
      incident.category === category && (barangay === "all" || incident.barangay === barangay)
    ));
    return {
      ALL: categoryIncidents.length,
      ACTIVE: categoryIncidents.filter((incident) => normaliseStatus(incident) === "ACTIVE").length,
      RESOLVED: categoryIncidents.filter((incident) => normaliseStatus(incident) === "RESOLVED").length,
      REJECTED: categoryIncidents.filter((incident) => normaliseStatus(incident) === "REJECTED").length,
    };
  }, [barangay, category, incidents]);

  const filteredIncidents = incidents.filter((incident) => {
    // 0. Category Filter
    if (incident.category !== category) return false;

    // 1. Status Filter
    const statusMatch = filter === "ALL" || normaliseStatus(incident) === filter;

    if (!statusMatch) return false;

    return barangay === "all" || incident.barangay === barangay;
  }).sort((a, b) => compareOperationalIncidents(
    { id: a.id, severity: a.severity, status: a.status, createdAt: a.createdAt },
    { id: b.id, severity: b.severity, status: b.status, createdAt: b.createdAt },
  ));
  const priorityIncidentId = filteredIncidents.find((incident) => isOperationalIncidentActive({ status: incident.status }))?.id;
  React.useEffect(() => {
    onPriorityChange?.(priorityIncidentId);
  }, [onPriorityChange, priorityIncidentId]);

  return (
    <div className="flex h-full min-h-0 w-[400px] flex-col border-r bg-white shadow-xl z-10">
      {/* Header */}
      <div className="flex flex-col px-6 pt-6 pb-4 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-20 gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold capitalize text-[#1E3A8A] tracking-tight">Incident Reports</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time Command Feed</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select value={barangay} onValueChange={(value) => setBarangay(value ?? "all")}>
            <SelectTrigger aria-label="Filter incidents by Barangay" className="h-9 text-xs font-semibold"><SelectValue placeholder="All Barangays" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Barangays</SelectItem>{barangays.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={period} onValueChange={(value) => { if (value) onPeriodChange?.(value as "today" | "weekly" | "monthly" | "yearly"); }}>
            <SelectTrigger aria-label="Filter incidents by time period" className="h-9 text-xs font-semibold"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="today">Today</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent>
          </Select>
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
        <div className="grid grid-cols-4 gap-2">
          <SummaryCard label="ALL" count={stats.ALL} tone="bg-[#1E3A8A]" />
          <SummaryCard label="ACTIVE" count={stats.ACTIVE} tone="bg-[#2563EB]" />
          <SummaryCard label="RESOLVED" count={stats.RESOLVED} tone="bg-[#047857]" />
          <SummaryCard label="REJECTED" count={stats.REJECTED} tone="bg-[#B91C1C]" />
        </div>
      </div>

      {/* Filter Tabs with descriptive label */}
      <div className="px-6 py-4 border-b border-slate-100">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2.5 block">
          Incident Status Overview
        </span>
        <Tabs value={filter} onValueChange={onFilterChange} className="w-full">
          <TabsList className="flex w-full bg-slate-100/80 p-1 rounded-xl h-11">
            <TabTrigger value="ALL">ALL</TabTrigger>
            <TabTrigger value="ACTIVE">ACTIVE</TabTrigger>
            <TabTrigger value="RESOLVED">RESOLVED</TabTrigger>
            <TabTrigger value="REJECTED">REJECTED</TabTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Incident List */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
                  isPriority={incident.id === priorityIncidentId}
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

function SummaryCard({ label, count, tone }: { label: string; count: number; tone: string }) {
  return (
    <div className={cn("relative flex h-16 flex-col items-start justify-center overflow-hidden rounded-xl border px-3 text-white shadow-sm", tone)}>
      <div className="absolute inset-0 bg-black/5" />
      <span className="relative z-10 text-2xl font-black leading-none tracking-tight">{count}</span>
      <span className="relative z-10 mt-1 text-[10px] font-black uppercase tracking-wide opacity-85">{label}</span>
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
  isPriority,
  isSelected,
  onClick,
  onOpenDetails,
}: {
  incident: MapIncident;
  isPriority: boolean;
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
          : isPriority
            ? "border-red-300 bg-red-50/40 shadow-md"
            : "border-slate-100 shadow-sm hover:border-slate-200 hover:shadow-md"
      )}
      onClick={onClick}
    >
      {/* Status Accent Line */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", statusColors[incident.status] || "bg-slate-400")} />

      <div className="p-5 pl-6 flex-1">
        {isPriority ? (
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="rounded-full bg-red-700 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">Priority now</span>
            <span className="text-xs font-bold text-red-800">{incident.severity} severity</span>
          </div>
        ) : (
          <div className="mb-2 text-xs font-bold text-slate-500">{incident.severity} severity</div>
        )}
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

        <div className="relative z-0 flex flex-col gap-3">
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-0.5">Origin</span>
              <span className="text-[11px] font-bold text-slate-600 truncate max-w-[300px]">{incident.origin}</span>
            </div>
          </div>

          {/* Connection Line */}
          <div className="pointer-events-none absolute left-[9px] top-4 bottom-4 z-0 w-0.5 border-l-2 border-dashed border-slate-100" aria-hidden="true" />

          <div className="relative z-10 flex items-center gap-3">
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
