import { NextResponse } from 'next/server';
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { incidents } from "@/db/schema/incidents";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { isResponderHeartbeatFresh } from "@/lib/dispatch-policy";

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

    // `ACTIVE_DISPATCH` is intentionally used for both a short-lived offer
    // reservation and a responder who accepted an incident. Resolve the real
    // workflow state from the incident record instead of treating both alike.
    const activeIncidents = await db.query.incidents.findMany({
      columns: {
        responderId: true,
        currentOfferResponderId: true,
        status: true,
      },
    });
    const acceptedResponderIds = new Set(
      activeIncidents
        .filter((incident) => incident.responderId && incident.status !== 'RESOLVED')
        .map((incident) => incident.responderId as string),
    );
    const pendingOfferResponderIds = new Set(
      activeIncidents
        .filter((incident) => (
          incident.status === 'DISPATCHED'
          && incident.responderId === null
          && incident.currentOfferResponderId
        ))
        .map((incident) => incident.currentOfferResponderId as string),
    );

    const mapped = dbResponders.map((r) => {
      const isRecent = isResponderHeartbeatFresh(r.lastLocationUpdatedAt);

      let statusMapped: 'OFFER PENDING' | 'DISPATCHED' | 'STANDBY' | 'OFF DUTY' = 'OFF DUTY';
      if (r.dutyStatus === 'ACTIVE_DISPATCH') {
        statusMapped = acceptedResponderIds.has(r.id)
          ? 'DISPATCHED'
          : pendingOfferResponderIds.has(r.id)
            ? 'OFFER PENDING'
            : 'OFF DUTY';
      } else if (r.dutyStatus === 'ON_DUTY') {
        statusMapped = isRecent ? 'STANDBY' : 'OFF DUTY';
      }

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
