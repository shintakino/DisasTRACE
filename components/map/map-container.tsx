"use client";

import React, { useCallback, useRef, useEffect } from "react";
import Map, { NavigationControl, Marker, MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapIncident, MapResponder, MapHospital } from "@/types/map";
import { MapMarker } from "./map-marker";

interface MapContainerProps {
  incidents: MapIncident[];
  responders: MapResponder[];
  hospitals: MapHospital[];
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
  hospitals,
  selectedIncidentId,
  onSelectIncident,
}: MapContainerProps) {
  const mapRef = useRef<MapRef>(null);

  // Fly to incident when selected from the list
  useEffect(() => {
    if (selectedIncidentId) {
      const selectedIncident = incidents.find((i) => i.id === selectedIncidentId);
      if (selectedIncident) {
        mapRef.current?.flyTo({
          center: [selectedIncident.lng, selectedIncident.lat],
          zoom: 15,
          duration: 2000,
          essential: true,
        });
      }
    }
  }, [selectedIncidentId, incidents]);

  const handleMarkerClick = useCallback((id: string, lat: number, lng: number) => {
    onSelectIncident(id);
    // Note: useEffect above will handle the flyTo
  }, [onSelectIncident]);

  const onMapLoad = useCallback((e: any) => {
    const map = e.target;
    
    // Create a simple wood pattern programmatically to fix the missing image error
    if (!map.hasImage("wood-pattern")) {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Base wood color
        ctx.fillStyle = "#3d2b1f";
        ctx.fillRect(0, 0, 64, 64);
        
        // Grain lines
        ctx.strokeStyle = "#2a1d15";
        ctx.lineWidth = 2;
        for (let i = 0; i < 20; i++) {
          ctx.beginPath();
          ctx.moveTo(Math.random() * 64, 0);
          ctx.lineTo(Math.random() * 64, 64);
          ctx.stroke();
        }
        
        const imageData = ctx.getImageData(0, 0, 64, 64);
        map.addImage("wood-pattern", imageData);
      }
    }
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0a1a]">
      <Map
        ref={mapRef}
        initialViewState={BALIWAG_CENTER}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        attributionControl={false}
        onLoad={onMapLoad}
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

        {/* Hospital Markers */}
        {hospitals.map((hospital) => (
          <Marker
            key={hospital.id}
            latitude={hospital.lat}
            longitude={hospital.lng}
            anchor="bottom"
          >
            <MapMarker
              type="hospital"
              status="AVAILABLE"
              label={hospital.name}
            />
          </Marker>
        ))}
      </Map>
    </div>
  );
}
