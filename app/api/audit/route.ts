import { NextResponse } from "next/server";
import { AuditLogEntry } from "@/types/audit";

// Mock data for audit logs
const mockLogs: AuditLogEntry[] = [
  {
    id: "LOG-001",
    userName: "Guanzing, Toper",
    action: "Accepted Ambulance Dispatch DR-2026-0047",
    contextPath: "Home > Notifications > CDRRMO Updates",
    timestamp: "2026-03-21T09:43:00Z",
    date: "21 March 2026",
    time: "09:43 AM",
  },
  {
    id: "LOG-002",
    userName: "Dela Cruz, Juan",
    action: "Modified User Role: Responder -> Admin",
    contextPath: "Admin > User Management > Permissions",
    timestamp: "2026-03-21T10:15:00Z",
    date: "21 March 2026",
    time: "10:15 AM",
  },
  {
    id: "LOG-003",
    userName: "Santos, Maria",
    action: "Exported Incident Report IR-2026-012",
    contextPath: "Home > Reports > Detailed View",
    timestamp: "2026-03-21T11:30:00Z",
    date: "21 March 2026",
    time: "11:30 AM",
  },
  {
    id: "LOG-004",
    userName: "Guanzing, Toper",
    action: "Updated Responder Status: Off-Duty",
    contextPath: "Home > Roster > Attendance",
    timestamp: "2026-03-21T13:45:00Z",
    date: "21 March 2026",
    time: "01:45 PM",
  },
  {
    id: "LOG-005",
    userName: "Admin, System",
    action: "Created New User Account: test_responder_01",
    contextPath: "Admin > User Management > Registration",
    timestamp: "2026-03-21T14:20:00Z",
    date: "21 March 2026",
    time: "02:20 PM",
  },
  {
    id: "LOG-006",
    userName: "Dela Cruz, Juan",
    action: "Resolved Incident IR-2026-010",
    contextPath: "Home > Map > Incident Detail",
    timestamp: "2026-03-21T15:10:00Z",
    date: "21 March 2026",
    time: "03:10 PM",
  },
  {
    id: "LOG-007",
    userName: "Santos, Maria",
    action: "Assigned Fire Truck FT-02 to IR-2026-015",
    contextPath: "Home > Notifications > Dispatch",
    timestamp: "2026-03-21T16:05:00Z",
    date: "21 March 2026",
    time: "04:05 PM",
  },
  {
    id: "LOG-008",
    userName: "Guanzing, Toper",
    action: "Viewed Security Audit Logs",
    contextPath: "Admin > Security > Audit",
    timestamp: "2026-03-21T16:55:00Z",
    date: "21 March 2026",
    time: "04:55 PM",
  }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.toLowerCase();
  
  let filteredLogs = [...mockLogs];
  
  if (query) {
    filteredLogs = filteredLogs.filter(log => 
      log.userName.toLowerCase().includes(query) || 
      log.action.toLowerCase().includes(query)
    );
  }
  
  return NextResponse.json(filteredLogs);
}
