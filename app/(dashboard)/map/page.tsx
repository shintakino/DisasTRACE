"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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

import { WebPreloader } from "@/components/ui/web-preloader";

function MapPageContent() {
  const { incidents, responders, hospitals, summary, isLoading, error } = useMapData();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | undefined>();
  const [filter, setFilter] = useState("ALL");
  const [category, setCategory] = useState<"user" | "responder">("user");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Layer visibility state (requests vs reports)
  const [showReports, setShowReports] = useState(true);
  const [showRequests, setShowRequests] = useState(true);

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
        if (incident.category === "user") {
          setShowRequests(true);
        } else if (incident.category === "responder") {
          setShowReports(true);
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
      if (found.category === "user") {
        setShowRequests(true);
      } else if (found.category === "responder") {
        setShowReports(true);
      }
    }
  };

  const handleOpenDetails = (id: string) => {
    setSelectedReportId(id);
    setIsReportSheetOpen(true);
  };

  // Filter incidents based on checkbox visibility toggles
  const displayedIncidents = incidents.filter((incident) => {
    if (incident.category === "user") return showRequests;
    if (incident.category === "responder") return showReports;
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
        <div className="w-full h-full p-4 flex items-center justify-center bg-[#0B132B]">
          <WebPreloader title="Loading Interactive Emergency Map..." subtitle="Fetching real-time GPS responder telemetry, active emergency pins, and hospital routes" />
        </div>
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
              category={category}
              onCategoryChange={setCategory}
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
