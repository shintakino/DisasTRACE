import { NextRequest, NextResponse } from "next/server";
import { ReportTableItem, ReportStatus, IncidentType } from "@/types/reports";

const mockReports: ReportTableItem[] = [
  {
    id: "DR-2026-0047",
    vehicleId: "AMB-001",
    type: "Vehicular Collision",
    origin: "Brgy. Bagong Nayon",
    destination: "Baliuag District Hospital",
    timestamp: "2026-05-13T10:30:00Z",
    status: "COMPLETED",
  },
  {
    id: "DR-2026-0046",
    vehicleId: "AMB-003",
    type: "Medical Emergency",
    origin: "Brgy. Tibag",
    destination: "Sagrada Familia Hospital",
    timestamp: "2026-05-13T09:15:00Z",
    status: "ONGOING",
  },
  {
    id: "DR-2026-0045",
    vehicleId: "AMB-002",
    type: "Fire/Explosion",
    origin: "Baliwag Public Market",
    destination: "N/A",
    timestamp: "2026-05-13T08:00:00Z",
    status: "STANDBY",
  },
  {
    id: "DR-2026-0044",
    vehicleId: "AMB-001",
    type: "Structural Failure",
    origin: "Brgy. Poblacion",
    destination: "Baliuag District Hospital",
    timestamp: "2026-05-12T22:45:00Z",
    status: "COMPLETED",
  },
  {
    id: "DR-2026-0043",
    vehicleId: "AMB-004",
    type: "Flood/Water",
    origin: "Brgy. Sulivan",
    destination: "Evacuation Center",
    timestamp: "2026-05-12T18:20:00Z",
    status: "NEW",
  },
  {
    id: "DR-2026-0042",
    vehicleId: "AMB-005",
    type: "Unknown Cause",
    origin: "Brgy. Makinabang",
    destination: "Baliuag District Hospital",
    timestamp: "2026-05-12T14:10:00Z",
    status: "COMPLETED",
  },
];

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get("search")?.toLowerCase();
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  let filtered = [...mockReports];

  if (search) {
    filtered = filtered.filter(
      (r) =>
        r.id.toLowerCase().includes(search) ||
        r.vehicleId.toLowerCase().includes(search)
    );
  }

  if (type) {
    filtered = filtered.filter((r) => r.type === type);
  }

  if (status) {
    filtered = filtered.filter((r) => r.status === status);
  }

  const start = (page - 1) * limit;
  const end = start + limit;
  const paginated = filtered.slice(start, end);

  return NextResponse.json({
    data: paginated,
    total: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit),
  });
}
