import assert from 'node:assert/strict';
import { getTableName } from 'drizzle-orm';
import { loadApiRoute } from './helpers/load-api-route.mjs';

for (const submitted of [false, true]) {
  let request = { id: 'request', requestId: 'REQ-1', status: 'VERIFIED' };
  let incident = { id: 'incident', requestId: 'request', status: 'DISPATCHED', responderId: null, currentOfferResponderId: null };
  let audited = false;
  const tx = {
    select: () => ({ from: table => ({ where: () => ({
      orderBy() { return this; },
      limit: () => ({ for: async () => [getTableName(table) === 'incidents' ? incident : request] }),
    }) }) }),
    query: { reports: { findFirst: async () => submitted ? { id: 'final', status: 'SUBMITTED' } : null } },
    delete: () => { throw new Error('Foreign key violation: linked draft and status log must survive rejection.'); },
    update: table => ({ set: patch => ({ where: () => {
      if (getTableName(table) === 'incidents') incident = { ...incident, ...patch };
      else request = { ...request, ...patch };
      return { returning: async () => [request] };
    } }) }),
    insert: table => ({ values: async () => { assert.equal(getTableName(table), 'audit_logs'); audited = true; } }),
  };
  const route = await loadApiRoute('app/api/verification/[id]/status/route.ts', {
    supabase: { auth: { getUser: async () => ({ data: { user: { id: 'pacc', app_metadata: { role: 'pacc_admin' } } } }) } },
    db: { transaction: async action => action(tx) },
  });
  const response = await route.PATCH(new Request('https://test/status', {
    method: 'PATCH', body: JSON.stringify({ status: 'REJECTED', rejectionReason: 'The evidence could not be verified.' }),
  }), { params: Promise.resolve({ id: 'request' }) });
  assert.equal(response.status, submitted ? 409 : 200);
  assert.equal(request.status, submitted ? 'VERIFIED' : 'REJECTED');
  assert.equal(incident.status, 'DISPATCHED', 'Rejection must not emit an incident-resolved notification.');
  assert.equal(incident.id, 'incident', 'Referenced incident identity and history must be preserved.');
  assert.equal(audited, !submitted);
  if (!submitted) assert.equal((await response.json()).rejectionReason, 'The evidence could not be verified.');
}
console.log('PASS actual PACC rejection handler: unanswered reports with linked history reject successfully; submitted field reports remain protected');
