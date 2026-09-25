"use client";

import { useState, useEffect, useCallback } from "react";
import { MapDemandZone, MapDemandZoneSchema, MapIncident, MapResponder, MapSummary, MapHospital, MapIncidentSchema, MapResponderSchema, MapSummarySchema, MapHospitalSchema } from "@/types/map";
import { z } from "zod";
import { createClientBrowser } from "@/lib/supabase";

const TelemetryPayloadSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().nullable().optional(),
  timestamp: z.string(),
});

async function readMapResponse<T>(
  result: PromiseSettledResult<Response>,
  label: string,
  parse: (payload: unknown) => T,
  fallback: T,
  failedEndpoints: string[],
): Promise<T> {
  if (result.status === "rejected") {
    failedEndpoints.push(label);
    return fallback;
  }

  if (!result.value.ok) {
    failedEndpoints.push(label);
    return fallback;
  }

  try {
    return parse(await result.value.json());
  } catch {
    failedEndpoints.push(label);
    return fallback;
  }
}

export function useMapData({ date, period }: { date?: string; period?: 'today' | 'weekly' | 'monthly' | 'yearly' } = {}) {
  const [incidents, setIncidents] = useState<MapIncident[]>([]);
  const [responders, setResponders] = useState<MapResponder[]>([]);
  const [hospitals, setHospitals] = useState<MapHospital[]>([]);
  const [demandZones, setDemandZones] = useState<MapDemandZone[]>([]);
  const [summary, setSummary] = useState<MapSummary>({ new: 0, ongoing: 0, completed: 0, standby: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const activeDispatchIds = responders
    .filter((responder) => responder.status === "DISPATCHED" && responder.activeIncidentId)
    .map((responder) => responder.activeIncidentId as string)
    .sort();
  const activeDispatchKey = activeDispatchIds.join(":");

  const fetchData = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setIsLoading(true);
    setError(null);
    setWarning(null);
    try {
      const query = date ? `date=${encodeURIComponent(date)}` : period ? `period=${encodeURIComponent(period)}` : '';
      const incidentQuery = query ? `?${query}` : '';
      const results = await Promise.allSettled([
        fetch(`/api/map/incidents${incidentQuery}`),
        fetch("/api/map/responders"),
        fetch("/api/map/summary"),
        fetch("/api/map/hospitals"),
        fetch("/api/map/hotspots"),
      ]);
      const failedEndpoints: string[] = [];
      const [incidentsData, respondersData, summaryData, hospitalsData, hotspotsData] = await Promise.all([
        readMapResponse(results[0], "incident reports", (payload) => z.array(MapIncidentSchema).parse(payload), [], failedEndpoints),
        readMapResponse(results[1], "responder locations", (payload) => z.array(MapResponderSchema).parse(payload), [], failedEndpoints),
        readMapResponse(results[2], "map summary", (payload) => MapSummarySchema.parse(payload), { new: 0, ongoing: 0, completed: 0, standby: 0 }, failedEndpoints),
        readMapResponse(results[3], "hospital locations", (payload) => z.array(MapHospitalSchema).parse(payload), [], failedEndpoints),
        readMapResponse(results[4], "historical demand zones", (payload) => z.array(MapDemandZoneSchema).parse((payload as { data?: unknown }).data), [], failedEndpoints),
      ]);

      setIncidents(incidentsData);
      setResponders(respondersData);
      setSummary(summaryData);
      setHospitals(hospitalsData);
      setDemandZones(hotspotsData);
      if (failedEndpoints.length === results.length) {
        setError("Unable to load live map data.");
      } else if (failedEndpoints.length > 0) {
        setWarning(`Some supporting map data is temporarily unavailable: ${failedEndpoints.join(", ")}.`);
      }
      if (showSkeleton) setIsLoading(false);
    } catch (err) {
      console.error("Error fetching map data:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      if (showSkeleton) setIsLoading(false);
    }
  }, [date, period]);

  useEffect(() => {
    void fetchData(true);

    const supabase = createClientBrowser();
    
    // Subscribe to realtime database changes for incidents, users (responders), and verification requests
    const channel = supabase
      .channel("map_data_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "incidents",
        },
        () => {
          void fetchData(false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: "role=eq.ambulance_responder",
        },
        () => {
          void fetchData(false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "verification_requests",
        },
        () => {
          void fetchData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Responder clients broadcast GPS updates every few seconds while dispatched.
  // Admin maps subscribe to each active incident channel for immediate marker movement.
  useEffect(() => {
    if (!activeDispatchKey) return;

    const supabase = createClientBrowser();
    const channels = activeDispatchKey.split(":").map((incidentId) => (
      supabase
        .channel(`telemetry:${incidentId}`)
        .on("broadcast", { event: "telemetry" }, ({ payload }) => {
          const telemetry = TelemetryPayloadSchema.safeParse(payload);
          if (!telemetry.success) return;

          setResponders((currentResponders) => currentResponders.map((responder) => (
            responder.activeIncidentId === incidentId
              ? {
                  ...responder,
                  lat: telemetry.data.latitude,
                  lng: telemetry.data.longitude,
                  heading: telemetry.data.heading ?? responder.heading,
                  lastUpdated: telemetry.data.timestamp,
                }
              : responder
          )));
        })
        .subscribe()
    ));

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [activeDispatchKey]);

  return { incidents, responders, hospitals, demandZones, summary, isLoading, error, warning, refresh: () => fetchData(true) };
}
