import assert from 'node:assert/strict';
import { getTableName } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { loadApiRoute } from './helpers/load-api-route.mjs';

const dialect = new PgDialect();
const accounts = [
  { id: 'admin', role: 'cdrrmo_super_admin', status: 'ACTIVE' },
  { id: 'resident', role: 'public_user', status: 'ACTIVE' },
  { id: 'responder', role: 'ambulance_responder', status: 'ACTIVE' },
  { id: 'optout', role: 'public_user', status: 'ACTIVE' },
  { id: 'inactive', role: 'public_user', status: 'SUSPENDED' },
];
for (const targetRole of ['all', 'public_user', 'ambulance_responder']) {
  const inbox = [];
  let broadcast;
  let reader = 'admin';
  const db = {
    query: {
      users: { findFirst: async () => accounts.find(account => account.id === reader) },
      systemBroadcasts: { findFirst: async () => broadcast },
      notifications: { findMany: async ({ where }) => {
        const query = dialect.sqlToQuery(where);
        assert.match(query.sql, /"notifications"\."user_id" = \$1/, 'Reads must be scoped to the authenticated recipient.');
        assert.equal(query.params[0], reader);
        return inbox.filter(row => row.userId === reader && (!query.params.includes(true) || row.unread));
      } },
    },
    select: () => ({ from: async () => accounts }),
    transaction: async action => action({ insert: table => ({ values: values => {
      if (getTableName(table) === 'notifications') { inbox.push(...values); return Promise.resolve(); }
      return { onConflictDoNothing: () => ({ returning: async () => {
        broadcast = { ...values };
        return [broadcast];
      } }) };
    } }) }),
    update: () => ({ set: patch => ({ where: async () => { broadcast = { ...broadcast, ...patch }; } }) }),
  };
  const dependencies = {
    db,
    supabase: { auth: { getUser: async () => ({ data: { user: { id: reader } } }) } },
    admin: { auth: { admin: { listUsers: async () => ({ data: { users: accounts.map(account => ({
      id: account.id, user_metadata: { notification_preferences: account.id === 'optout' ? { system: false } : {} },
    })) } }) } } },
    push: async () => ({ eligible: false, accepted: false, reason: 'no_active_device' }),
  };
  const announcement = await loadApiRoute('app/api/notifications/announcement/route.ts', dependencies);
  const posted = await announcement.POST(new Request('https://test/announcement', { method: 'POST', body: JSON.stringify({ title: 'Notice', body: 'Official notice', targetRole }) }));
  assert.equal(posted.status, 200);
  const expected = targetRole === 'all' ? ['admin', 'resident', 'responder'] : targetRole === 'public_user' ? ['resident'] : ['responder'];
  assert.deepEqual(inbox.map(row => row.userId).sort(), expected.sort());
  const notifications = await loadApiRoute('app/api/notifications/route.ts', dependencies);
  for (reader of ['resident', 'responder', 'optout', 'inactive']) {
    const response = await notifications.GET(new Request('https://test/api/notifications?unreadOnly=true'));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.notifications.length, expected.includes(reader) ? 1 : 0);
    assert.equal(result.unreadCount, result.notifications.length);
    for (const row of result.notifications) {
      assert.equal(row.type, 'system_announcement');
      assert.equal(row.userId, reader);
      assert.equal(row.broadcastId, broadcast.id);
    }
  }
}
console.log('PASS actual announcement POST → owned notification GET for all/residents/responders, unread badges, opt-outs, and inbox delivery without phone push');
