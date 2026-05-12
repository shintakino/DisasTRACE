"use client";

import React, { useCallback, useRef } from "react";
import Map, { NavigationControl, Marker, MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapIncident, MapResponder } from "@/types/map";
import { MapMarker } from "./map-marker";

interface MapContainerProps {
  incidents: MapIncident[];
  responders: MapResponder[];
  selectedIncidentId?: string;
  onSelectIncident: (id: string) => void;
}

const BALIWAG_CENTER = {
  latitude: 14.9535,
  longitude: 120.9105,
  zoom: 13,
};

// OpenFreeMap Dark style
const MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

export function MapContainer({
  incidents,
  responders,
  selectedIncidentId,
  onSelectIncident,
}: MapContainerProps) {
  const mapRef = useRef<MapRef>(null);

  const handleMarkerClick = useCallback((id: string, lat: number, lng: number) => {
    onSelectIncident(id);
    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom: 15,
      duration: 2000,
    });
  }, [onSelectIncident]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0a1a]">
      <Map
        ref={mapRef}
        initialViewState={BALIWAG_CENTER}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" />

        {/* Incident Markers */}
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            latitude={incident.lat}
            longitude={incident.lng}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              handleMarkerClick(incident.id, incident.lat, incident.lng);
            }}
          >
            <MapMarker
              type="incident"
              status={incident.status}
              label={incident.caseId}
              isSelected={selectedIncidentId === incident.id}
            />
          </Marker>
        ))}

        {/* Responder Markers */}
        {responders.map((responder) => (
          <Marker
            key={responder.id}
            latitude={responder.lat}
            longitude={responder.lng}
            anchor="bottom"
          >
            <MapMarker
              type="responder"
              status={responder.status === "DISPATCHED" ? "ONGOING" : "STANDBY"}
              label={responder.vehicleId}
            />
          </Marker>
        ))}
      </Map>
    </div>
  );
}
