"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { IncidentPanel } from "@/components/map/incident-panel";
import { MapContainer } from "@/components/map/map-container";
import { useMapData } from "@/hooks/use-map-data";
import { MapIncident } from "@/types/map";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReportDetailSheet } from "@/components/reports/report-detail-sheet";
import { CommandMapOverlays, type CommandMapLayers } from "@/components/map/command-map-overlays";

import { WebPreloader } from "@/components/ui/web-preloader";

function MapPageContent() {
  const [period, setPeriod] = useState<"today" | "weekly" | "monthly" | "yearly">("today");
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [barangay, setBarangay] = useState("all");
  const { incidents, responders, activeRoutes, hospitals, demandZones, isLoading, error, warning, refresh } = useMapData({
    date: selectedDate,
    period: selectedDate ? undefined : period,
    barangay: barangay === "all" ? undefined : barangay,
  });
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
        if (incident.status === "REJECTED" || incident.status === "DUPLICATE") {
          setLayers((current) => ({ ...current, rejected: true }));
        }
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
      if (found.status === "REJECTED" || found.status === "DUPLICATE") {
        setLayers((current) => ({ ...current, rejected: true }));
      }
    }
  };

  const handleOpenDetails = (id: string) => {
    setSelectedReportId(id);
    setIsReportSheetOpen(true);
  };

  const displayedIncidents = incidents.filter((incident) => {
    if (barangay !== "all" && incident.barangay !== barangay) return false;
    if (incident.category === "user" && !layers.requests) return false;
    if (incident.category === "responder" && !layers.reports) return false;
    if ((incident.status === "REJECTED" || incident.status === "DUPLICATE") && !layers.rejected && filter !== "REJECTED") return false;
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {warning ? <p role="status" className="absolute bottom-4 left-4 z-30 max-w-sm rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 shadow-sm">{warning}</p> : null}
      {isLoading ? (
        <div className="flex h-full w-full items-center justify-center bg-slate-50 p-4">
          <WebPreloader title="Loading Interactive Emergency Map..." subtitle="Fetching real-time GPS responder telemetry, active emergency pins, and hospital routes" />
        </div>
      ) : (
        <>
          <div className={cn(
            "z-10 flex h-full min-h-0 shrink-0 overflow-hidden border-r border-slate-200 transition-all duration-300 ease-in-out",
            isSidebarOpen ? "w-[480px]" : "w-0"
          )}>
            <IncidentPanel
              incidents={incidents}
              onSelectIncident={handleSelectIncident}
              selectedIncidentId={selectedIncidentId}
              filter={filter}
              onFilterChange={setFilter}
              onOpenDetails={handleOpenDetails}
              category={category}
              onCategoryChange={setCategory}
              onPriorityChange={setPriorityIncidentId}
              barangay={barangay}
              onBarangayChange={setBarangay}
              period={period}
              onPeriodChange={(nextPeriod) => {
                setSelectedDate(undefined);
                setPeriod(nextPeriod);
              }}
              date={selectedDate}
              onDateChange={setSelectedDate}
              onTogglePanel={() => setIsSidebarOpen(false)}
            />
          </div>

          {!isSidebarOpen ? (
            <Button
              variant="outline"
              size="icon"
              className="absolute left-4 top-4 z-20 border-slate-200 bg-white text-[#1E3A8A] shadow-sm"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Show incident panel"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </Button>
          ) : null}

          <CommandMapOverlays
            layers={layers}
            onLayerChange={(layer, checked) => setLayers((current) => ({ ...current, [layer]: checked }))}
            zones={demandZones}
          />

          <div className="relative h-full min-h-0 min-w-0 flex-1">
            <MapContainer
              incidents={displayedIncidents}
              responders={responders}
              activeRoutes={activeRoutes}
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
