import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadMobileNotificationModule } from './helpers/load-mobile-notification-module.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));
let session = { access_token: 'token', user: { id: 'resident' } };
let releases = 0;
let localSignOuts = 0;
let resolveRelease;
let failRelease = false;
const auth = await loadMobileNotificationModule('mobile/lib/mobile-auth.ts', {
  supabase: { auth: {
    getSession: async () => ({ data: { session } }),
    signOut: async () => { localSignOuts++; session = null; return {}; },
  } },
  fetch: async () => {
    releases++;
    if (failRelease) return { ok: false, json: async () => ({ error: 'Offline' }) };
    return new Promise(resolve => { resolveRelease = () => resolve({ ok: true, json: async () => ({ released: true }) }); });
  },
});
const attempts = Array.from({ length: 30 }, () => auth.signOutFromMobile());
assert.ok(attempts.every(attempt => attempt === attempts[0]), 'Rapid taps share one pending operation.');
await tick();
assert.equal(releases, 1);
resolveRelease();
await Promise.all(attempts);
await auth.signOutFromMobile();
assert.equal(releases, 1, 'A late tap after logout must not use a revoked token.');
assert.equal(localSignOuts, 1);
session = { access_token: 'new-token', user: { id: 'resident' } };
failRelease = true;
await assert.rejects(auth.signOutFromMobile(), /Offline/);
assert.equal(localSignOuts, 1, 'Failed release preserves the session.');
failRelease = false;
const retry = auth.signOutFromMobile();
await tick();
resolveRelease();
await retry;
assert.equal(localSignOuts, 2, 'A failed operation may be retried.');

for (const role of ['public_user', 'ambulance_responder']) {
  let currentSnapshot;
  let received;
  let foreground;
  let reconnect;
  let realtime;
  let focus;
  let cleanup;
  const responses = [];
  const channel = {
    on: (_type, filter, callback) => { assert.equal(filter.filter, 'user_id=eq.owner'); realtime = callback; return channel; },
    subscribe: callback => { reconnect = callback; return channel; },
  };
  const hook = await loadMobileNotificationModule('mobile/hooks/use-unread-notification-count.ts', {
    useEffect: callback => { cleanup = callback(); },
    useFocusEffect: callback => { focus = callback; },
    useState: value => [value, next => { currentSnapshot = next; }],
    appState: { addEventListener: (_event, callback) => { foreground = callback; return { remove() {} }; } },
    onNotification: callback => { received = callback; return { remove() {} }; },
    supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: 'owner' }, access_token: 'owner-token' } } }) },
      channel: () => channel, removeChannel: async () => {} },
    fetch: (url, options) => {
      assert.match(url, /\/api\/notifications\?unreadOnly=true$/);
      assert.equal(options.headers.Authorization, 'Bearer owner-token');
      return new Promise(resolve => responses.push(notifications => resolve({ ok: true, json: async () => ({ notifications }) })));
    },
  });
  hook.useUnreadNotificationCount('owner', role);
  await tick();
  assert.equal(responses.length, 1);
  received(); // Native push arrives while the original empty read is in flight.
  await tick();
  responses[1]([{ type: 'system_announcement' }]);
  await tick();
  assert.equal(currentSnapshot.count, 1, `${role} receives announcement badge recovery from native push.`);
  responses[0]([]);
  await tick();
  assert.equal(currentSnapshot.count, 1, 'A delayed empty snapshot cannot erase a newer notice.');
  for (const refresh of [() => foreground('active'), () => reconnect('SUBSCRIBED'), realtime, focus]) {
    refresh();
    await tick();
    responses.at(-1)([{ type: 'system_announcement' }, { type: 'dispatch_alert' }]);
    await tick();
    assert.equal(currentSnapshot.count, role === 'public_user' ? 1 : 2);
  }
  received();
  await tick();
  cleanup();
  responses.at(-1)([]);
  await tick();
  assert.equal(currentSnapshot.count, role === 'public_user' ? 1 : 2, 'A late response cannot update a departed account.');
}
const inbox = readFileSync('mobile/app/notifications.tsx', 'utf8');
assert.match(inbox, /addNotificationReceivedListener/);
assert.match(inbox, /version !== fetchVersionRef\.current/);
assert.doesNotMatch(inbox, /normalizeNotification\(payload\.new\)/, 'Realtime must refresh the authoritative snapshot instead of racing it.');
console.log('PASS repeated sign-out, failed-release retry, public/responder announcement badge recovery, stale-read protection, focus/reconnect, and account cleanup');
