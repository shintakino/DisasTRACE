import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { mobileDeviceSessions, mobilePushTokens } from '@/db/schema';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

const ExpoPushResponseSchema = z.object({
  data: z.array(z.object({
    status: z.enum(['ok', 'error']),
    details: z.object({ error: z.string().optional() }).passthrough().optional(),
  }).passthrough()).min(1),
}).passthrough();

interface DispatchPushInput {
  responderId: string;
  incidentId: string;
  offerExpiresAt: Date | null;
  incidentType: string;
}

interface DispatchOfferExpiredPushInput {
  responderId: string;
  incidentId: string;
}

interface SystemAnnouncementPushInput {
  userId: string;
  title: string;
  body: string;
  broadcastId: string;
}

export type MobilePushDeliveryResult =
  | { eligible: false; accepted: false; reason: 'no_active_device' }
  | { eligible: true; accepted: true }
  | { eligible: true; accepted: false; reason: string };

function responderAlertSoundFor(incidentType: string) {
  const normalized = incidentType.toLocaleLowerCase('en-PH');
  if (normalized.includes('fire') || normalized.includes('explosion')) {
    return { channelId: 'responder-fire-alerts', sound: 'responder_fire_alert.wav' };
  }
  if (normalized.includes('medical')) {
    return { channelId: 'responder-medical-alerts', sound: 'responder_medical_alert.wav' };
  }
  if (normalized.includes('vehicular') || normalized.includes('collision') || normalized.includes('accident')) {
    return { channelId: 'responder-collision-alerts', sound: 'responder_collision_alert.wav' };
  }
  if (normalized.includes('flood') || normalized.includes('water')) {
    return { channelId: 'responder-flood-alerts', sound: 'responder_flood_alert.wav' };
  }
  return { channelId: 'responder-general-alerts', sound: 'responder_general_alert.wav' };
}

async function sendMobilePush(
  userId: string,
  payload: Record<string, unknown>,
) : Promise<MobilePushDeliveryResult> {
  const device = await db.query.mobilePushTokens.findFirst({
    where: eq(mobilePushTokens.userId, userId),
    columns: { pushToken: true, sessionId: true },
  });
  if (!device) return { eligible: false, accepted: false, reason: 'no_active_device' };
  const activeSession = await db.query.mobileDeviceSessions.findFirst({
    where: and(
      eq(mobileDeviceSessions.userId, userId),
      eq(mobileDeviceSessions.activeSessionId, device.sessionId),
    ),
    columns: { userId: true },
  });
  if (!activeSession) return { eligible: false, accepted: false, reason: 'no_active_device' };

  try {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ to: device.pushToken, ...payload }]),
      signal: AbortSignal.timeout(5_000),
    });
    const parsed = ExpoPushResponseSchema.safeParse(await response.json().catch(() => null));
    if (!response.ok || !parsed.success) {
      console.error('[Push] Expo rejected a mobile notification.', { userId, status: response.status });
      return { eligible: true, accepted: false, reason: `expo_http_${response.status}` };
    }
    if (parsed.data.data[0]?.details?.error === 'DeviceNotRegistered') {
      await db.delete(mobilePushTokens).where(eq(mobilePushTokens.pushToken, device.pushToken));
      return { eligible: true, accepted: false, reason: 'device_not_registered' };
    }
    if (parsed.data.data[0]?.status !== 'ok') {
      return { eligible: true, accepted: false, reason: parsed.data.data[0]?.details?.error ?? 'expo_rejected' };
    }
    return { eligible: true, accepted: true };
  } catch (error) {
    console.error('[Push] Mobile notification delivery failed.', { userId, error });
    return { eligible: true, accepted: false, reason: 'delivery_error' };
  }
}

/** Push delivery is advisory; offer ownership and expiry remain server-authoritative. */
export async function sendDispatchOfferPush({ responderId, incidentId, offerExpiresAt, incidentType }: DispatchPushInput) {
  const secondsRemaining = offerExpiresAt
    ? Math.max(1, Math.ceil((offerExpiresAt.getTime() - Date.now()) / 1000))
    : 30;
  const alert = responderAlertSoundFor(incidentType);
  await sendMobilePush(responderId, {
    title: 'Emergency Dispatch Offer',
    body: `${incidentType} dispatch offer is waiting. Open DisasTRACE immediately.`,
    sound: alert.sound,
    priority: 'high',
    channelId: alert.channelId,
    ttl: secondsRemaining,
    data: { kind: 'dispatch_offer', incidentId, emergencyType: incidentType },
  });
}

/** Tell the original responder that a server-authoritative offer expired. */
export async function sendDispatchOfferExpiredPush({ responderId, incidentId }: DispatchOfferExpiredPushInput) {
  await sendMobilePush(responderId, {
    title: 'Dispatch offer released',
    body: 'You did not accept this report in time. It was released for reassignment.',
    sound: 'default',
    priority: 'high',
    channelId: 'emergency-alerts',
    ttl: 60,
    data: { kind: 'dispatch_offer_expired', incidentId },
  });
}

/**
 * Announcement pushes are advisory. The linked inbox notification is created
 * atomically before this call, so an Expo outage cannot lose an official
 * notice and users can still read it when they reopen the app.
 */
export async function sendSystemAnnouncementPush({ userId, title, body, broadcastId }: SystemAnnouncementPushInput) {
  return sendMobilePush(userId, {
    title: `Announcement: ${title}`,
    body,
    sound: 'default',
    priority: 'high',
    channelId: 'announcements',
    data: {
      type: 'system_announcement',
      metadata: { broadcastId, category: 'system_notice' },
    },
  });
}
