import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { StatusLogEntry } from "@/types/logs";

const mockLogs: StatusLogEntry[] = [
  {
    id: "LOG-001",
    timestamp: "2026-03-21T09:43:00Z",
    date: "21 March 2026",
    time: "09:43 AM",
    responderName: "Bastes, Renzy",
    logDescription: "Dispatched to DR-2026-0047",
    status: "DISPATCHED",
    action: "DISPATCHED",
  },
  {
    id: "LOG-002",
    timestamp: "2026-03-21T09:30:00Z",
    date: "21 March 2026",
    time: "09:30 AM",
    responderName: "Dela Cruz, Juan",
    logDescription: "Arrived at scene for DR-2026-0046",
    status: "ON-SCENE",
    action: "ARRIVED",
  },
  {
    id: "LOG-003",
    timestamp: "2026-03-21T08:15:00Z",
    date: "21 March 2026",
    time: "08:15 AM",
    responderName: "Santos, Maria",
    logDescription: "Completed medical response for DR-2026-0045",
    status: "STANDBY",
    action: "COMPLETED",
  },
  {
    id: "LOG-004",
    timestamp: "2026-03-21T07:00:00Z",
    date: "21 March 2026",
    time: "07:00 AM",
    responderName: "Gomez, Jose",
    logDescription: "Shift started",
    status: "STANDBY",
    action: "STARTED",
  },
  {
    id: "LOG-005",
    timestamp: "2026-03-20T18:45:00Z",
    date: "20 March 2026",
    time: "06:45 PM",
    responderName: "Lopez, Ana",
    logDescription: "En route to flood assessment in DR-2026-0043",
    status: "DISPATCHED",
    action: "DISPATCHED",
  },
];

export async function GET(req: NextRequest) {
  const { sessionClaims } = await getAuth(req);
  const role = sessionClaims?.metadata?.role;

  if (role !== "cdrrmo_super_admin" && role !== "pacc_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get("search")?.toLowerCase();
  const status = searchParams.get("status");

  let filtered = [...mockLogs];

  if (search) {
    filtered = filtered.filter(
      (l) =>
        l.responderName.toLowerCase().includes(search) ||
        l.logDescription.toLowerCase().includes(search)
    );
  }

  if (status && status !== "all") {
    filtered = filtered.filter((l) => l.status === status);
  }

  return NextResponse.json(filtered);
}
