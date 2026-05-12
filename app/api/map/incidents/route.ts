import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MapIncidentSchema } from "@/types/map";
import { z } from "zod";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Mock data for incidents
  const incidents = [
    {
      id: "1",
      caseId: "DR-2026-0047",
      vehicleId: "AMB-001",
      status: "ONGOING",
      type: "Medical Emergency",
      origin: "CDRRMO HQ",
      destination: "Brgy. Sabang",
      lat: 14.9535,
      lng: 120.9105,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "2",
      caseId: "DR-2026-0048",
      vehicleId: "AMB-002",
      status: "NEW",
      type: "Vehicular Accident",
      origin: "CDRRMO HQ",
      destination: "Brgy. Tibag",
      lat: 14.9650,
      lng: 120.9000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "3",
      caseId: "DR-2026-0049",
      vehicleId: "AMB-003",
      status: "COMPLETED",
      type: "Fire Incident",
      origin: "CDRRMO HQ",
      destination: "Brgy. Poblacion",
      lat: 14.9500,
      lng: 120.8900,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const validatedData = z.array(MapIncidentSchema).parse(incidents);
  return NextResponse.json(validatedData);
}
