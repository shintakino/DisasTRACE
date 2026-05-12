"use client";

import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapIncident, MapSummary, IncidentStatus } from "@/types/map";
import { MapPin, Calendar, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  return (
    <div className="flex flex-col h-full w-[450px] border-r bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-6">
        <h1 className="text-xl font-bold text-[#1e293b]">Incident Reports</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f1f5f9] rounded-lg text-[#64748b] text-xs font-semibold">
          <Calendar size={14} />
          <span>{currentDate}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 px-6 mb-6">
        <SummaryCard
          label="NEW"
          count={summary.new}
          className="bg-[#dae5f9] text-[#2c52a0]"
        />
        <SummaryCard
          label="ONGOING"
          count={summary.ongoing}
          className="bg-[#ffedd5] text-[#9a3412]"
        />
        <SummaryCard
          label="COMPLETED"
          count={summary.completed}
          className="bg-[#dcfce7] text-[#166534]"
        />
        <SummaryCard
          label="STANDBY"
          count={summary.standby}
          className="bg-[#fef9c3] text-[#854d0e]"
        />
      </div>

      {/* Filter Tabs */}
      <div className="px-6 mb-4">
        <Tabs value={filter} onValueChange={onFilterChange} className="w-full">
          <TabsList className="flex w-full bg-[#f1f5f9] p-1 rounded-lg h-auto">
            <TabTrigger value="ALL">ALL</TabTrigger>
            <TabTrigger value="NEW">NEW</TabTrigger>
            <TabTrigger value="ONGOING">ONGOING</TabTrigger>
            <TabTrigger value="COMPLETED">COMPLETED</TabTrigger>
            <TabTrigger value="STANDBY">STANDBY</TabTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Incident List */}
      <ScrollArea className="flex-1 px-6 pb-6">
        <div className="space-y-4">
          {filteredIncidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              isSelected={selectedIncidentId === incident.id}
              onClick={() => onSelectIncident(incident)}
            />
          ))}
          {filteredIncidents.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No incidents found.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function SummaryCard({ label, count, className }: { label: string; count: number; className?: string }) {
  return (
    <div className={cn("p-4 flex flex-col items-start justify-center rounded-lg shadow-sm h-24", className)}>
      <span className="text-2xl font-bold leading-none">{count}</span>
      <span className="text-[10px] font-bold tracking-tight mt-1 opacity-80 uppercase">{label}</span>
    </div>
  );
}

function TabTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <TabsTrigger 
      value={value} 
      className="flex-1 text-[10px] font-bold py-1.5 rounded-md data-[state=active]:bg-[#1e293b] data-[state=active]:text-white transition-all text-[#64748b]"
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
  return (
    <div
      className={cn(
        "p-5 cursor-pointer transition-all rounded-xl",
        isSelected ? "bg-[#f8fafc] ring-2 ring-[#1e293b]" : "bg-[#f8fafc] hover:bg-[#f1f5f9]"
      )}
      onClick={onClick}
    >
      <div className="mb-4">
        <div className="text-[11px] text-[#64748b] font-semibold mb-1 uppercase tracking-tight">
          {incident.vehicleId || "UNASSIGNED"}
        </div>
        <div className="text-lg font-bold text-[#1e293b]">{incident.caseId}</div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[#64748b] min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[#94a3b8] flex-shrink-0" />
          <span className="text-[11px] font-medium truncate">{incident.origin}</span>
        </div>
        
        <ArrowRight size={14} className="text-[#94a3b8] flex-shrink-0" />

        <div className="flex items-center gap-1.5 text-[#64748b] min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[#94a3b8] flex-shrink-0" />
          <span className="text-[11px] font-medium truncate">{incident.destination}, Baliwag City</span>
        </div>
      </div>
    </div>
  );
}
