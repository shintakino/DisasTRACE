import crypto from 'crypto';
import { and, gte } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { verificationRequests } from '@/db/schema/verification_requests';
import { autoDispatchIncident } from '@/lib/dispatch-engine';

const IncidentTypeSchema = z.enum([
  'Medical Emergency',
  'Vehicular Collision',
  'Fire Emergency',
  'Structural Failure',
  'Flood/Water',
  'Unknown Cause',
]);

export const EmergencyIntakeSchema = z.object({
  contactNumber: z.string()
    .trim()
    .transform((value) => value.replace(/[\s()-]/g, ''))
    .refine((value) => /^(?:\+63|0)9\d{9}$/.test(value), {
      message: 'Use a valid Philippine mobile number, such as 09171234567 or +639171234567.',
    }),
  incidentType: IncidentTypeSchema,
  peopleInvolved: z.coerce.number().int().min(1).max(999),
  landmarks: z.string().trim().min(5).max(600),
  victimCondition: z.string().trim().min(2).max(160),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  nature: z.enum(['EMERGENCY', 'NON-EMERGENCY']),
  imageUrl: z.string().url(),
});

// Registered residents authenticate before intake, so their callback number is
// always taken from the verified account record rather than from device input.
export const RegisteredEmergencyIntakeSchema = EmergencyIntakeSchema.omit({
  contactNumber: true,
});

export type EmergencyIntake = z.infer<typeof EmergencyIntakeSchema>;
export type TriageClassification = 'HIGH_CONFIDENCE_EMERGENCY' | 'HIGH_CONFIDENCE_NON_EMERGENCY' | 'UNCERTAIN_INCOMPLETE' | 'SUSPICIOUS_POSSIBLE_PRANK';

interface IntakeActor {
  residentId: string | null;
  reporterType: 'REGISTERED' | 'GUEST';
}

function isWithinBaliwag(latitude: number, longitude: number) {
  return latitude >= 14.9 && latitude <= 15.05 && longitude >= 120.8 && longitude <= 121;
}

function isConsistent(input: EmergencyIntake) {
  if (input.nature === 'NON-EMERGENCY') return true;
  return input.peopleInvolved > 0 && input.incidentType !== 'Unknown Cause' && input.victimCondition !== 'Unknown / cannot assess';
}

export async function submitEmergencyIntake(input: EmergencyIntake, actor: IntakeActor) {
  const recentReports = await db.query.verificationRequests.findMany({
    where: and(gte(verificationRequests.createdAt, new Date(Date.now() - 20 * 60 * 1000))),
    columns: { latitude: true, longitude: true, type: true, contactNumber: true },
  });

  const nearbyDuplicate = recentReports.some((report) =>
    report.type === input.incidentType &&
    Math.abs(report.latitude - input.latitude) < 0.0015 &&
    Math.abs(report.longitude - input.longitude) < 0.0015
  );
  const repeatedContact = recentReports.filter((report) => report.contactNumber === input.contactNumber).length >= 2;
  const reasons: string[] = [];
  const validGps = isWithinBaliwag(input.latitude, input.longitude);
  const consistent = isConsistent(input);

  if (!validGps) reasons.push('GPS location is outside the Baliwag service area.');
  if (!consistent) reasons.push('The incident answers need clarification.');
  if (nearbyDuplicate) reasons.push('A similar report was submitted nearby in the last 20 minutes.');
  if (repeatedContact) reasons.push('This contact number has repeated recent submissions.');

  let triageClassification: TriageClassification;
  if (nearbyDuplicate || repeatedContact) {
    triageClassification = 'SUSPICIOUS_POSSIBLE_PRANK';
  } else if (!validGps || !consistent) {
    triageClassification = 'UNCERTAIN_INCOMPLETE';
  } else if (input.nature === 'NON-EMERGENCY') {
    triageClassification = 'HIGH_CONFIDENCE_NON_EMERGENCY';
  } else {
    triageClassification = 'HIGH_CONFIDENCE_EMERGENCY';
  }

  const requestId = `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const guestAccessToken = actor.reporterType === 'GUEST' ? crypto.randomBytes(32).toString('hex') : null;
  const [request] = await db.insert(verificationRequests).values({
    id: crypto.randomUUID(),
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
    locationDescription: `${input.landmarks}\nCondition: ${input.victimCondition}`,
    latitude: input.latitude,
    longitude: input.longitude,
    imageUrl: input.imageUrl,
    triageClassification,
    triageReasons: reasons,
  }).returning();

  let incident = null;
  if (triageClassification === 'HIGH_CONFIDENCE_EMERGENCY') {
    incident = await autoDispatchIncident(request.id, actor.residentId, input.latitude, input.longitude);
  }

  return { request, incident, guestAccessToken, autoDispatched: Boolean(incident) };
}
