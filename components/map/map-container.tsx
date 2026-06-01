"use client";

import React, { useCallback, useRef, useEffect, useState } from "react";
import Map, { NavigationControl, Marker, MapRef, Source, Layer } from "react-map-gl/maplibre";
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
  const [routeGeometry, setRouteGeometry] = useState<any>(null);

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

  // Fetch real road route between assigned responder and selected ongoing incident
  useEffect(() => {
    let active = true;

    if (!selectedIncidentId) {
      setRouteGeometry(null);
      return;
    }

    const selectedIncident = incidents.find((i) => i.id === selectedIncidentId);
    if (!selectedIncident || selectedIncident.status !== "ONGOING") {
      setRouteGeometry(null);
      return;
    }

    // Find the assigned responder for this ongoing incident
    const assignedResponder = responders.find((r) => r.vehicleId === selectedIncident.vehicleId);
    if (!assignedResponder) {
      setRouteGeometry(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${assignedResponder.lng},${assignedResponder.lat};${selectedIncident.lng},${selectedIncident.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (active && data.routes && data.routes.length > 0) {
          setRouteGeometry({
            type: "Feature",
            properties: {},
            geometry: data.routes[0].geometry,
          });
        }
      } catch (err) {
        console.error("Failed to fetch road navigation route:", err);
      }
    };

    fetchRoute();

    return () => {
      active = false;
    };
  }, [selectedIncidentId, incidents, responders]);

  const handleMarkerClick = useCallback((id: string, lat: number, lng: number) => {
    onSelectIncident(id);
    // Note: useEffect above will handle the flyTo
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

        {/* Live Road Route layer for active dispatched ongoing incidents */}
        {routeGeometry && (
          <Source id="route-source" type="geojson" data={routeGeometry}>
            <Layer
              id="route-layer"
              type="line"
              layout={{
                "line-join": "round",
                "line-cap": "round",
              }}
              paint={{
                "line-color": "#f97316", // Vibrant orange route line matching active theme
                "line-width": 5,
                "line-opacity": 0.85,
              }}
            />
          </Source>
        )}

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

        {/* Live Standby & Active Responder Markers */}
        {responders
          .filter((r) => r.status === "AVAILABLE" || r.status === "DISPATCHED")
          .map((responder) => (
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
