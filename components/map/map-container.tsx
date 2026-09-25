"use client";

import React, { useCallback, useMemo, useRef, useEffect, useState } from "react";
import Map, { NavigationControl, Marker, MapRef, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { AlertCircle, RefreshCw } from "lucide-react";
import { MapDemandZone, MapIncident, MapResponder, MapHospital } from "@/types/map";
import { MapMarker } from "./map-marker";
import { configureMapLibreWorker } from "./maplibre-worker";

configureMapLibreWorker();

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
  demandZones?: MapDemandZone[];
  showDemandZones?: boolean;
  showResponders?: boolean;
  selectedIncidentId?: string;
  priorityIncidentId?: string;
  onSelectIncident: (id: string) => void;
}

const BALIWAG_CENTER = {
  latitude: 14.9535,
  longitude: 120.9105,
  zoom: 13,
};

const BALIWAG_CAMERA_BOUNDS: [number, number, number, number] = [120.78, 14.85, 121.04, 15.08];

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
  demandZones = [],
  showDemandZones = false,
  showResponders = true,
  selectedIncidentId,
  priorityIncidentId,
  onSelectIncident,
}: MapContainerProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapInstanceKey, setMapInstanceKey] = useState(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const lastFocusedIncidentIdRef = useRef<string | undefined>(undefined);
  const lastFittedIncidentKeyRef = useRef<string | undefined>(undefined);
  const routeCacheRef = useRef<globalThis.Map<string, RouteCacheEntry>>(new globalThis.Map());
  const [routeGeometries, setRouteGeometries] = useState<RouteGeometry[]>([]);
  const demandZoneFeatures = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: demandZones.map((zone) => ({
      type: "Feature" as const,
      properties: { id: zone.id, count: zone.count, riskLevel: zone.riskLevel },
      geometry: { type: "Point" as const, coordinates: [zone.longitude, zone.latitude] },
    })),
  }), [demandZones]);
  const visibleIncidentKey = useMemo(() => incidents
    .map((incident) => `${incident.id}:${incident.lat}:${incident.lng}`)
    .sort()
    .join("|"), [incidents]);

  // Fly to incident when selected from the list
  useEffect(() => {
    if (!selectedIncidentId) {
      lastFocusedIncidentIdRef.current = undefined;
      return;
    }
    if (lastFocusedIncidentIdRef.current !== selectedIncidentId) {
      const selectedIncident = incidents.find((i) => i.id === selectedIncidentId);
      if (selectedIncident) {
        lastFocusedIncidentIdRef.current = selectedIncidentId;
        mapRef.current?.flyTo({
          center: [selectedIncident.lng, selectedIncident.lat],
          zoom: 15,
          duration: 2000,
          essential: true,
        });
      }
    }
  }, [selectedIncidentId, incidents]);

  // Frame the markers already visible under the active layer filters. Selection
  // remains a separate action: clicking a report focuses only that one marker.
  useEffect(() => {
    const map = mapRef.current;
    const fitKey = `${mapInstanceKey}:${visibleIncidentKey}`;
    if (!isMapReady || !map || !visibleIncidentKey || lastFittedIncidentKeyRef.current === fitKey) return;

    lastFittedIncidentKeyRef.current = fitKey;
    if (selectedIncidentId) return;

    if (incidents.length === 1) {
      map.flyTo({
        center: [incidents[0].lng, incidents[0].lat],
        zoom: 14,
        duration: 0,
        essential: true,
      });
      return;
    }

    const [firstIncident, ...remainingIncidents] = incidents;
    const bounds = remainingIncidents.reduce<[[number, number], [number, number]]>((currentBounds, incident) => [
      [Math.min(currentBounds[0][0], incident.lng), Math.min(currentBounds[0][1], incident.lat)],
      [Math.max(currentBounds[1][0], incident.lng), Math.max(currentBounds[1][1], incident.lat)],
    ], [
      [firstIncident.lng, firstIncident.lat],
      [firstIncident.lng, firstIncident.lat],
    ]);

    map.fitBounds(bounds, {
      padding: { top: 64, right: 280, bottom: 64, left: 64 },
      maxZoom: 14,
      duration: 0,
      essential: true,
    });
  }, [incidents, isMapReady, mapInstanceKey, selectedIncidentId, visibleIncidentKey]);

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

  const retryMap = useCallback(() => {
    setMapError(null);
    setIsMapReady(false);
    setMapInstanceKey((current) => current + 1);
  }, []);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#f3f4f6]">
      <Map
        key={mapInstanceKey}
        ref={mapRef}
        initialViewState={BALIWAG_CENTER}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        attributionControl={false}
        minZoom={11}
        maxZoom={18}
        maxBounds={BALIWAG_CAMERA_BOUNDS}
        renderWorldCopies={false}
        onLoad={() => {
          setMapError(null);
          setIsMapReady(true);
        }}
        onError={(event) => {
          if (!isMapReady) {
            setMapError(event.error?.message || "The map style or tiles could not be loaded.");
          }
        }}
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

        {showDemandZones && demandZoneFeatures.features.length > 0 ? (
          <Source id="historical-demand-zones" type="geojson" data={demandZoneFeatures}>
            <Layer
              id="historical-demand-zones-fill"
              type="circle"
              paint={{
                "circle-radius": ["interpolate", ["linear"], ["get", "count"], 3, 60, 5, 90, 8, 130],
                "circle-color": ["match", ["get", "riskLevel"], "HIGH", "#DC2626", "MODERATE", "#D97706", "#2563EB"],
                "circle-opacity": 0.16,
                "circle-stroke-color": ["match", ["get", "riskLevel"], "HIGH", "#B91C1C", "MODERATE", "#B45309", "#1D4ED8"],
                "circle-stroke-width": 2,
                "circle-stroke-opacity": 0.7,
              }}
            />
          </Source>
        ) : null}

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
              isPriority={priorityIncidentId === incident.id}
              reporterName={incident.reporterName}
              reporterPhone={incident.reporterPhone}
              destination={incident.destination}
              severity={incident.severity}
              nature={incident.nature}
              incidentType={incident.type}
            />
          </Marker>
        ))}

        {/* Live Standby & Active Responder Markers */}
        {showResponders && responders
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

      {!isMapReady && !mapError ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-100/70" role="status" aria-live="polite">
          <p className="rounded-lg bg-white/95 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">Loading map…</p>
        </div>
      ) : null}

      {mapError ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/90 p-6" role="alert">
          <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <AlertCircle className="mx-auto size-6 text-amber-600" aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold text-slate-900">Map unavailable</h2>
            <p className="mt-2 text-sm leading-5 text-slate-600">The incident data is still available, but the basemap could not be loaded. Check the network connection and try again.</p>
            <button type="button" onClick={retryMap} className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#1E3A8A] px-3 py-2 text-sm font-semibold text-white hover:bg-[#173274] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-offset-2">
              <RefreshCw className="size-4" aria-hidden="true" />
              Retry map
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
