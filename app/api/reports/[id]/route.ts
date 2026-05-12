import { NextRequest, NextResponse } from "next/server";
import { DetailedIncidentReport } from "@/types/reports";

const mockDetailedReports: Record<string, DetailedIncidentReport> = {
  "DR-2026-0047": {
    id: "DR-2026-0047",
    responderName: "Bastes, Renzy",
    vehicleId: "AMB-001",
    type: "Fire Emergency",
    status: "DISPATCHED",
    date: "21 March 2026",
    time: "09:43 AM",
    location: "Brgy. Sabang, Baliwag City",
    description: "Fire reported in a residential area. Preliminary assessment indicates a kitchen fire that spread to the living room.",
    scenePhotos: [
      "https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1563911892437-1feda0179e1b?auto=format&fit=crop&q=80&w=400",
    ],
    logs: [
      { action: "Dispatched", time: "09:43 AM" },
      { action: "En Route", time: "09:45 AM" },
      { action: "Arrived at Scene", time: "09:55 AM" },
    ],
    participants: [
      { name: "Juan Dela Cruz", contact: "09123456789", triageStatus: "Green" },
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
    // Fallback for demo purposes if ID doesn't exist in mockDetailedReports
    return NextResponse.json({
      id: id,
      responderName: "Demo Responder",
      vehicleId: "AMB-999",
      type: "Medical Emergency",
      status: "COMPLETED",
      date: "21 March 2026",
      time: "10:00 AM",
      location: "Baliuag, Bulacan",
      description: "Demo report details for Case " + id,
      scenePhotos: ["https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&q=80&w=400"],
      logs: [{ action: "Report Generated", time: "10:00 AM" }],
      participants: [],
    });
  }

  return NextResponse.json(report);
}
