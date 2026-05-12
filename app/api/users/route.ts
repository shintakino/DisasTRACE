import { NextResponse } from "next/server";
import { UserManagementEntry } from "@/types/users";

const mockUsers: UserManagementEntry[] = [
  {
    id: "1",
    fullName: "Bastes, Renzy",
    email: "renzy.bastes@example.com",
    status: "ACTIVE",
    role: "pacc_admin",
    joinedDate: "March 25, 2025",
    lastActive: "Active now",
  },
  {
    id: "2",
    fullName: "Dela Cruz, Juan",
    email: "juan.delacruz@example.com",
    status: "ACTIVE",
    role: "ambulance_responder",
    joinedDate: "January 10, 2025",
    lastActive: "15 minutes ago",
  },
  {
    id: "3",
    fullName: "Santos, Maria",
    email: "maria.santos@example.com",
    status: "SUSPENDED",
    role: "public_user",
    joinedDate: "February 15, 2025",
    lastActive: "10 days ago",
  },
  {
    id: "4",
    fullName: "Reyes, Antonio",
    email: "antonio.reyes@example.com",
    status: "DEACTIVATED",
    role: "ambulance_responder",
    joinedDate: "November 20, 2024",
    lastActive: "1 month ago",
  },
  {
    id: "5",
    fullName: "Gomez, Elena",
    email: "elena.gomez@example.com",
    status: "ACTIVE",
    role: "public_user",
    joinedDate: "April 02, 2025",
    lastActive: "2 hours ago",
  },
  {
    id: "6",
    fullName: "Torres, Ricardo",
    email: "ricardo.torres@example.com",
    status: "PENDING",
    role: "ambulance_responder",
    joinedDate: "May 10, 2026",
    lastActive: "Never",
  },
];

export async function GET() {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return NextResponse.json({
    users: mockUsers,
    summary: {
      total: mockUsers.length,
      active: mockUsers.filter((u) => u.status === "ACTIVE").length,
      suspended: mockUsers.filter((u) => u.status === "SUSPENDED").length,
      deactivated: mockUsers.filter((u) => u.status === "DEACTIVATED").length,
    },
  });
}
