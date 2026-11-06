import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { getTableName } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { loadApiRoute } from './helpers/load-api-route.mjs';
import { loadMobileNotificationModule } from './helpers/load-mobile-notification-module.mjs';

const dialect = new PgDialect();
const field = column => column.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
function matches(condition, row) {
  const { sql, params } = dialect.sqlToQuery(condition);
  return [...sql.matchAll(/"(\w+)"\."(\w+)" (<>|>=|=|<) \$(\d+)/g)].every(([, table, column, operator, parameter]) => {
    let actual = row[table]?.[field(column)];
    let expected = params[Number(parameter) - 1];
    if (actual instanceof Date) { actual = +actual; expected = +new Date(expected); }
    if (operator === '=') return actual === expected;
    if (operator === '<>') return actual !== expected;
    if (operator === '>=') return actual >= expected;
    return actual < expected;
  });
}

for (const statuses of [['REJECTED'], ['DUPLICATE'], ['VERIFIED'], ['REJECTED', 'DUPLICATE', 'VERIFIED', 'PENDING', 'RESOLVED']]) {
  const requests = statuses.map((status, index) => ({ id: `r${index}`, status: status === 'RESOLVED' ? 'VERIFIED' : status, updatedAt: new Date() }));
  const incidentRows = statuses.map((status, index) => ({ id: `i${index}`, requestId: `r${index}`, status: status === 'RESOLVED' ? 'RESOLVED' : 'DISPATCHED', createdAt: new Date(), resolvedAt: new Date() }));
  const tables = { verification_requests: requests, incidents: incidentRows, users: [] };
  const route = await loadApiRoute('app/api/dashboard/kpis/route.ts', {
    supabase: { auth: { getUser: async () => ({ data: { user: { id: 'pacc', app_metadata: { role: 'pacc_admin' } } } }) } },
    db: { select: shape => ({ from: table => {
      const name = getTableName(table);
      let rows = tables[name].map(row => ({ [name]: row }));
      const builder = {
        innerJoin(joinedTable, condition) {
          const joinedName = getTableName(joinedTable);
          assert.equal(joinedName, 'verification_requests');
          assert.match(dialect.sqlToQuery(condition).sql, /"verification_requests"\."id" = "incidents"\."request_id"/);
          rows = rows.flatMap(row => requests.filter(request => request.id === row.incidents.requestId).map(request => ({ ...row, verification_requests: request })));
          return builder;
        },
        where: condition => Promise.resolve('avgSeconds' in shape ? [{ avgSeconds: 0 }] : [{ count: rows.filter(row => matches(condition, row)).length }]),
      };
      return builder;
    } }) },
  });
  const response = await route.GET();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.activeIncidents, statuses.filter(status => status === 'VERIFIED' || status === 'PENDING').length);
}

const deviceId = 'test-device';
const deviceHash = createHash('sha256').update(deviceId).digest('hex');
const token = `header.${Buffer.from(JSON.stringify({ sub: 'resident', session_id: 'original' })).toString('base64url')}.signature`;
async function fixture({ binding = { userId: 'resident', deviceHash, activeSessionId: 'original' }, role = 'public_user', authenticated = true, failAudit = false, failCleanup = false } = {}) {
  let current = binding;
  let tokens = [{ userId: 'resident', sessionId: 'original' }, { userId: 'resident', sessionId: 'replacement' }];
  let auditCount = 0;
  const route = await loadApiRoute('app/api/mobile-auth/sign-out/route.ts', {
    supabase: { auth: {
      getUser: async () => ({ data: { user: authenticated ? { id: 'resident' } : null } }),
      admin: { signOut: async () => { throw new Error('Premature Auth revocation prevents authenticating a lost-response retry.'); } },
    } },
    db: {
      query: { users: { findFirst: async () => ({ id: 'resident', role }) } },
      transaction: async action => {
        const saved = { current, tokens: [...tokens], auditCount };
        try {
          return await action({
            select: () => ({ from: () => ({ where: () => ({ for: async () => current ? [{ ...current }] : [] }) }) }),
            delete: table => ({ where: async condition => {
              const name = getTableName(table);
              if (name === 'mobile_device_sessions') {
                if (current && matches(condition, { [name]: current })) current = null;
              } else {
                if (failCleanup) throw new Error('Push cleanup failed');
                tokens = tokens.filter(row => !matches(condition, { [name]: row }));
              }
            } }),
            insert: () => ({ values: async () => { if (failAudit) throw new Error('Audit write failed'); auditCount++; } }),
          });
        } catch (error) { current = saved.current; tokens = saved.tokens; auditCount = saved.auditCount; throw error; }
      },
    },
  });
  const post = (id = deviceId, authorization = token) => route.POST(new Request('https://test/api/mobile-auth/sign-out', {
    method: 'POST', headers: authorization ? { Authorization: `Bearer ${authorization}` } : {}, body: JSON.stringify({ deviceId: id }),
  }));
  return { post, binding: () => current, tokens: () => tokens, audits: () => auditCount };
}

const normal = await fixture();
assert.equal((await normal.post()).status, 200);
assert.equal((await normal.post()).status, 200, 'Retry after the binding was deleted must succeed.');
assert.equal(normal.binding(), null);
assert.equal(normal.audits(), 1, 'An idempotent retry must not duplicate the release audit.');
assert.equal(normal.tokens().length, 1);
assert.equal(normal.tokens()[0].sessionId, 'replacement');
const replacement = await fixture({ binding: { userId: 'resident', deviceHash: 'new-device', activeSessionId: 'replacement' } });
assert.equal((await replacement.post()).status, 200);
assert.equal(replacement.binding().activeSessionId, 'replacement');
assert.equal(replacement.audits(), 0);
assert.equal(replacement.tokens()[0].sessionId, 'replacement');
for (const options of [{ failAudit: true }, { failCleanup: true }]) {
  const failed = await fixture(options);
  assert.equal((await failed.post()).status, 500);
  assert.equal(failed.binding().activeSessionId, 'original', 'A failed transaction must retain the binding for retry.');
  assert.equal(failed.tokens().length, 2);
  assert.equal(failed.audits(), 0);
}
for (const [options, suppliedDevice, suppliedToken, status] of [
  [{}, 'wrong-device', token, 409], [{ role: 'pacc_admin' }, deviceId, token, 403],
  [{ authenticated: false }, deviceId, token, 401], [{}, deviceId, '', 401],
]) {
  const denied = await fixture(options);
  assert.equal((await denied.post(suppliedDevice, suppliedToken)).status, status);
  assert.ok(denied.binding());
  assert.equal(denied.audits(), 0);
}

const lost = await fixture();
let session = { access_token: token, user: { id: 'resident' } };
let loseResponse = true;
let localSignOuts = 0;
const client = await loadMobileNotificationModule('mobile/lib/mobile-auth.ts', {
  supabase: { auth: { getSession: async () => ({ data: { session } }), signOut: async () => { localSignOuts++; session = null; return {}; } } },
  fetch: async () => {
    const response = await lost.post();
    if (loseResponse) { loseResponse = false; assert.equal(response.status, 200); throw new Error('Response lost'); }
    return response;
  },
});
await assert.rejects(client.signOutFromMobile(), /Response lost/);
assert.ok(session, 'Unconfirmed logout must preserve local credentials.');
assert.equal(lost.binding(), null);
await client.signOutFromMobile();
assert.equal(session, null);
assert.equal(localSignOuts, 1);
assert.equal(lost.audits(), 1);
console.log('PASS actual KPI and sign-out handlers: rejected/duplicate counts, lost-response client retry, replacement-session protection, wrong-device/auth gates, audit deduplication, and transaction rollback');
