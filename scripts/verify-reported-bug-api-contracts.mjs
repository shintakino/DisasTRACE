import assert from 'node:assert/strict';
import { PgDialect } from 'drizzle-orm/pg-core';
import { loadApiRoute } from './helpers/load-api-route.mjs';

const dialect = new PgDialect();
const account = { id: 'applicant', role: 'public_user', status: 'PENDING', verificationStatus: 'REJECTED', idImageUrl: 'ids/old.jpg', updatedAtVersion: '2026-10-01 00:00:00.123456' };
const userSession = id => ({ auth: { getUser: async () => ({ data: { user: { id } } }) } });

for (const change of ['none', 'approve', 'reject_again', 'replace', 'suspend']) {
  let row = { ...account };
  let removed = 0;
  const route = await loadApiRoute('app/api/verification/id/route.ts', {
    supabase: userSession('applicant'),
    admin: { storage: { from: () => ({
      upload: async () => {
        if (change === 'approve') row = { ...row, status: 'ACTIVE', verificationStatus: 'APPROVED' };
        if (change === 'reject_again') row = { ...row, updatedAtVersion: '2026-10-01 00:00:00.123457' };
        if (change === 'replace') row = { ...row, idImageUrl: 'ids/new.jpg' };
        if (change === 'suspend') row = { ...row, status: 'SUSPENDED' };
        return {};
      }, remove: async () => { removed++; return {}; },
    }) } },
    db: {
      query: { users: { findFirst: async () => ({ ...row }) } },
      update: () => ({ set: patch => ({ where: condition => ({ returning: async () => {
        const query = dialect.sqlToQuery(condition);
        const columns = { id: 'id', status: 'status', verification_status: 'verificationStatus', updated_at: 'updatedAt', id_image_url: 'idImageUrl' };
        const matches = [...query.sql.matchAll(/"users"\."(\w+)" = \$(\d+)/g)].every(([, column, index]) => {
          const actual = row[columns[column]];
          const expected = query.params[Number(index) - 1];
          return column === 'updated_at' ? +new Date(actual) === +new Date(expected) : actual === expected;
        });
        const version = query.sql.match(/cast\("users"\."updated_at" as text\) = \$(\d+)/);
        assert.ok(version, 'The final write must preserve the exact timestamp version, including microseconds.');
        if (!matches || row.updatedAtVersion !== query.params[Number(version[1]) - 1]) return [];
        row = { ...row, ...patch };
        return [{ id: row.id }];
      } }) }) }),
    },
  });
  const form = new FormData();
  form.set('file', new File(['image'], 'id.jpg', { type: 'image/jpeg' }));
  form.set('idType', 'National ID');
  const response = await route.POST(new Request('https://test/api/verification/id', { method: 'POST', body: form }));
  assert.equal(response.status, change === 'none' ? 201 : 409, change);
  assert.equal(removed, change === 'none' ? 0 : 1, 'Unused uploaded object is removed on conflict.');
  if (change === 'approve') assert.equal(row.verificationStatus, 'APPROVED');
  if (change === 'replace') assert.equal(row.idImageUrl, 'ids/new.jpg');
}

const audienceAccounts = [
  { id: 'admin', role: 'cdrrmo_super_admin', status: 'ACTIVE' },
  { id: 'resident', role: 'public_user', status: 'ACTIVE' },
  { id: 'responder', role: 'ambulance_responder', status: 'ACTIVE' },
  { id: 'optout', role: 'public_user', status: 'ACTIVE' },
  { id: 'legacy-optout', role: 'ambulance_responder', status: 'ACTIVE' },
  { id: 'pending', role: 'public_user', status: 'PENDING' },
];
for (const targetRole of ['all', 'public_user', 'ambulance_responder']) {
  const broadcasts = new Map();
  const inbox = [];
  const pushed = [];
  let failAudit = true;
  const db = {
    query: { users: { findFirst: async () => audienceAccounts[0] }, systemBroadcasts: { findFirst: async ({where}) => {
      const { params } = dialect.sqlToQuery(where);
      return broadcasts.get(params[0]);
    } } },
    select: () => ({ from: async () => audienceAccounts }),
    transaction: async action => action({ insert: table => ({ values: value => {
      if (Array.isArray(value)) { inbox.push(...value); return Promise.resolve(); }
      return { onConflictDoNothing: () => ({ returning: async () => {
        if (broadcasts.has(value.id)) return [];
        const saved = { ...value, pushEligibleCount: 0, pushAcceptedCount: 0, pushFailedCount: 0 };
        broadcasts.set(value.id, saved);
        return [saved];
      } }) };
    } }) }),
    update: () => ({ set: values => ({ where: async condition => {
      if (failAudit) throw new Error('simulated audit outage');
      const { params } = dialect.sqlToQuery(condition);
      Object.assign(broadcasts.get(params[0]), values);
    } }) }),
  };
  const route = await loadApiRoute('app/api/notifications/announcement/route.ts', {
    db, supabase: userSession('admin'),
    admin: { auth: { admin: { listUsers: async () => ({ data: { users: audienceAccounts.map(row => ({ id: row.id, user_metadata: {
      notification_preferences: row.id === 'optout' ? {system:false} : row.id === 'legacy-optout' ? {system_notices:false} : {},
    } })) } }) } } },
    push: async ({userId}) => { pushed.push(userId); return userId === 'responder'
      ? { eligible: true, accepted: false, reason: 'provider_failure' } : { eligible: false, accepted: false, reason: 'no_active_device' }; },
  });
  const input = { title: 'Notice', body: 'Test body', targetRole, broadcastId: '10000000-0000-4000-8000-000000000001' };
  const post = payload => route.POST(new Request('https://test/api/notifications/announcement', { method: 'POST', body: JSON.stringify(payload) }));
  const first = await post(input);
  assert.equal(first.status, 200, 'Audit failure cannot report a committed announcement as failed.');
  assert.equal((await first.json()).broadcast.deliveryStatus, 'incomplete');
  const expected = targetRole === 'all' ? ['admin', 'resident', 'responder'] : targetRole === 'public_user' ? ['resident'] : ['responder'];
  assert.deepEqual(inbox.map(row => row.userId).sort(), expected.sort());
  assert.equal(pushed.length, expected.length);
  const before = inbox.length;
  const replay = await post(input);
  assert.equal((await replay.json()).replayed, true);
  assert.equal(inbox.length, before);
  assert.equal(pushed.length, expected.length, 'Retry does not push twice.');
  assert.equal((await post({...input,body:'Different body'})).status, 409);
  failAudit = false;
  // Concurrent retries exercise the unique-key conflict branch as well as early replay.
  await Promise.all([post({...input,broadcastId:'20000000-0000-4000-8000-000000000002'}), post({...input,broadcastId:'20000000-0000-4000-8000-000000000002'})]);
  assert.equal(inbox.length, before * 2);
}
for (const standing of ['approved', 'pending', 'suspended', 'wrong-role', 'missing-report']) {
  const responder = { id: 'owner', role: standing === 'wrong-role' ? 'public_user' : 'ambulance_responder',
    status: standing === 'suspended' ? 'SUSPENDED' : 'ACTIVE',
    verificationStatus: standing === 'pending' ? 'PENDING' : 'APPROVED', dutyStatus: 'ON_DUTY' };
  const owned = { id:'owned', responderId:'owner', status:'EN_ROUTE', requestId:'report', createdAt:new Date(), transportStatus:'NONE' };
  const other = { ...owned, id:'other', responderId:'another-responder' };
  const query = {
    users: { findFirst: async () => responder },
    incidents: { findFirst: async ({where}) => {
      const query = dialect.sqlToQuery(where);
      return [other, owned].find(row => query.sql.includes('"incidents"."responder_id" =')
        ? row.responderId === query.params[0] : row.currentOfferResponderId === query.params[0]);
    } },
    verificationRequests: { findFirst: async () => standing === 'missing-report' ? null
      : ({ id:'report', nature:'EMERGENCY', type:'Medical Emergency', peopleInvolved:'1', latitude:14.95, longitude:120.9 }) },
  };
  const route = await loadApiRoute('app/api/responder/state/route.ts', {
    supabase:userSession('owner'), db:{ transaction:async (fn, options) => {
      assert.equal(options.isolationLevel,'repeatable read');
      assert.equal(options.accessMode,'read only');
      return fn({query});
    } },
  });
  const response = await route.GET();
  assert.equal(response.status, standing === 'approved' ? 200 : standing === 'missing-report' ? 503 : 403);
  if (standing === 'approved') {
    const {data} = await response.json();
    assert.equal(data.dispatch.id,'owned');
    assert.equal(data.dutyStatus,'ACTIVE_DISPATCH');
    assert.equal(data.dispatch.isOffer,false);
  }
}
const accepted = await loadApiRoute('app/api/incidents/respond/route.ts', {
  supabase:userSession('owner'), db:{ query:{
    users:{findFirst:async()=>({id:'owner',role:'ambulance_responder',status:'ACTIVE',verificationStatus:'APPROVED'})},
    incidents:{findFirst:async()=>({id:'owned',responderId:'owner',status:'EN_ROUTE'})},
  }, transaction:async()=>{throw new Error('Repeated acceptance must not mutate an existing assignment.');} },
});
assert.equal((await accepted.POST(new Request('https://test/respond',{method:'POST',body:JSON.stringify({incidentId:'owned',action:'ACCEPT'})}))).status,200);
console.log('PASS actual API handlers: upload/admin conflicts, audience exclusions, saved-broadcast failures, duplicate/concurrent retries, responder ownership/gates, and repeated acceptance');
