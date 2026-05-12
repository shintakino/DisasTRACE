import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MapResponderSchema } from "@/types/map";
import { z } from "zod";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Mock data for responders
  const responders = [
    {
      id: "resp-1",
      vehicleId: "AMB-001",
      status: "DISPATCHED",
      lat: 14.9535,
      lng: 120.9105,
      heading: 45,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "resp-2",
      vehicleId: "AMB-002",
      status: "DISPATCHED",
      lat: 14.9650,
      lng: 120.9000,
      heading: 180,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "resp-3",
      vehicleId: "AMB-003",
      status: "AVAILABLE",
      lat: 14.9500,
      lng: 120.8900,
      heading: 90,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "resp-4",
      vehicleId: "AMB-004",
      status: "AVAILABLE",
      lat: 14.9580,
      lng: 120.9050,
      heading: 270,
      lastUpdated: new Date().toISOString(),
    },
  ];

  const validatedData = z.array(MapResponderSchema).parse(responders);
  return NextResponse.json(validatedData);
}
