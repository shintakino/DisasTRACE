import { NextRequest, NextResponse } from "next/server";
import { DetailedIncidentReport } from "@/types/reports";

const mockDetailedReports: Record<string, DetailedIncidentReport> = {
  "DR-2026-0047": {
    id: "DR-2026-0047",
    vehicleId: "AMB-001",
    type: "Vehicular Collision",
    origin: "Brgy. Bagong Nayon",
    destination: "Baliuag District Hospital",
    timestamp: "2026-05-13T10:30:00Z",
    status: "COMPLETED",
    responderName: "John Doe",
    description: "Multi-vehicle collision involving two private cars and a motorcycle. Three casualties treated on site and transported.",
    scenePhotos: [
      "https://images.unsplash.com/photo-1599421142511-8979a831e137?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&q=80&w=400",
    ],
    logs: [
      { action: "Dispatched", time: "2026-05-13T10:35:00Z" },
      { action: "Arrived at Scene", time: "2026-05-13T10:42:00Z" },
      { action: "Patient Transported", time: "2026-05-13T11:05:00Z" },
      { action: "Arrived at Hospital", time: "2026-05-13T11:15:00Z" },
      { action: "Resolved", time: "2026-05-13T11:45:00Z" },
    ],
    participants: [
      { name: "Juan Dela Cruz", contact: "09123456789", triageStatus: "Yellow" },
      { name: "Maria Clara", contact: "09987654321", triageStatus: "Green" },
      { name: "Sisa", contact: "N/A", triageStatus: "Red" },
    ],
  },
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const report = mockDetailedReports[id];

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json(report);
}
