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

/** Push delivery is advisory; offer ownership and expiry remain server-authoritative. */
export async function sendDispatchOfferPush({ responderId, incidentId, offerExpiresAt }: DispatchPushInput) {
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

  const secondsRemaining = offerExpiresAt
    ? Math.max(1, Math.ceil((offerExpiresAt.getTime() - Date.now()) / 1000))
    : 30;

  try {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        to: device.pushToken,
        title: 'Emergency Dispatch Offer',
        body: 'An emergency dispatch offer is waiting. Open DisasTRACE immediately.',
        sound: 'default',
        priority: 'high',
        channelId: 'emergency-alerts',
        ttl: secondsRemaining,
        data: { kind: 'dispatch_offer', incidentId },
      }]),
      signal: AbortSignal.timeout(5_000),
    });
    const payload = ExpoPushResponseSchema.safeParse(await response.json().catch(() => null));
    if (!response.ok || !payload.success) {
      console.error('[Push] Expo rejected a dispatch notification.', { responderId, incidentId, status: response.status });
      return;
    }
    if (payload.data.data[0]?.details?.error === 'DeviceNotRegistered') {
      await db.delete(mobilePushTokens).where(eq(mobilePushTokens.pushToken, device.pushToken));
    }
  } catch (error) {
    console.error('[Push] Dispatch notification delivery failed.', { responderId, incidentId, error });
  }
}
