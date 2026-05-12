"use client";

import { useState, useEffect } from "react";
import { MapIncident, MapResponder, MapSummary, MapHospital, MapIncidentSchema, MapResponderSchema, MapSummarySchema, MapHospitalSchema } from "@/types/map";
import { z } from "zod";

export function useMapData() {
  const [incidents, setIncidents] = useState<MapIncident[]>([]);
  const [responders, setResponders] = useState<MapResponder[]>([]);
  const [hospitals, setHospitals] = useState<MapHospital[]>([]);
  const [summary, setSummary] = useState<MapSummary>({ new: 0, ongoing: 0, completed: 0, standby: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
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
        currentResponders.map((r) => {
          // If dispatched, move slightly towards a random hospital or destination
          const latDiff = (Math.random() - 0.5) * 0.001;
          const lngDiff = (Math.random() - 0.5) * 0.001;
          
          return {
            ...r,
            lat: r.lat + latDiff,
            lng: r.lng + lngDiff,
            heading: (r.heading || 0) + (Math.random() - 0.5) * 10,
          };
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return { incidents, responders, hospitals, summary, isLoading, error, refresh: fetchData };
}
