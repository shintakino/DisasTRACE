import { NextResponse } from 'next/server';
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";

// Helper function to extract initials from full name
function getInitials(name: string): string {
  if (!name) return "JD";
  
  if (name.includes(",")) {
    const parts = name.split(",").map(p => p.trim());
    const last = parts[0] || "";
    const first = parts[1] || "";
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  }
  
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) return tokens[0].substring(0, 2).toUpperCase();
  if (tokens.length > 1) {
    return `${tokens[0].charAt(0)}${tokens[tokens.length - 1].charAt(0)}`.toUpperCase();
  }
  return "JD";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user.app_metadata?.role;
    if (role !== 'cdrrmo_super_admin' && role !== 'pacc_admin') {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: `Access denied. Dashboard requires Admin privileges.`,
        currentRole: role 
      }, { status: 403 });
    }

    // Fetch live active responders from database
    const dbResponders = await db.query.users.findMany({
      where: and(
        eq(users.role, "ambulance_responder"),
        eq(users.status, "ACTIVE")
      ),
    });

    const mapped = dbResponders.map((r) => {
      let statusMapped: 'DISPATCHED' | 'STANDBY' | 'OFF DUTY' = 'OFF DUTY';
      if (r.dutyStatus === 'ACTIVE_DISPATCH') statusMapped = 'DISPATCHED';
      else if (r.dutyStatus === 'ON_DUTY') statusMapped = 'STANDBY';

      return {
        id: r.id,
        name: r.fullName,
        status: statusMapped,
        initials: getInitials(r.fullName),
      };
    });

    return NextResponse.json({ data: mapped });
  } catch (error) {
    console.error("Error in GET /api/dashboard/responders:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
