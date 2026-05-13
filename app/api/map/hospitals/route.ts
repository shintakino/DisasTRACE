import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { MapHospitalSchema } from "@/types/map";
import { z } from "zod";

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Real Hospitals in Baliwag
  const hospitals = [
    {
      id: "hosp-1",
      name: "Baliuag District Hospital",
      address: "Brgy. Carpa Village, Baliwag",
      lat: 14.9576,
      lng: 120.8942,
    },
    {
      id: "hosp-2",
      name: "Castro Maternity Hospital and General Hospital",
      address: "B. Aquino Ave, Baliwag",
      lat: 14.9515,
      lng: 120.8988,
    },
    {
      id: "hosp-3",
      name: "ACE Medical Center - Baliwag",
      address: "Doña Remedios Trinidad Hwy, Baliwag",
      lat: 14.9664,
      lng: 120.9145,
    },
    {
      id: "hosp-4",
      name: "Rugay General Hospital",
      address: "Carpa Village, Baliwag",
      lat: 14.9531,
      lng: 120.9022,
    },
    {
      id: "hosp-5",
      name: "De Jesus Hospital",
      address: "Poblacion, Baliwag",
      lat: 14.9490,
      lng: 120.8895,
    },
  ];

  const validatedData = z.array(MapHospitalSchema).parse(hospitals);
  return NextResponse.json(validatedData);
}
