"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { IncidentPanel } from "@/components/map/incident-panel";
import { MapContainer } from "@/components/map/map-container";
import { useMapData } from "@/hooks/use-map-data";
import { MapIncident } from "@/types/map";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Activity, AlertCircle, ChevronLeft, ChevronRight, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReportDetailSheet } from "@/components/reports/report-detail-sheet";
import { CommandMapOverlays, type CommandMapLayers } from "@/components/map/command-map-overlays";

import { WebPreloader } from "@/components/ui/web-preloader";

function MapPageContent() {
  const { incidents, responders, hospitals, demandZones, summary, isLoading, error, refresh } = useMapData();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | undefined>();
  const [filter, setFilter] = useState("ALL");
  const [category, setCategory] = useState<"user" | "responder">("user");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [priorityIncidentId, setPriorityIncidentId] = useState<string | undefined>();
  
  const [layers, setLayers] = useState<CommandMapLayers>({
    critical: true,
    high: true,
    moderate: true,
    requests: true,
    reports: true,
    responders: true,
    rejected: false,
    demandZones: true,
  });

  // Full Report Detail Modal State
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false);

  const searchParams = useSearchParams();
  const selectParam = searchParams.get("select");

  useEffect(() => {
    if (selectParam && incidents.length > 0) {
      const incident = incidents.find((i) => i.id === selectParam);
      if (incident) {
        setSelectedIncidentId(selectParam);
        setCategory(incident.category);
        
        // Ensure layer is visible
        if (incident.category === "user") setLayers((current) => ({ ...current, requests: true }));
        else if (incident.category === "responder") setLayers((current) => ({ ...current, reports: true }));
      }
    }
  }, [selectParam, incidents]);

  const handleSelectIncident = (incident: MapIncident | string) => {
    const id = typeof incident === "string" ? incident : incident.id;
    setSelectedIncidentId(id);
    
    // Switch active category and ensure layer visibility when selecting from the map
    const found = incidents.find((i) => i.id === id);
    if (found) {
      setCategory(found.category);
      if (found.category === "user") setLayers((current) => ({ ...current, requests: true }));
      else if (found.category === "responder") setLayers((current) => ({ ...current, reports: true }));
    }
  };

  const handleOpenDetails = (id: string) => {
    setSelectedReportId(id);
    setIsReportSheetOpen(true);
  };

  const displayedIncidents = incidents.filter((incident) => {
    if (incident.category === "user" && !layers.requests) return false;
    if (incident.category === "responder" && !layers.reports) return false;
    if ((incident.status === "REJECTED" || incident.status === "DUPLICATE") && !layers.rejected) return false;
    if (incident.severity === "Critical" && !layers.critical) return false;
    if (incident.severity === "High" && !layers.high) return false;
    if ((incident.severity === "Medium" || incident.severity === "Low") && !layers.moderate) return false;
    return true;
  });

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}. The last confirmed map state could not be refreshed.
            <Button type="button" variant="outline" className="mt-3 block" onClick={refresh}>Retry map data</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const activeIncidentCount = incidents.filter((incident) => !['COMPLETED', 'REJECTED', 'DUPLICATE'].includes(incident.status)).length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-[#EAF1FF] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-[#1E3A8A] text-white"><MapPinned className="size-5" /></div>
          <div><h1 className="text-lg font-black text-[#1E3A8A]">Live Operations Map</h1><p className="mt-0.5 text-xs text-slate-600">Monitor current reports, active responses, and available ambulance units.</p></div>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-[#1E3A8A]"><span className="inline-flex items-center gap-1.5"><Activity className="size-3.5" /> {activeIncidentCount} active incidents</span><span>{responders.filter((responder) => responder.status === 'AVAILABLE').length} responders available</span></div>
      </header>
      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {isLoading ? (
        <div className="flex h-full w-full items-center justify-center bg-slate-50 p-4">
          <WebPreloader title="Loading Interactive Emergency Map..." subtitle="Fetching real-time GPS responder telemetry, active emergency pins, and hospital routes" />
        </div>
      ) : (
        <>
          <div className={cn(
            "z-10 flex h-full overflow-hidden border-r border-slate-200 transition-all duration-300 ease-in-out",
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
              category={category}
              onCategoryChange={setCategory}
              onPriorityChange={setPriorityIncidentId}
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            className={cn(
              "absolute top-4 z-20 border-slate-200 bg-white shadow-sm transition-all duration-300",
              isSidebarOpen ? "left-[386px]" : "left-4"
            )}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label={isSidebarOpen ? "Hide incident panel" : "Show incident panel"}
          >
            {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          <CommandMapOverlays layers={layers} onLayerChange={(layer, checked) => setLayers((current) => ({ ...current, [layer]: checked }))} zones={demandZones} />

          <div className="relative h-full flex-1">
            <MapContainer
              incidents={displayedIncidents}
              responders={responders}
              hospitals={hospitals}
              demandZones={demandZones}
              showDemandZones={layers.demandZones}
              showResponders={layers.responders}
              selectedIncidentId={selectedIncidentId}
              priorityIncidentId={priorityIncidentId}
              onSelectIncident={handleSelectIncident}
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
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-full p-4 flex items-center justify-center bg-[#0B132B]">
        <WebPreloader title="Loading Interactive Emergency Map..." subtitle="Fetching real-time GPS responder telemetry, active emergency pins, and hospital routes" />
      </div>
    }>
      <MapPageContent />
    </Suspense>
  );
}
