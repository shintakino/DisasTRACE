"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapIncident, MapSummary, IncidentStatus } from "@/types/map";
import { ArrowRight, MapPin } from "lucide-react";
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

  return (
    <div className="flex flex-col h-full w-[400px] border-r bg-background">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2 p-4">
        <SummaryCard
          label="NEW"
          count={summary.new}
          className="bg-[#E0F2FE] text-[#0369A1]"
        />
        <SummaryCard
          label="ONGOING"
          count={summary.ongoing}
          className="bg-[#FFEDD5] text-[#9A3412]"
        />
        <SummaryCard
          label="COMPLETED"
          count={summary.completed}
          className="bg-[#DCFCE7] text-[#166534]"
        />
        <SummaryCard
          label="STANDBY"
          count={summary.standby}
          className="bg-[#FEF9C3] text-[#854D0E]"
        />
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pb-2">
        <Tabs value={filter} onValueChange={onFilterChange} className="w-full">
          <TabsList className="grid grid-cols-5 w-full bg-muted/50">
            <TabsTrigger value="ALL" className="text-xs">ALL</TabsTrigger>
            <TabsTrigger value="NEW" className="text-xs">NEW</TabsTrigger>
            <TabsTrigger value="ONGOING" className="text-xs">ONGOING</TabsTrigger>
            <TabsTrigger value="COMPLETED" className="text-xs">DONE</TabsTrigger>
            <TabsTrigger value="STANDBY" className="text-xs">SBY</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Incident List */}
      <ScrollArea className="flex-1 px-4 pb-4">
        <div className="space-y-3">
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
    <Card className={cn("p-3 flex flex-col items-center justify-center border-none shadow-sm", className)}>
      <span className="text-[10px] font-bold tracking-wider">{label}</span>
      <span className="text-2xl font-black mt-1">{count}</span>
    </Card>
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
  const statusColors: Record<IncidentStatus, string> = {
    NEW: "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]",
    ONGOING: "bg-[#FFEDD5] text-[#9A3412] border-[#FED7AA]",
    COMPLETED: "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]",
    STANDBY: "bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]",
  };

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all border-2",
        isSelected ? "border-primary ring-1 ring-primary" : "border-transparent hover:border-muted",
        "bg-card shadow-sm"
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="space-y-0.5">
          <div className="text-[10px] text-muted-foreground font-medium uppercase">
            {incident.vehicleId || "UNASSIGNED"}
          </div>
          <div className="text-sm font-bold">{incident.caseId}</div>
        </div>
        <Badge className={cn("text-[10px] px-1.5 py-0 border", statusColors[incident.status])} variant="outline">
          {incident.status}
        </Badge>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <div className="flex flex-col items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
          <div className="w-0.5 h-6 bg-muted-foreground/20 border-l border-dashed" />
          <MapPin className="w-3 h-3 text-primary" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="text-muted-foreground truncate w-full max-w-[280px]">
            {incident.origin}
          </div>
          <div className="font-semibold truncate w-full max-w-[280px]">
            {incident.destination}
          </div>
        </div>
      </div>
    </Card>
  );
}
