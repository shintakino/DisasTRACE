import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migration = fs.readFileSync(path.join(root, 'drizzle/0032_square_guardian.sql'), 'utf8');
const setup = fs.readFileSync(path.join(root, 'db/rbac-setup.sql'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'db/schema/users.ts'), 'utf8');
const usersRoute = fs.readFileSync(path.join(root, 'app/api/users/route.ts'), 'utf8');

for (const source of [migration, setup]) {
  assert.match(source, /privacy_consent_given/, 'The profile trigger must persist explicit privacy consent.');
  assert.match(source, /Public User registration requires explicit Data Privacy consent\./, 'The profile trigger must reject Public User registration without consent.');
  assert.match(source, /privacy_policy_accepted/, 'The profile trigger must validate the explicit consent metadata.');
}

assert.match(schema, /privacyConsentGiven: boolean\('privacy_consent_given'\)/, 'The profile schema must retain consent as an auditable field.');
assert.match(
  usersRoute,
  /const CreateUserSchema = z\.object\(\{[\s\S]*?role: z\.enum\(\["ambulance_responder", "pacc_admin", "cdrrmo_super_admin"\]\)/,
  'The administrative account endpoint must not create a Public User without their consent.',
);
assert.match(
  usersRoute,
  /Public User roles are assigned only through consent-backed mobile registration\./,
  'The administrative account endpoint must not convert an existing account into a Public User without consent.',
);

console.log('Public Data Privacy enforcement regression checks passed.');
