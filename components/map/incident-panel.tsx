"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapIncident, MapSummary, IncidentStatus } from "@/types/map";
import { Calendar, ArrowRight, Activity, Flame, Car, ShieldAlert, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface IncidentPanelProps {
  summary: MapSummary;
  incidents: MapIncident[];
  onSelectIncident: (incident: MapIncident) => void;
  selectedIncidentId?: string;
  filter: string;
  onFilterChange: (filter: string) => void;
}

export function IncidentPanel({
  summary,
  incidents,
  onSelectIncident,
  selectedIncidentId,
  filter,
  onFilterChange,
}: IncidentPanelProps) {
  const filteredIncidents = incidents.filter((incident) => {
    if (filter === "ALL") return true;
    if (filter === "STANDBY") return incident.status === "STANDBY";
    return incident.status === filter;
  });

  const currentDate = new Date().toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).replace(/\//g, ".");

  return (
    <div className="flex flex-col h-full w-[400px] border-r bg-white shadow-xl z-10">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Incident Reports</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time Command Feed</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-slate-600 text-[10px] font-black border border-slate-200 shadow-sm">
          <Calendar size={12} className="text-slate-400" />
          <span>{currentDate}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 px-6 py-6 bg-slate-50/50">
        <SummaryCard
          label="NEW"
          count={summary.new}
          className="bg-blue-50 text-blue-700 border-blue-100"
          accent="bg-blue-500"
        />
        <SummaryCard
          label="ONGOING"
          count={summary.ongoing}
          className="bg-orange-50 text-orange-700 border-orange-100"
          accent="bg-orange-500"
        />
        <SummaryCard
          label="COMPLETED"
          count={summary.completed}
          className="bg-emerald-50 text-emerald-700 border-emerald-100"
          accent="bg-emerald-500"
        />
        <SummaryCard
          label="STANDBY"
          count={summary.yellow}
          className="bg-amber-50 text-amber-700 border-amber-100"
          accent="bg-amber-500"
        />
      </div>

      {/* Filter Tabs */}
      <div className="px-6 py-4 border-b border-slate-100">
        <Tabs value={filter} onValueChange={onFilterChange} className="w-full">
          <TabsList className="flex w-full bg-slate-100/80 p-1 rounded-xl h-11">
            <TabTrigger value="ALL">ALL</TabTrigger>
            <TabTrigger value="NEW">NEW</TabTrigger>
            <TabTrigger value="ONGOING">ONGOING</TabTrigger>
            <TabTrigger value="COMPLETED">COMPLETED</TabTrigger>
            <TabTrigger value="STANDBY">STANDBY</TabTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Incident List */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredIncidents.map((incident, index) => (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <IncidentCard
                  incident={incident}
                  isSelected={selectedIncidentId === incident.id}
                  onClick={() => onSelectIncident(incident)}
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
      </ScrollArea>
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
}: {
  incident: MapIncident;
  isSelected: boolean;
  onClick: () => void;
}) {
  const getIncidentIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("medical")) return <Activity size={14} className="text-blue-500" />;
    if (t.includes("fire")) return <Flame size={14} className="text-orange-500" />;
    if (t.includes("accident") || t.includes("vehicular")) return <Car size={14} className="text-slate-700" />;
    return <ShieldAlert size={14} className="text-slate-500" />;
  };

  const statusColors: Record<IncidentStatus, string> = {
    NEW: "bg-blue-500",
    ONGOING: "bg-orange-500",
    COMPLETED: "bg-emerald-500",
    STANDBY: "bg-amber-500",
  };

  return (
    <div
      className={cn(
        "relative group cursor-pointer transition-all rounded-2xl border bg-white overflow-hidden",
        isSelected 
          ? "border-slate-900 shadow-xl ring-1 ring-slate-900 translate-x-1" 
          : "border-slate-100 shadow-sm hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5"
      )}
      onClick={onClick}
    >
      {/* Status Accent Line */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", statusColors[incident.status])} />

      <div className="p-5 pl-6">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                {incident.vehicleId || "STANDBY UNIT"}
              </span>
              <div className="h-1 w-1 rounded-full bg-slate-200" />
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 rounded text-[9px] font-bold text-slate-500 border border-slate-100">
                <Clock size={10} />
                <span>2m ago</span>
              </div>
            </div>
            <div className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              {incident.caseId}
              {getIncidentIcon(incident.type)}
            </div>
          </div>
          
          <div className={cn(
            "px-2 py-1 rounded-full text-[9px] font-black tracking-widest uppercase text-white shadow-sm",
            statusColors[incident.status]
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
              <span className="text-[11px] font-black text-slate-900 truncate max-w-[300px]">{incident.destination}, Baliwag City</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
