import crypto from 'crypto';
import { and, eq, gte } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { verificationRequests } from '@/db/schema/verification_requests';
import { incidents } from '@/db/schema/incidents';
import { autoDispatchIncident } from '@/lib/dispatch-engine';
import { ChatbotSubmissionIdSchema } from '@/lib/chatbot/contracts';
import { INCIDENT_DEDUPLICATION_RADIUS_METERS, INCIDENT_DEDUPLICATION_WINDOW_MS, isLikelyDuplicateIncident } from '@/lib/incident-deduplication';
import { isWithinOfficialBaliwagBoundary, resolveBaliwagBarangay } from '@/lib/barangay-boundaries';
import { systemSettings } from '@/db/schema/system_settings';

const IncidentTypeSchema = z.enum([
  'Medical Emergency',
  'Vehicular Collision',
  'Fire Emergency',
  'Structural Failure',
  'Flood/Water',
  'Unknown Cause',
]);

const ContactNumberSchema = z.string()
    .trim()
    .transform((value) => value.replace(/[\s()-]/g, ''))
    .refine((value) => /^(?:\+63|0)9\d{9}$/.test(value), {
      message: 'Use a valid Philippine mobile number, such as 09171234567 or +639171234567.',
    });

const IntakeDetailsSchema = z.object({
  incidentType: IncidentTypeSchema,
  peopleInvolved: z.coerce.number().int().min(1).max(999),
  landmarks: z.string().trim().max(600).optional().default(''),
  victimCondition: z.string().trim().min(2).max(160),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  photoLatitude: z.number().finite().min(-90).max(90).optional(),
  photoLongitude: z.number().finite().min(-180).max(180).optional(),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  nature: z.enum(['EMERGENCY', 'NON-EMERGENCY']),
  imageUrl: z.string().url(),
  // Set only by the chatbot client. Reusing it makes a retry return the first
  // persisted request instead of creating another report or dispatch.
  chatbotSubmissionId: ChatbotSubmissionIdSchema.optional(),
});

// Guest reporters must provide a landmark because GPS is the only location
// context available to responders without an account profile.
export const EmergencyIntakeSchema = IntakeDetailsSchema.extend({
  contactNumber: ContactNumberSchema,
  landmarks: z.string().trim().min(5).max(600),
}).refine(({ photoLatitude, photoLongitude }) => (photoLatitude === undefined) === (photoLongitude === undefined), {
  message: 'Photo GPS coordinates must include both latitude and longitude.',
  path: ['photoLatitude'],
}).refine(({ latitude, longitude }) => isWithinBaliwag(latitude, longitude), {
  message: 'Reports must be submitted from inside the Baliwag City service area.',
  path: ['latitude'],
});

// Registered residents authenticate before intake, so their callback number is
// always taken from the verified account record rather than from device input.
export const RegisteredEmergencyIntakeSchema = IntakeDetailsSchema.extend({
  landmarks: z.string().trim().max(600).optional().default(''),
}).refine(({ photoLatitude, photoLongitude }) => (photoLatitude === undefined) === (photoLongitude === undefined), {
  message: 'Photo GPS coordinates must include both latitude and longitude.',
  path: ['photoLatitude'],
}).refine(({ latitude, longitude }) => isWithinBaliwag(latitude, longitude), {
  message: 'Reports must be submitted from inside the Baliwag City service area.',
  path: ['latitude'],
});

export const RegisteredEmergencyIntakeSubmissionSchema = IntakeDetailsSchema.extend({
  contactNumber: ContactNumberSchema,
}).refine(({ photoLatitude, photoLongitude }) => (photoLatitude === undefined) === (photoLongitude === undefined), {
  message: 'Photo GPS coordinates must include both latitude and longitude.',
  path: ['photoLatitude'],
}).refine(({ latitude, longitude }) => isWithinBaliwag(latitude, longitude), {
  message: 'Reports must be submitted from inside the Baliwag City service area.',
  path: ['latitude'],
});

export const GuestEmergencyIntakeSchema = EmergencyIntakeSchema;

export type EmergencyIntake = z.infer<typeof RegisteredEmergencyIntakeSubmissionSchema>;
export type TriageClassification = 'HIGH_CONFIDENCE_EMERGENCY' | 'HIGH_CONFIDENCE_NON_EMERGENCY' | 'UNCERTAIN_INCOMPLETE' | 'SUSPICIOUS_POSSIBLE_PRANK';

interface IntakeActor {
  residentId: string | null;
  reporterType: 'REGISTERED' | 'GUEST';
}

async function loadChatbotReplay(input: EmergencyIntake, actor: IntakeActor) {
  if (!input.chatbotSubmissionId) return null;
  const existing = await db.query.verificationRequests.findFirst({
    where: eq(verificationRequests.id, input.chatbotSubmissionId),
  });
  if (!existing) return null;
  const belongsToActor = actor.reporterType === 'REGISTERED'
    ? existing.reporterType === 'REGISTERED' && existing.residentId === actor.residentId
    : existing.reporterType === 'GUEST' && existing.contactNumber === input.contactNumber;
  if (!belongsToActor) throw new Error('This chatbot submission ID is already in use.');
  const incident = await db.query.incidents.findFirst({ where: eq(incidents.requestId, existing.id) });
  return {
    request: existing,
    incident: incident ?? null,
    guestAccessToken: existing.guestAccessToken,
    autoDispatched: Boolean(incident),
    replayed: true,
  };
}

export function isWithinBaliwag(latitude: number, longitude: number) {
  return isWithinOfficialBaliwagBoundary(latitude, longitude);
}

function isConsistent(input: EmergencyIntake) {
  if (input.nature === 'NON-EMERGENCY') return true;
  return input.peopleInvolved > 0 && input.incidentType !== 'Unknown Cause' && input.victimCondition !== 'Unknown / cannot assess';
}

export async function submitEmergencyIntake(input: EmergencyIntake, actor: IntakeActor) {
  // The mobile chatbot selector contains only the existing emergency types.
  // Keep free-text patient-transport classification as the one supported
  // non-emergency exception, but never allow a fire, collision, flood, or
  // structural report to be downgraded by a client-supplied toggle.
  const normalizedInput: EmergencyIntake = input.incidentType === 'Medical Emergency'
    ? input
    : { ...input, nature: 'EMERGENCY' };
  input = normalizedInput;
  const existingReplay = await loadChatbotReplay(input, actor);
  if (existingReplay) return existingReplay;

  const recentReports = await db.query.verificationRequests.findMany({
    where: and(gte(verificationRequests.createdAt, new Date(Date.now() - INCIDENT_DEDUPLICATION_WINDOW_MS))),
    columns: { latitude: true, longitude: true, type: true, contactNumber: true },
  });
  const settings = await db.query.systemSettings.findFirst({ where: eq(systemSettings.id, 'current'), columns: { deduplicationRadiusMeters: true } });
  const deduplicationRadiusMeters = settings?.deduplicationRadiusMeters ?? INCIDENT_DEDUPLICATION_RADIUS_METERS;

  const nearbyDuplicate = recentReports.some((report) => isLikelyDuplicateIncident(
    { type: input.incidentType, latitude: input.latitude, longitude: input.longitude },
    report, deduplicationRadiusMeters,
  ));
  const repeatedContact = recentReports.filter((report) => report.contactNumber === input.contactNumber).length >= 2;
  const reasons: string[] = [];
  const barangay = resolveBaliwagBarangay(input.latitude, input.longitude);
  if (!barangay) {
    throw new Error('Reports must be submitted from inside the Baliwag City service area.');
  }
  const consistent = isConsistent(input);

  if (!consistent) reasons.push('The incident answers need clarification.');
  if (nearbyDuplicate) reasons.push('A similar report was submitted nearby in the last 20 minutes.');
  if (repeatedContact) reasons.push('This contact number has repeated recent submissions.');

  let triageClassification: TriageClassification;
  if (nearbyDuplicate || repeatedContact) {
    triageClassification = 'SUSPICIOUS_POSSIBLE_PRANK';
  } else if (!consistent) {
    triageClassification = 'UNCERTAIN_INCOMPLETE';
  } else if (input.nature === 'NON-EMERGENCY') {
    triageClassification = 'HIGH_CONFIDENCE_NON_EMERGENCY';
  } else {
    triageClassification = 'HIGH_CONFIDENCE_EMERGENCY';
  }

  const requestId = `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const guestAccessToken = actor.reporterType === 'GUEST' ? crypto.randomBytes(32).toString('hex') : null;
  let request: typeof verificationRequests.$inferSelect;
  try {
    [request] = await db.insert(verificationRequests).values({
      id: input.chatbotSubmissionId ?? crypto.randomUUID(),
      requestId,
      residentId: actor.residentId,
      reporterType: actor.reporterType,
      contactNumber: input.contactNumber,
      guestAccessToken,
      status: 'PENDING',
      nature: input.nature,
      type: input.incidentType,
      peopleInvolved: String(input.peopleInvolved),
      severity: input.severity,
      locationDescription: input.landmarks || null,
      barangay: barangay.name,
      barangayPsgcCode: barangay.psgcCode,
      latitude: input.latitude,
      longitude: input.longitude,
      photoLatitude: input.photoLatitude ?? null,
      photoLongitude: input.photoLongitude ?? null,
      imageUrl: input.imageUrl,
      triageClassification,
      triageReasons: reasons,
    }).returning();
  } catch (error) {
    // A concurrent retry can win after the first lookup. Re-read the exact
    // submission and return it; unrelated database errors still propagate.
    const concurrentReplay = await loadChatbotReplay(input, actor);
    if (concurrentReplay) return concurrentReplay;
    throw error;
  }

  let incident = null;
  if (triageClassification === 'HIGH_CONFIDENCE_EMERGENCY') {
    incident = await autoDispatchIncident(request.id, actor.residentId, input.latitude, input.longitude);
  }

  return { request, incident, guestAccessToken, autoDispatched: Boolean(incident), replayed: false };
}
