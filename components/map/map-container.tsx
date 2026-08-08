"use client";

import React, { useCallback, useRef, useEffect, useState } from "react";
import Map, { NavigationControl, Marker, MapRef, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapIncident, MapResponder, MapHospital } from "@/types/map";
import { MapMarker } from "./map-marker";

interface RouteGeometry {
  id: string;
  color: string;
  data: {
    type: "Feature";
    properties: Record<string, never>;
    geometry: {
      type: "LineString";
      coordinates: number[][];
    };
  };
}

interface RouteCacheEntry {
  responderLat: number;
  responderLng: number;
  route: RouteGeometry;
}

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

// OpenFreeMap Light style
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

function distanceInMeters(firstLat: number, firstLng: number, secondLat: number, secondLng: number) {
  const earthRadius = 6371e3;
  const latitudeDelta = ((secondLat - firstLat) * Math.PI) / 180;
  const longitudeDelta = ((secondLng - firstLng) * Math.PI) / 180;
  const firstLatitude = (firstLat * Math.PI) / 180;
  const secondLatitude = (secondLat * Math.PI) / 180;
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function MapContainer({
  incidents,
  responders,
  hospitals,
  selectedIncidentId,
  onSelectIncident,
}: MapContainerProps) {
  const mapRef = useRef<MapRef>(null);
  const routeCacheRef = useRef<globalThis.Map<string, RouteCacheEntry>>(new globalThis.Map());
  const [routeGeometries, setRouteGeometries] = useState<RouteGeometry[]>([]);

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

  // Keep a live road route for every active dispatched ambulance, not just the selected incident.
  useEffect(() => {
    let active = true;
    const dispatchedPairs = responders.flatMap((responder) => {
      if (responder.status !== "DISPATCHED" || !responder.activeIncidentId) return [];

      const incident = incidents.find((item) => item.id === responder.activeIncidentId && item.status === "ONGOING");
      return incident ? [{ responder, incident }] : [];
    });

    if (dispatchedPairs.length === 0) {
      setRouteGeometries([]);
      return () => {
        active = false;
      };
    }

    const updateRoutes = async () => {
      const nextRoutes = await Promise.all(dispatchedPairs.map(async ({ responder, incident }) => {
        const cachedRoute = routeCacheRef.current.get(responder.id);
        const hasMoved = !cachedRoute || distanceInMeters(cachedRoute.responderLat, cachedRoute.responderLng, responder.lat, responder.lng) >= 50;

        if (cachedRoute && !hasMoved) {
          return cachedRoute.route;
        }

        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${responder.lng},${responder.lat};${incident.lng},${incident.lat}?overview=full&geometries=geojson`;
          const response = await fetch(url);
          const routeResponse: { routes?: Array<{ geometry?: RouteGeometry["data"]["geometry"] }> } = await response.json();
          const geometry = routeResponse.routes?.[0]?.geometry;

          if (!geometry || geometry.type !== "LineString") {
            return cachedRoute?.route;
          }

          const route: RouteGeometry = {
            id: responder.id,
            color: incident.severity === "Critical" ? "#DC2626" : "#F97316",
            data: { type: "Feature", properties: {}, geometry },
          };

          routeCacheRef.current.set(responder.id, {
            responderLat: responder.lat,
            responderLng: responder.lng,
            route,
          });
          return route;
        } catch (error) {
          console.error("Failed to fetch road navigation route:", error);
          return cachedRoute?.route;
        }
      }));

      if (active) {
        setRouteGeometries(nextRoutes.filter((route): route is RouteGeometry => Boolean(route)));
      }
    };

    void updateRoutes();

    return () => {
      active = false;
    };
  }, [incidents, responders]);

  const handleMarkerClick = useCallback((id: string, lat: number, lng: number) => {
    onSelectIncident(id);
    // Note: useEffect above will handle the flyTo
  }, [onSelectIncident]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#f3f4f6]">
      <Map
        ref={mapRef}
        initialViewState={BALIWAG_CENTER}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" />

        {/* Live road routes for all active dispatched ambulances. */}
        {routeGeometries.map((route) => (
          <Source key={route.id} id={`route-source-${route.id}`} type="geojson" data={route.data}>
            <Layer
              id={`route-layer-${route.id}`}
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{ "line-color": route.color, "line-width": 5, "line-opacity": 0.85 }}
            />
          </Source>
        ))}

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
              reporterName={incident.reporterName}
              reporterPhone={incident.reporterPhone}
              destination={incident.destination}
              severity={incident.severity}
              nature={incident.nature}
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
                responderName={responder.responderName}
                lastUpdated={responder.lastUpdated}
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
              hospitalAddress={hospital.address}
              hospitalPhone={hospital.phone}
              caters={hospital.caters}
            />
          </Marker>
        ))}
      </Map>
    </div>
  );
}
