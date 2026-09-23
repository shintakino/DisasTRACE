/**
 * Uses elapsed wall-clock time instead of incrementing a JavaScript counter.
 * Android pauses JavaScript timers while an app is backgrounded, so a counter
 * alone produces an incorrect response duration after the app is reopened.
 */
export function elapsedSecondsSince(startedAt: number, now = Date.now()) {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.floor((now - startedAt) / 1_000));
}
