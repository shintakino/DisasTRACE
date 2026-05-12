"use client";

import { useState, useEffect } from "react";
import { MapIncident, MapResponder, MapSummary, MapIncidentSchema, MapResponderSchema, MapSummarySchema } from "@/types/map";
import { z } from "zod";

export function useMapData() {
  const [incidents, setIncidents] = useState<MapIncident[]>([]);
  const [responders, setResponders] = useState<MapResponder[]>([]);
  const [summary, setSummary] = useState<MapSummary>({ new: 0, ongoing: 0, completed: 0, standby: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [incidentsRes, respondersRes, summaryRes] = await Promise.all([
        fetch("/api/map/incidents"),
        fetch("/api/map/responders"),
        fetch("/api/map/summary"),
      ]);

      if (!incidentsRes.ok || !respondersRes.ok || !summaryRes.ok) {
        throw new Error("Failed to fetch map data");
      }

      const incidentsData = await incidentsRes.json();
      const respondersData = await respondersRes.json();
      const summaryData = await summaryRes.json();

      setIncidents(z.array(MapIncidentSchema).parse(incidentsData));
      setResponders(z.array(MapResponderSchema).parse(respondersData));
      setSummary(MapSummarySchema.parse(summaryData));
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching map data:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Simulate real-time updates every 5 seconds
    const interval = setInterval(() => {
      setResponders((currentResponders) => 
        currentResponders.map((r) => ({
          ...r,
          lat: r.lat + (Math.random() - 0.5) * 0.001,
          lng: r.lng + (Math.random() - 0.5) * 0.001,
          heading: (r.heading || 0) + (Math.random() - 0.5) * 10,
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return { incidents, responders, summary, isLoading, error, refresh: fetchData };
}
