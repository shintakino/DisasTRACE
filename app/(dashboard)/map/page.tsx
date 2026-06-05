"use client";

import { useState } from "react";
import { IncidentPanel } from "@/components/map/incident-panel";
import { MapContainer } from "@/components/map/map-container";
import { useMapData } from "@/hooks/use-map-data";
import { MapIncident } from "@/types/map";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReportDetailSheet } from "@/components/reports/report-detail-sheet";

export default function MapPage() {
  const { incidents, responders, hospitals, summary, isLoading, error } = useMapData();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | undefined>();
  const [filter, setFilter] = useState("ALL");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Layer visibility state (requests vs reports)
  const [showReports, setShowReports] = useState(true);
  const [showRequests, setShowRequests] = useState(true);

  // Full Report Detail Modal State
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false);

  const handleSelectIncident = (incident: MapIncident | string) => {
    const id = typeof incident === "string" ? incident : incident.id;
    setSelectedIncidentId(id);
  };

  const handleOpenDetails = (id: string) => {
    setSelectedReportId(id);
    setIsReportSheetOpen(true);
  };

  // Filter incidents based on checkbox visibility toggles
  const displayedIncidents = incidents.filter((incident) => {
    const isRequest = incident.status === "NEW" || incident.status === "STANDBY";
    const isReport = incident.status === "ONGOING" || incident.status === "COMPLETED";
    
    if (isRequest) return showRequests;
    if (isReport) return showReports;
    return true;
  });

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden relative">
      {isLoading ? (
        <>
          <div className="w-[400px] h-full border-r p-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
            <Skeleton className="h-10 w-full" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
          <div className="flex-1 h-full bg-muted/20">
            <Skeleton className="w-full h-full" />
          </div>
        </>
      ) : (
        <>
          <div className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden flex h-full",
            isSidebarOpen ? "w-[400px]" : "w-0"
          )}>
            <IncidentPanel
              summary={summary}
              incidents={displayedIncidents}
              onSelectIncident={handleSelectIncident}
              selectedIncidentId={selectedIncidentId}
              filter={filter}
              onFilterChange={setFilter}
              onOpenDetails={handleOpenDetails}
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            className={cn(
              "absolute top-4 z-20 transition-all duration-300 shadow-md bg-background",
              isSidebarOpen ? "left-[386px]" : "left-4"
            )}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          {/* Layer Visibility Control Bar */}
          <div className="absolute top-4 right-4 z-20 flex gap-3 bg-white/95 backdrop-blur-md p-2 px-3 rounded-full shadow-lg border border-slate-200 text-xs font-bold text-slate-700 items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-r pr-2 border-slate-200">Layers</span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={showReports} 
                onChange={(e) => setShowReports(e.target.checked)}
                className="rounded border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A] size-3.5"
              />
              <span>Reports</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none border-l pl-3 border-slate-200">
              <input 
                type="checkbox" 
                checked={showRequests} 
                onChange={(e) => setShowRequests(e.target.checked)}
                className="rounded border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A] size-3.5"
              />
              <span>Requests</span>
            </label>
          </div>

          <div className="flex-1 h-full relative">
            <MapContainer
              incidents={displayedIncidents}
              responders={responders}
              hospitals={hospitals}
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={setSelectedIncidentId}
            />
          </div>

          {/* Incident Report Full Details Dialog */}
          <ReportDetailSheet
            reportId={selectedReportId}
            isOpen={isReportSheetOpen}
            onClose={() => setIsReportSheetOpen(false)}
          />
        </>
      )}
    </div>
  );
}
