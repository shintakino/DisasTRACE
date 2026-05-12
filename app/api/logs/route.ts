import { NextResponse } from "next/server"
import { StatusLogEntry } from "@/types/logs"

const mockLogs: StatusLogEntry[] = [
  {
    id: "LOG-0001",
    timestamp: "2026-03-21T09:43:00Z",
    date: "21 March 2026",
    time: "09:43 AM",
    responderName: "Bastes, Renzy",
    logDescription: "Dispatched to DR-2026-0047",
    status: "DISPATCHED",
    action: "DISPATCHED",
  },
  {
    id: "LOG-0002",
    timestamp: "2026-03-21T09:30:00Z",
    date: "21 March 2026",
    time: "09:30 AM",
    responderName: "Dela Cruz, Juan",
    logDescription: "Shift started",
    status: "STANDBY",
    action: "STARTED",
  },
  {
    id: "LOG-0003",
    timestamp: "2026-03-21T09:15:00Z",
    date: "21 March 2026",
    time: "09:15 AM",
    responderName: "Santos, Maria",
    logDescription: "Returned from DR-2026-0044",
    status: "STANDBY",
    action: "COMPLETED",
  },
  {
    id: "LOG-0004",
    timestamp: "2026-03-21T08:50:00Z",
    date: "21 March 2026",
    time: "08:50 AM",
    responderName: "Bastes, Renzy",
    logDescription: "Arrived on scene DR-2026-0047",
    status: "ON-SCENE",
    action: "ARRIVED",
  },
  {
    id: "LOG-0005",
    timestamp: "2026-03-21T08:30:00Z",
    date: "21 March 2026",
    time: "08:30 AM",
    responderName: "Lopez, Antonio",
    logDescription: "Shift ended",
    status: "OFF-DUTY",
    action: "ENDED",
  },
  {
    id: "LOG-0006",
    timestamp: "2026-03-21T08:00:00Z",
    date: "21 March 2026",
    time: "08:00 AM",
    responderName: "Dela Cruz, Juan",
    logDescription: "Standby at HQ",
    status: "STANDBY",
    action: "NONE",
  },
  {
    id: "LOG-0007",
    timestamp: "2026-03-21T07:45:00Z",
    date: "21 March 2026",
    time: "07:45 AM",
    responderName: "Santos, Maria",
    logDescription: "Dispatched to DR-2026-0044",
    status: "DISPATCHED",
    action: "DISPATCHED",
  },
  {
    id: "LOG-0008",
    timestamp: "2026-03-21T07:30:00Z",
    date: "21 March 2026",
    time: "07:30 AM",
    responderName: "Lopez, Antonio",
    logDescription: "Shift started",
    status: "STANDBY",
    action: "STARTED",
  },
  {
    id: "LOG-0009",
    timestamp: "2026-03-21T07:15:00Z",
    date: "21 March 2026",
    time: "07:15 AM",
    responderName: "Bastes, Renzy",
    logDescription: "Shift started",
    status: "STANDBY",
    action: "STARTED",
  },
  {
    id: "LOG-0010",
    timestamp: "2026-03-21T07:00:00Z",
    date: "21 March 2026",
    time: "07:00 AM",
    responderName: "Santos, Maria",
    logDescription: "Shift started",
    status: "STANDBY",
    action: "STARTED",
  },
  {
    id: "LOG-0011",
    timestamp: "2026-03-21T06:45:00Z",
    date: "21 March 2026",
    time: "06:45 AM",
    responderName: "Dela Cruz, Juan",
    logDescription: "Returned from DR-2026-0043",
    status: "STANDBY",
    action: "COMPLETED",
  },
  {
    id: "LOG-0012",
    timestamp: "2026-03-21T06:15:00Z",
    date: "21 March 2026",
    time: "06:15 AM",
    responderName: "Dela Cruz, Juan",
    logDescription: "Arrived on scene DR-2026-0043",
    status: "ON-SCENE",
    action: "ARRIVED",
  },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.toLowerCase()
  const status = searchParams.get("status")

  let filteredLogs = [...mockLogs]

  if (search) {
    filteredLogs = filteredLogs.filter(
      (log) =>
        log.responderName.toLowerCase().includes(search) ||
        log.logDescription.toLowerCase().includes(search)
    )
  }

  if (status && status !== "ALL") {
    filteredLogs = filteredLogs.filter((log) => log.status === status)
  }

  // Return paginated and filtered logs
  return NextResponse.json(filteredLogs)
}
