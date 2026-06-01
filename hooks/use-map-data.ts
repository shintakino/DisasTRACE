"use client";

import { useState, useEffect } from "react";
import { MapIncident, MapResponder, MapSummary, MapHospital, MapIncidentSchema, MapResponderSchema, MapSummarySchema, MapHospitalSchema } from "@/types/map";
import { z } from "zod";
import { createClientBrowser } from "@/lib/supabase";

export function useMapData() {
  const [incidents, setIncidents] = useState<MapIncident[]>([]);
  const [responders, setResponders] = useState<MapResponder[]>([]);
  const [hospitals, setHospitals] = useState<MapHospital[]>([]);
  const [summary, setSummary] = useState<MapSummary>({ new: 0, ongoing: 0, completed: 0, standby: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return { incidents, responders, hospitals, summary, isLoading, error, refresh: () => fetchData(true) };
}
