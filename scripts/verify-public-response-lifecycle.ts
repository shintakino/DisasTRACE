import { strict as assert } from 'node:assert';
import { getPublicResponseMode } from '../mobile/lib/public-response-lifecycle';

assert.equal(getPublicResponseMode({ incidentStatus: 'EN_ROUTE', transportStatus: 'NONE', hasResponder: true }), 'INBOUND_TRACKING');
assert.equal(getPublicResponseMode({ incidentStatus: 'ARRIVED', transportStatus: 'NONE', hasResponder: true }), 'HELP_ARRIVED');
assert.equal(getPublicResponseMode({ incidentStatus: 'ARRIVED', transportStatus: 'TO_HOSPITAL', hasResponder: true }), 'TRANSPORT_TRACKING');
assert.equal(getPublicResponseMode({ incidentStatus: 'ARRIVED', transportStatus: 'ARRIVED_AT_HOSPITAL', hasResponder: true }), 'TRANSPORT_COMPLETE');
assert.equal(
  getPublicResponseMode({ incidentStatus: 'DOCUMENTATION_PENDING', transportStatus: 'NONE', hasResponder: true }),
  'DOCUMENTATION_PENDING',
);
assert.equal(
  getPublicResponseMode({ incidentStatus: 'DOCUMENTATION_PENDING', transportStatus: 'TO_HOSPITAL', hasResponder: true }),
  'DOCUMENTATION_PENDING',
);
assert.equal(getPublicResponseMode({ incidentStatus: 'RESOLVED', transportStatus: 'NONE' }), 'CASE_CLOSED');

console.log('Public response lifecycle policy verified.');
