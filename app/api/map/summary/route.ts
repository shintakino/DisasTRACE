import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MapSummarySchema } from "@/types/map";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // In a real app, this would fetch from Supabase
  const summary = {
    new: 5,
    ongoing: 3,
    completed: 12,
    standby: 8,
  };

  const validatedData = MapSummarySchema.parse(summary);
  return NextResponse.json(validatedData);
}
