import crypto from 'crypto';

interface Bucket { count: number; startedAt: number }
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_BUCKETS = 2_000;

function prune(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) if (now - bucket.startedAt >= WINDOW_MS) buckets.delete(key);
  while (buckets.size >= MAX_BUCKETS) buckets.delete(buckets.keys().next().value as string);
}

export function checkChatbotRateLimit(input: { reporterMode: 'guest' | 'registered'; networkKey: string; conversationNonce?: string }) {
  const now = Date.now();
  prune(now);
  // The client-provided conversation nonce must never create a fresh quota;
  // otherwise a caller could rotate it to bypass the network-level limit.
  const opaqueKey = crypto.createHash('sha256').update(`${input.reporterMode}:${input.networkKey}`).digest('hex');
  const maximum = input.reporterMode === 'guest' ? 20 : 40;
  const current = buckets.get(opaqueKey);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    buckets.set(opaqueKey, { count: 1, startedAt: now });
    return { limited: false, retryAfterSeconds: 0 };
  }
  current.count += 1;
  return { limited: current.count > maximum, retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - (now - current.startedAt)) / 1_000)) };
}
