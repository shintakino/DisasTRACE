"use client";

import { useState, useEffect } from "react";
import { MapIncident, MapResponder, MapSummary, MapHospital, MapIncidentSchema, MapResponderSchema, MapSummarySchema, MapHospitalSchema } from "@/types/map";
import { z } from "zod";
import { createClientBrowser } from "@/lib/supabase";

const TelemetryPayloadSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().nullable().optional(),
  timestamp: z.string(),
});

export function useMapData() {
  const [incidents, setIncidents] = useState<MapIncident[]>([]);
  const [responders, setResponders] = useState<MapResponder[]>([]);
  const [hospitals, setHospitals] = useState<MapHospital[]>([]);
  const [summary, setSummary] = useState<MapSummary>({ new: 0, ongoing: 0, completed: 0, standby: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeDispatchIds = responders
    .filter((responder) => responder.status === "DISPATCHED" && responder.activeIncidentId)
    .map((responder) => responder.activeIncidentId as string)
    .sort();
  const activeDispatchKey = activeDispatchIds.join(":");

  const fetchData = async (showSkeleton = true) => {
    if (showSkeleton) setIsLoading(true);
    try {
      const [incidentsRes, respondersRes, summaryRes, hospitalsRes] = await Promise.all([
        fetch("/api/map/incidents"),
        fetch("/api/map/responders"),
        fetch("/api/map/summary"),
        fetch("/api/map/hospitals"),
      ]);

      if (!incidentsRes.ok || !respondersRes.ok || !summaryRes.ok || !hospitalsRes.ok) {
        throw new Error("Failed to fetch map data");
      }

      const incidentsData = await incidentsRes.json();
      const respondersData = await respondersRes.json();
      const summaryData = await summaryRes.json();
      const hospitalsData = await hospitalsRes.json();

      setIncidents(z.array(MapIncidentSchema).parse(incidentsData));
      setResponders(z.array(MapResponderSchema).parse(respondersData));
      setSummary(MapSummarySchema.parse(summaryData));
      setHospitals(z.array(MapHospitalSchema).parse(hospitalsData));
      if (showSkeleton) setIsLoading(false);
    } catch (err) {
      console.error("Error fetching map data:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      if (showSkeleton) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);

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
          fetchData(false);
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
          fetchData(false);
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
          fetchData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Responder clients broadcast GPS updates every few seconds while dispatched.
  // Admin maps subscribe to each active incident channel for immediate marker movement.
  useEffect(() => {
    if (!activeDispatchKey) return;

    const supabase = createClientBrowser();
    const channels = activeDispatchKey.split(":").map((incidentId) => (
      supabase
        .channel(`map-telemetry-${incidentId}`)
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

  return { incidents, responders, hospitals, summary, isLoading, error, refresh: () => fetchData(true) };
}
