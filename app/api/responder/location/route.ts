import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { hospitals } from "@/db/schema/hospitals";
import { auditLogs } from "@/db/schema/audit_logs";
import { and, eq, gte, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";
import { retryPendingAutomaticDispatches } from "@/lib/dispatch-engine";
import { assessResponderLocationMovement } from "@/lib/location-integrity";
import { shouldAutomaticallyMarkArrived } from "@/lib/arrival-geofence";

const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().finite().min(0).max(1000).nullable().optional(),
  isMockedLocation: z.boolean().optional().default(false),
  responderStatus: z.enum(['en_route', 'on_scene', 'to_hospital', 'report_filling']).optional(),
  incidentId: z.string().min(1).max(50).optional().nullable(),
  targetHospitalId: z.string().min(1).max(50).optional().nullable(),
  confirmHospitalArrival: z.boolean().optional().default(false),
});

function isPersistableHospitalDestination(hospital: {
  id: string;
  caters: boolean;
  lat: number;
  lng: number;
} | undefined): hospital is {
  id: string;
  caters: true;
  lat: number;
  lng: number;
} {
  return Boolean(
    hospital
      && hospital.id.trim().length > 0
      && hospital.caters === true
      && Number.isFinite(hospital.lat)
      && hospital.lat >= -90
      && hospital.lat <= 90
      && Number.isFinite(hospital.lng)
      && hospital.lng >= -180
      && hospital.lng <= 180,
  );
}

async function recordLocationIntegrityEvent(input: {
  userId: string;
  action: 'RESPONDER_MOCK_LOCATION_REJECTED' | 'RESPONDER_IMPLAUSIBLE_LOCATION_HELD';
  details: Record<string, number | string>;
}) {
  // Limit repeat events so a bad location stream cannot flood the audit trail.
  const recent = await db.query.auditLogs.findFirst({
    where: and(
      eq(auditLogs.userId, input.userId),
      eq(auditLogs.action, input.action),
      gte(auditLogs.createdAt, new Date(Date.now() - 60_000)),
    ),
    columns: { id: true },
  });
  if (recent) return;

  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    userId: input.userId,
    action: input.action,
    entityType: 'RESPONDER_LOCATION',
    entityId: input.userId,
    details: input.details,
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user role
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (
      !dbUser
      || dbUser.role !== 'ambulance_responder'
      || dbUser.status !== 'ACTIVE'
      || dbUser.verificationStatus !== 'APPROVED'
    ) {
      return NextResponse.json({ error: "Forbidden: Responder access required" }, { status: 403 });
    }

    const body = await req.json();
    const result = LocationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid parameters", details: result.error.format() }, { status: 400 });
    }

    const { latitude, longitude, accuracy, isMockedLocation, responderStatus, incidentId, targetHospitalId } = result.data;

    if (isMockedLocation) {
      await recordLocationIntegrityEvent({
        userId: user.id,
        action: 'RESPONDER_MOCK_LOCATION_REJECTED',
        details: { source: 'android_mock_provider' },
      });
      return NextResponse.json({
        error: 'Mock location rejected',
        message: 'Turn off the device mock-location provider before sharing responder GPS.',
      }, { status: 422 });
    }

    let verifiedTransportContext: {
      incidentId: string;
      hospitalId: string;
      transportStartedAt: Date | null;
      transportArrivedAt: Date | null;
      transportStatus: 'NONE' | 'TO_HOSPITAL' | 'ARRIVED_AT_HOSPITAL';
      hospitalLatitude: number;
      hospitalLongitude: number;
    } | null = null;
    let transportValidationError: {
      status: 409 | 422;
      body: { error: string; code: string; message: string };
    } | null = null;

    if (responderStatus === 'to_hospital') {
      if (!incidentId || !targetHospitalId) {
        transportValidationError = {
          status: 422,
          body: {
            error: 'Hospital destination required',
            code: 'HOSPITAL_DESTINATION_REQUIRED',
            message: 'Select a configured emergency-receiving hospital for the active incident before transport can begin.',
          },
        };
      } else {
        const [hospital, activeIncident] = await Promise.all([
          db.query.hospitals.findFirst({ where: eq(hospitals.id, targetHospitalId) }),
          db.query.incidents.findFirst({
            where: and(
              eq(incidents.id, incidentId),
              eq(incidents.responderId, user.id),
              eq(incidents.status, 'ARRIVED'),
            ),
          }),
        ]);

        if (!isPersistableHospitalDestination(hospital)) {
          transportValidationError = {
            status: 422,
            body: {
              error: 'Hospital destination unavailable',
              code: 'HOSPITAL_DESTINATION_UNAVAILABLE',
              message: 'That hospital is not configured to receive emergency transports. Contact PACC or select another available destination.',
            },
          };
        } else if (!activeIncident) {
          transportValidationError = {
            status: 409,
            body: {
              error: 'Transport is not ready',
              code: 'TRANSPORT_NOT_READY',
              message: 'Arrival at the incident scene must be confirmed before hospital transport can begin.',
            },
          };
        } else {
          verifiedTransportContext = {
            incidentId: activeIncident.id,
            hospitalId: hospital.id,
            transportStartedAt: activeIncident.transportStartedAt,
            transportArrivedAt: activeIncident.transportArrivedAt,
            transportStatus: activeIncident.transportStatus,
            hospitalLatitude: hospital.lat,
            hospitalLongitude: hospital.lng,
          };
        }
      }
    }

    const observedAt = new Date();
    const movement = assessResponderLocationMovement({
      previousLatitude: dbUser.lastLatitude,
      previousLongitude: dbUser.lastLongitude,
      previousUpdatedAt: dbUser.lastLocationUpdatedAt,
      latitude,
      longitude,
      observedAt,
    });
    if (!movement.plausible) {
      await recordLocationIntegrityEvent({
        userId: user.id,
        action: 'RESPONDER_IMPLAUSIBLE_LOCATION_HELD',
        details: {
          distanceMeters: Math.round(movement.distanceMeters),
          elapsedSeconds: Math.round(movement.elapsedSeconds),
        },
      });
      return NextResponse.json({
        success: false,
        held: true,
        message: 'This location update was held because it would require implausible travel. The last trusted responder position remains in use.',
      }, { status: 202 });
    }

    // Cache telemetry in the users table (including PostGIS geometry for spatial queries)
    await db.update(users)
      .set({
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastLocationAccuracy: accuracy ?? null,
        lastLocationUpdatedAt: observedAt,
        updatedAt: observedAt,
        locationGeom: sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`,
      })
      .where(eq(users.id, user.id));

    // A destination/state error must not suppress otherwise trusted responder
    // telemetry. Cache the heartbeat first, then return the actionable context.
    if (transportValidationError) {
      return NextResponse.json(transportValidationError.body, { status: transportValidationError.status });
    }

    let autoArrivedIncidentId: string | null = null;
    let autoArrivedHospitalIncidentId: string | null = null;
    if (accuracy !== undefined && accuracy !== null) {
      const [activeResponse] = await db
        .select({
          incidentId: incidents.id,
          incidentCreatedAt: incidents.createdAt,
          incidentLatitude: verificationRequests.latitude,
          incidentLongitude: verificationRequests.longitude,
        })
        .from(incidents)
        .innerJoin(verificationRequests, eq(verificationRequests.id, incidents.requestId))
        .where(and(eq(incidents.responderId, user.id), eq(incidents.status, 'EN_ROUTE')))
        .limit(1);
      if (activeResponse && shouldAutomaticallyMarkArrived({
        incidentLatitude: activeResponse.incidentLatitude,
        incidentLongitude: activeResponse.incidentLongitude,
        incidentCreatedAt: activeResponse.incidentCreatedAt,
        previous: {
          latitude: dbUser.lastLatitude,
          longitude: dbUser.lastLongitude,
          accuracy: dbUser.lastLocationAccuracy,
          observedAt: dbUser.lastLocationUpdatedAt,
        },
        current: { latitude, longitude, accuracy, observedAt },
      })) {
        const [arrived] = await db.update(incidents)
          .set({ status: 'ARRIVED' })
          .where(and(
            eq(incidents.id, activeResponse.incidentId),
            eq(incidents.responderId, user.id),
            eq(incidents.status, 'EN_ROUTE'),
          ))
          .returning({ id: incidents.id });
        autoArrivedIncidentId = arrived?.id ?? null;
      }
    }

    const automaticHospitalArrival = Boolean(
      verifiedTransportContext
      && verifiedTransportContext.transportStartedAt
      && verifiedTransportContext.transportStatus !== 'ARRIVED_AT_HOSPITAL'
      && accuracy !== undefined
      && accuracy !== null
      && shouldAutomaticallyMarkArrived({
        incidentLatitude: verifiedTransportContext.hospitalLatitude,
        incidentLongitude: verifiedTransportContext.hospitalLongitude,
        incidentCreatedAt: verifiedTransportContext.transportStartedAt,
        previous: {
          latitude: dbUser.lastLatitude,
          longitude: dbUser.lastLongitude,
          accuracy: dbUser.lastLocationAccuracy,
          observedAt: dbUser.lastLocationUpdatedAt,
        },
        current: { latitude, longitude, accuracy, observedAt },
      })
    );

    // A transport destination must survive responder/public app backgrounding.
    // Location heartbeats are the authenticated responder channel already used
    // during the trip, so persist only the active responder's transport context.
    if (verifiedTransportContext) {
      const transportPersistence = await db.transaction(async (tx) => {
        const [currentHospital] = await tx.select({
          id: hospitals.id,
          caters: hospitals.caters,
          lat: hospitals.lat,
          lng: hospitals.lng,
        })
          .from(hospitals)
          .where(eq(hospitals.id, verifiedTransportContext.hospitalId))
          .for('share');
        if (!isPersistableHospitalDestination(currentHospital)) {
          return 'hospital_unavailable' as const;
        }

        const hospitalArrivalConfirmed = result.data.confirmHospitalArrival
          || automaticHospitalArrival
          || verifiedTransportContext.transportStatus === 'ARRIVED_AT_HOSPITAL';
        const [transported] = await tx.update(incidents)
          .set({
            transportStatus: hospitalArrivalConfirmed ? 'ARRIVED_AT_HOSPITAL' : 'TO_HOSPITAL',
            transportHospitalId: currentHospital.id,
            transportStartedAt: verifiedTransportContext.transportStartedAt ?? observedAt,
            transportArrivedAt: hospitalArrivalConfirmed
              ? (verifiedTransportContext.transportArrivedAt ?? observedAt)
              : null,
          })
          .where(and(
            eq(incidents.id, verifiedTransportContext.incidentId),
            eq(incidents.responderId, user.id),
            eq(incidents.status, 'ARRIVED'),
          ))
          .returning({ id: incidents.id, transportStatus: incidents.transportStatus });
        return transported ? { kind: 'persisted' as const, incident: transported } : { kind: 'state_changed' as const };
      });

      if (transportPersistence === 'hospital_unavailable') {
        return NextResponse.json({
          error: 'Hospital destination unavailable',
          code: 'HOSPITAL_DESTINATION_UNAVAILABLE',
          message: 'That hospital became unavailable. Contact PACC or select another available destination.',
        }, { status: 422 });
      }
      if (transportPersistence.kind === 'state_changed') {
        return NextResponse.json({
          error: 'Transport is no longer available',
          code: 'TRANSPORT_STATE_CHANGED',
          message: 'The active incident changed before hospital transport could be saved. Refresh the dispatch before continuing.',
        }, { status: 409 });
      }
      if (transportPersistence.kind === 'persisted' && automaticHospitalArrival) {
        autoArrivedHospitalIncidentId = transportPersistence.incident.id;
      }
    }

    if (dbUser.dutyStatus === 'ON_DUTY') {
      await retryPendingAutomaticDispatches();
    }

    return NextResponse.json({
      success: true,
      message: autoArrivedIncidentId
        ? 'Responder telemetry cached and arrival confirmed.'
        : 'Responder telemetry successfully cached.',
      autoArrivedIncidentId,
      autoArrivedHospitalIncidentId,
    });
  } catch (error) {
    console.error("Error in responder location cache API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
