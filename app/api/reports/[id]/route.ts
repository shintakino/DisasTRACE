import { NextRequest, NextResponse } from "next/server";
import { DetailedIncidentReport, ReportStatus } from "@/types/reports";

// Helper function to dynamically generate mock data
const generateMockReport = (id: string, status?: ReportStatus): DetailedIncidentReport => {
  const baseReport = {
    id: id,
    responderName: "Bastes, Renzy",
    vehicleId: "AMB-001",
    type: "Fire Emergency" as const,
    status: status || "COMPLETED",
    date: "21 March 2026",
    time: "09:43 AM",
    location: "Brgy. Sabang, Baliwag City",
    residentReportDescription: "Saw a huge smoke coming out from the neighbor's kitchen. We need help immediately!",
    crewFindings: "Fire reported in a residential area. Preliminary assessment indicates a kitchen fire that spread to the living room.",
    natureOfCall: "Emergency",
    severityLevel: "Critical",
    peopleInvolved: 3,
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
  };
  return baseReport;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // For demo, infer status based on ID from the mock list if it matches
  let status: ReportStatus = "COMPLETED";
  if (id === "DR-2026-0046" || id === "DR-2026-0043") status = "ONGOING";
  if (id === "DR-2026-0045") status = "RESPONDING";

  return NextResponse.json(generateMockReport(id, status));
}
