import assert from 'node:assert/strict';
import { consumeNotificationResponseDurably } from '../mobile/lib/notification-response-consumption';

async function main() {
  const calls: string[] = [];
  const persisted = await consumeNotificationResponseDurably({
    responseId: 'response-1',
    persistHandledResponseId: async (id) => { calls.push(`persist:${id}`); },
    clearNativeResponse: async () => { calls.push('clear'); },
  });
  assert.equal(persisted, true);
  assert.deepEqual(calls.sort(), ['clear', 'persist:response-1']);

  const clearedOnly = await consumeNotificationResponseDurably({
    responseId: 'response-2',
    persistHandledResponseId: async () => { throw new Error('SecureStore unavailable'); },
    clearNativeResponse: async () => undefined,
  });
  assert.equal(clearedOnly, true, 'Clearing Expo native state is sufficient to prevent replay.');

  const failed = await consumeNotificationResponseDurably({
    responseId: 'response-3',
    persistHandledResponseId: async () => { throw new Error('SecureStore unavailable'); },
    clearNativeResponse: async () => { throw new Error('Expo native state unavailable'); },
  });
  assert.equal(failed, false, 'Routing must pause when no durable consumption mechanism succeeds.');

  console.log('Notification response consumption checks passed.');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
