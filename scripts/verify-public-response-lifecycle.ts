import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { projectPublicResponseLifecycle } from '../lib/public-response-policy';
import { getPublicResponseMode } from '../mobile/lib/public-response-lifecycle';
import { isNotificationVisibleForRole } from '../mobile/lib/report-location';

assert.equal(getPublicResponseMode({ incidentStatus: 'EN_ROUTE', transportStatus: 'NONE', hasResponder: true }), 'INBOUND_TRACKING');
assert.equal(getPublicResponseMode({ incidentStatus: 'ARRIVED', transportStatus: 'NONE', hasResponder: true }), 'RESPONSE_COMPLETE');
assert.equal(getPublicResponseMode({ incidentStatus: 'ARRIVED', transportStatus: 'TO_HOSPITAL', hasResponder: true }), 'RESPONSE_COMPLETE');
assert.equal(getPublicResponseMode({ incidentStatus: 'ARRIVED', transportStatus: 'ARRIVED_AT_HOSPITAL', hasResponder: true }), 'RESPONSE_COMPLETE');
assert.equal(
  getPublicResponseMode({ incidentStatus: 'DOCUMENTATION_PENDING', transportStatus: 'NONE', hasResponder: true }),
  'RESPONSE_COMPLETE',
);
assert.equal(
  getPublicResponseMode({ incidentStatus: 'DOCUMENTATION_PENDING', transportStatus: 'TO_HOSPITAL', hasResponder: true }),
  'RESPONSE_COMPLETE',
);
assert.equal(getPublicResponseMode({ incidentStatus: 'RESOLVED', transportStatus: 'NONE' }), 'RESPONSE_COMPLETE');

assert.deepEqual(
  projectPublicResponseLifecycle({ requestStatus: 'VERIFIED', incidentStatus: 'EN_ROUTE', responderId: 'responder-1' }),
  { status: 'INBOUND_TRACKING', trackingActive: true, responseComplete: false },
);
for (const incidentStatus of ['ARRIVED', 'DOCUMENTATION_PENDING', 'RESOLVED']) {
  assert.deepEqual(
    projectPublicResponseLifecycle({ requestStatus: 'VERIFIED', incidentStatus, responderId: 'responder-1' }),
    { status: 'COMPLETED_AT_SCENE', trackingActive: false, responseComplete: true },
  );
}
assert.equal(isNotificationVisibleForRole('patient_transport_started', 'public_user'), false);
assert.equal(isNotificationVisibleForRole('patient_transport_completed', 'public_user'), false);
assert.equal(isNotificationVisibleForRole('responder_arrived', 'public_user'), true);

const statusRoute = readFileSync('app/api/emergency-intake/status/route.ts', 'utf8');
assert.match(statusRoute, /publicTrackingActive/);
assert.match(statusRoute, /responder:\s*publicTrackingActive\s*\?\s*responder\s*:\s*null/);
assert.match(statusRoute, /transport:\s*\{[\s\S]*status:\s*'NONE'[\s\S]*hospital:\s*null/);

const responseStatus = readFileSync('mobile/app/help/response-status.tsx', 'utf8');
assert.doesNotMatch(responseStatus, /Track patient transport/);
assert.doesNotMatch(responseStatus, /transportHospitalName/);

const trackingScreen = readFileSync('mobile/app/help/tracking.tsx', 'utf8');
assert.doesNotMatch(trackingScreen, /targetHospital|to_hospital|Transporting to|Patient transport/);

const guestHistory = readFileSync('mobile/app/help/guest-history.tsx', 'utf8');
assert.match(guestHistory, /latest\.publicStatus === 'COMPLETED_AT_SCENE'[\s\S]*\? 'COMPLETED'/);

const notifications = readFileSync('mobile/app/notifications.tsx', 'utf8');
assert.match(notifications, /item\.type === 'responder_arrived'[\s\S]*\/help\/response-status/);
assert.doesNotMatch(notifications, /patient_transport_started'[\s\S]{0,250}\/help\/response-status/);

const locationRoute = readFileSync('app/api/responder/location/route.ts', 'utf8');
assert.doesNotMatch(locationRoute, /createNotification\([\s\S]{0,500}patient_transport_started/);

console.log('Public response lifecycle policy verified.');
