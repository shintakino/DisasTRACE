import { NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth';
import { RosterEntrySchema } from '@/types/roster';
import { db } from '@/db';
import { users } from '@/db/schema/users';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export async function GET() {
  const role = await getUserRole();

  if (role !== 'cdrrmo_super_admin') {
    return NextResponse.json({ 
      error: 'Unauthorized', 
      message: `Access denied. This endpoint requires "cdrrmo_super_admin" role, but your session has "${role}".`,
      currentRole: role 
    }, { status: 403 });
  }

  try {
    // Query users that are ambulance responders
    const dbResponders = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(eq(users.role, "ambulance_responder"));

    const mapped = dbResponders.map((r) => {
      // Map user status ("ACTIVE", "SUSPENDED", "DEACTIVATED", "PENDING") to RosterStatusSchema ("ACTIVE", "DEACTIVATED", "SUSPENDED")
      let mappedStatus: "ACTIVE" | "DEACTIVATED" | "SUSPENDED" = "DEACTIVATED";
      if (r.status === "ACTIVE") {
        mappedStatus = "ACTIVE";
      } else if (r.status === "SUSPENDED") {
        mappedStatus = "SUSPENDED";
      }

      return {
        id: r.id,
        fullName: r.fullName,
        email: r.email,
        role: "RESPONDER",
        status: mappedStatus,
      };
    });

    const validatedData = z.array(RosterEntrySchema).parse(mapped);

    return NextResponse.json({ data: validatedData });
  } catch (error) {
    console.error("Error in GET /api/roster:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';

