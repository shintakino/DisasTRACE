"use client";

import { useState } from "react";
import { IncidentPanel } from "@/components/map/incident-panel";
import { MapContainer } from "@/components/map/map-container";
import { useMapData } from "@/hooks/use-map-data";
import { MapIncident } from "@/types/map";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function MapPage() {
  const { incidents, responders, summary, isLoading, error } = useMapData();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | undefined>();
  const [filter, setFilter] = useState("ALL");

  const handleSelectIncident = (incident: MapIncident | string) => {
    const id = typeof incident === "string" ? incident : incident.id;
    setSelectedIncidentId(id);
  };

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
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {isLoading ? (
        <>
          <div className="w-[400px] border-r p-4 space-y-4">
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
          <div className="flex-1 bg-muted/20">
            <Skeleton className="w-full h-full" />
          </div>
        </>
      ) : (
        <>
          <IncidentPanel
            summary={summary}
            incidents={incidents}
            onSelectIncident={handleSelectIncident}
            selectedIncidentId={selectedIncidentId}
            filter={filter}
            onFilterChange={setFilter}
          />
          <div className="flex-1">
            <MapContainer
              incidents={incidents}
              responders={responders}
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={setSelectedIncidentId}
            />
          </div>
        </>
      )}
    </div>
  );
}
