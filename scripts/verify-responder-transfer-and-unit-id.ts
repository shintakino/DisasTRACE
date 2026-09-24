import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  isValidAmbulanceUnitId,
  legacyAmbulanceUnitId,
  normalizeAmbulanceUnitId,
} from '../lib/ambulance-unit';
import { getDispatchReleaseNotice } from '../mobile/lib/dispatch-release';

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

check('Unit IDs are normalized and validated consistently', () => {
  assert.equal(normalizeAmbulanceUnitId(' amb-eg-7ec '), 'AMB-EG-7EC');
  assert.equal(isValidAmbulanceUnitId('AMB-EG-7EC'), true);
  assert.equal(isValidAmbulanceUnitId('EG-7EC'), false);
  assert.equal(isValidAmbulanceUnitId('AMB-'), false);
  assert.match(legacyAmbulanceUnitId('Dela Cruz, Jerico', 'responder-7ec'), /^AMB-[A-Z0-9]{2,8}-[A-Z0-9]{2,8}$/);
});

check('database and API enforce unique responder Unit IDs', () => {
  const schema = read('db/schema/users.ts');
  const api = read('app/api/users/route.ts');
  const migration = read('drizzle/0031_cooing_smasher.sql');

  assert.match(schema, /uniqueIndex\('users_unit_id_unique'\)/);
  assert.match(schema, /unitId: varchar\('unit_id'/);
  assert.match(api, /isValidAmbulanceUnitId/);
  assert.match(api, /isPromotingToResponder/);
  assert.match(api, /A valid unique Unit ID is required before assigning the responder role/);
  assert.match(api, /isRemovingResponderRole/);
  assert.match(api, /isUnitIdConflict/);
  assert.match(api, /removeFailedResponderAccount/);
  assert.match(api, /That Unit ID is already assigned to another responder/);
  assert.match(api, /currentOfferResponderId/);
  assert.match(api, /active dispatch\. Finish it before changing the Unit ID/);
  assert.match(api, /normalizedUnitId !== undefined/);
  assert.match(migration, /CREATE UNIQUE INDEX "users_unit_id_unique"/);
});

check('dispatch and tracking use the assigned Unit ID', () => {
  const engine = read('lib/dispatch-engine.ts');
  const responderDispatch = read('app/api/incidents/respond/route.ts');
  const map = read('app/api/map/responders/route.ts');
  const tracking = read('mobile/app/help/tracking.tsx');

  assert.match(engine, /candidate\.unitId \|\| legacyAmbulanceUnitId/);
  assert.match(responderDispatch, /dbUser\.unitId \|\| legacyAmbulanceUnitId/);
  assert.match(map, /r\.unitId \|\| legacyAmbulanceUnitId/);
  assert.match(tracking, /unit_id: responder\.unitId/);
});

check('expired offers return a server-confirmed transfer disposition', () => {
  const route = read('app/api/incidents/respond/route.ts');
  const sheet = read('mobile/components/responder/DispatchSheet.tsx');

  assert.match(route, /async function getOfferDisposition/);
  assert.match(route, /transferred\s*,/);
  assert.match(route, /Dispatch offer declined and transferred to another responder/);
  assert.match(sheet, /getDispatchReleaseNotice/);
  assert.match(sheet, /releaseDispatchOffer/);
});

check('released dispatches stay visible until acknowledged or superseded by a new offer', () => {
  assert.deepEqual(getDispatchReleaseNotice({ transferred: true }), {
    title: 'Dispatch transferred',
    message: 'You did not accept this report in time, so it was transferred to another available responder.',
  });
  assert.deepEqual(getDispatchReleaseNotice({ reassignmentRequired: true }), {
    title: 'Dispatch offer expired',
    message: 'This report was released and is now waiting for PACC to assign another responder.',
  });

  const home = read('mobile/components/responder/ResponderHome.tsx');
  assert.match(home, /dispatchReleaseNotice/);
  assert.match(home, /Back to Dashboard/);
  assert.match(home, /status === 'dispatch_offered' && dispatchReleaseNotice/);
});

console.log('All responder transfer and Unit ID checks passed.');
