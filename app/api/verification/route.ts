import { NextRequest, NextResponse } from "next/server";
import { VerificationRequest } from "@/types/verification";

const mockVerificationRequests: VerificationRequest[] = [
  {
    id: "vr-1",
    requestId: "REQ-2026-0047",
    status: "PENDING",
    nature: "EMERGENCY",
    type: "Fire Emergency",
    location: "123 Brgy. Sabang, Baliwag City",
    peopleInvolved: 2,
    receivedAt: new Date(Date.now() - 2000).toISOString(),
    imageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=800",
    resident: {
      id: "res-1",
      fullName: "Dela Cruz, Juan",
      phone: "+63 912 345 6789",
      address: "Brgy. Sabang, Baliwag City",
      priorReports: 3,
      isVerified: true,
    },
  },
  {
    id: "vr-2",
    requestId: "REQ-2026-0048",
    status: "PENDING",
    nature: "EMERGENCY",
    type: "Vehicular Collision",
    location: "Brgy. Bagong Nayon, Baliwag City",
    peopleInvolved: 4,
    receivedAt: new Date(Date.now() - 60000).toISOString(),
    resident: {
      id: "res-2",
      fullName: "Santos, Maria",
      phone: "+63 912 987 6543",
      address: "Brgy. Bagong Nayon, Baliwag City",
      priorReports: 0,
      isVerified: false,
    },
  },
  {
    id: "vr-3",
    requestId: "REQ-2026-0049",
    status: "VERIFIED",
    nature: "EMERGENCY",
    type: "Medical Emergency",
    location: "Brgy. Poblacion, Baliwag City",
    peopleInvolved: 1,
    receivedAt: new Date(Date.now() - 3600000).toISOString(),
    resident: {
      id: "res-3",
      fullName: "Reyes, Antonio",
      phone: "+63 912 111 2222",
      address: "Brgy. Poblacion, Baliwag City",
      priorReports: 5,
      isVerified: true,
    },
  },
];

export async function GET(req: NextRequest) {
  // In a real app, we'd check for PACC Admin role here
  return NextResponse.json(mockVerificationRequests);
}
