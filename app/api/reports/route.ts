import { NextRequest, NextResponse } from "next/server";
import { ReportEntry } from "@/types/reports";

const mockReports: ReportEntry[] = [
  {
    id: "DR-2026-0047",
    responderName: "Bastes, Renzy",
    type: "Fire Emergency",
    status: "COMPLETED",
    date: "21 March 2026",
    time: "09:43 AM",
    location: "Brgy. Sabang, Baliwag City",
  },
  {
    id: "DR-2026-0046",
    responderName: "Dela Cruz, Juan",
    type: "Vehicular Collision",
    status: "ONGOING",
    date: "21 March 2026",
    time: "09:30 AM",
    location: "Brgy. Bagong Nayon, Baliwag City",
  },
  {
    id: "DR-2026-0045",
    responderName: "Santos, Maria",
    type: "Medical Emergency",
    status: "RESPONDING",
    date: "21 March 2026",
    time: "08:15 AM",
    location: "Brgy. Tibag, Baliwag City",
  },
  {
    id: "DR-2026-0044",
    responderName: "Gomez, Jose",
    type: "Structural Failure",
    status: "COMPLETED",
    date: "20 March 2026",
    time: "11:20 PM",
    location: "Brgy. Poblacion, Baliwag City",
  },
  {
    id: "DR-2026-0043",
    responderName: "Lopez, Ana",
    type: "Flood/Water",
    status: "ONGOING",
    date: "20 March 2026",
    time: "06:45 PM",
    location: "Brgy. Sulivan, Baliwag City",
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
        r.responderName.toLowerCase().includes(search) ||
        r.type.toLowerCase().includes(search) ||
        r.id.toLowerCase().includes(search)
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
