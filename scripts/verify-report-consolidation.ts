import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  selectReportConsolidation,
  type ConsolidationCandidate,
} from '../lib/report-consolidation-policy';

const now = new Date('2026-09-20T10:00:00.000Z');
const activeMedical: ConsolidationCandidate = {
  id: 'primary-medical',
  type: 'Medical Emergency',
  nature: 'EMERGENCY',
  status: 'VERIFIED',
  incidentStatus: 'EN_ROUTE',
  parentRequestId: null,
  latitude: 14.954,
  longitude: 120.902,
  createdAt: new Date('2026-09-20T09:50:00.000Z'),
};

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

check('auto-links a strong emergency match to one active primary before dispatch', () => {
  assert.deepEqual(selectReportConsolidation({
    type: 'Medical Emergency', nature: 'EMERGENCY', latitude: 14.9545, longitude: 120.902,
  }, [activeMedical], { now, radiusMeters: 250 }), {
    kind: 'AUTO_LINK_EMERGENCY',
    parentRequestId: 'primary-medical',
  });
});

check('keeps distinct or closed emergencies out of automatic consolidation', () => {
  assert.deepEqual(selectReportConsolidation({
    type: 'Medical Emergency', nature: 'EMERGENCY', latitude: 14.9545, longitude: 120.902,
  }, [{ ...activeMedical, incidentStatus: 'RESOLVED' }], { now, radiusMeters: 250 }), { kind: 'NONE' });
  assert.deepEqual(selectReportConsolidation({
    type: 'Fire Emergency', nature: 'EMERGENCY', latitude: 14.9545, longitude: 120.902,
  }, [activeMedical], { now, radiusMeters: 250 }), { kind: 'NONE' });
});

check('sends Patient Transport and other non-emergency matches to PACC review instead of auto-linking', () => {
  assert.deepEqual(selectReportConsolidation({
    type: 'Patient Transport', nature: 'NON-EMERGENCY', latitude: 14.9545, longitude: 120.902,
  }, [{ ...activeMedical, id: 'transport-primary', type: 'Patient Transport', nature: 'NON-EMERGENCY', status: 'PENDING', incidentStatus: null }], { now, radiusMeters: 250 }), {
    kind: 'PACC_REVIEW_NON_EMERGENCY',
    parentRequestId: 'transport-primary',
  });
});

check('keeps non-emergency candidates grouped until an authorized PACC decision', () => {
  const route = readFileSync(join(process.cwd(), 'app/api/verification/[id]/related/route.ts'), 'utf8');
  assert.match(route, /CONFIRM_LINK/);
  assert.match(route, /KEEP_SEPARATE/);
  assert.match(route, /possibleDuplicateOfId/);
  assert.match(route, /parentRequestId/);
});

check('returns related reports only under their primary PACC queue item', () => {
  const route = readFileSync(join(process.cwd(), 'app/api/verification/route.ts'), 'utf8');
  assert.match(route, /isNull\(verificationRequests\.possibleDuplicateOfId\)/);
  assert.match(route, /relatedReports/);
});

check('keeps a PACC-review candidate from becoming another primary report', () => {
  const intake = readFileSync(join(process.cwd(), 'lib/emergency-intake.ts'), 'utf8');
  assert.match(intake, /isNull\(verificationRequests\.possibleDuplicateOfId\)/);
  assert.match(intake, /status: consolidation\.kind === 'AUTO_LINK_EMERGENCY' \? 'DUPLICATE' : 'PENDING'/);
});

check('makes PACC review decisions and primary coordination visible to operators and reporters', () => {
  const details = readFileSync(join(process.cwd(), 'components/verification/verification-details.tsx'), 'utf8');
  const status = readFileSync(join(process.cwd(), 'app/api/emergency-intake/status/route.ts'), 'utf8');
  assert.match(details, /Confirm same request/);
  assert.match(details, /Keep separate/);
  assert.match(status, /const agencies = trackingReport\.coordinationAgencies/);
});

console.log('All report consolidation checks passed.');
