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
}

interface DispatchOfferExpiredPushInput {
  responderId: string;
  incidentId: string;
}

async function sendResponderPush(
  responderId: string,
  payload: Record<string, unknown>,
) {
  const device = await db.query.mobilePushTokens.findFirst({
    where: eq(mobilePushTokens.userId, responderId),
    columns: { pushToken: true, sessionId: true },
  });
  if (!device) return;
  const activeSession = await db.query.mobileDeviceSessions.findFirst({
    where: and(
      eq(mobileDeviceSessions.userId, responderId),
      eq(mobileDeviceSessions.activeSessionId, device.sessionId),
    ),
    columns: { userId: true },
  });
  if (!activeSession) return;

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
      console.error('[Push] Expo rejected a responder notification.', { responderId, status: response.status });
      return;
    }
    if (parsed.data.data[0]?.details?.error === 'DeviceNotRegistered') {
      await db.delete(mobilePushTokens).where(eq(mobilePushTokens.pushToken, device.pushToken));
    }
  } catch (error) {
    console.error('[Push] Responder notification delivery failed.', { responderId, error });
  }
}

/** Push delivery is advisory; offer ownership and expiry remain server-authoritative. */
export async function sendDispatchOfferPush({ responderId, incidentId, offerExpiresAt }: DispatchPushInput) {
  const secondsRemaining = offerExpiresAt
    ? Math.max(1, Math.ceil((offerExpiresAt.getTime() - Date.now()) / 1000))
    : 30;
  await sendResponderPush(responderId, {
    title: 'Emergency Dispatch Offer',
    body: 'An emergency dispatch offer is waiting. Open DisasTRACE immediately.',
    sound: 'default',
    priority: 'high',
    channelId: 'emergency-alerts',
    ttl: secondsRemaining,
    data: { kind: 'dispatch_offer', incidentId },
  });
}

/** Tell the original responder that a server-authoritative offer expired. */
export async function sendDispatchOfferExpiredPush({ responderId, incidentId }: DispatchOfferExpiredPushInput) {
  await sendResponderPush(responderId, {
    title: 'Dispatch offer expired',
    body: 'This offer was released. PACC can reassign it to another available responder.',
    sound: 'default',
    priority: 'high',
    channelId: 'emergency-alerts',
    ttl: 60,
    data: { kind: 'dispatch_offer_expired', incidentId },
  });
}
