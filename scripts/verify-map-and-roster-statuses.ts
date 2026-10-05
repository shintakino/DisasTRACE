import assert from 'node:assert/strict';
import { projectMapDisplayStatus } from '../lib/map-display-status';
import { normalizeRosterAccountStatus } from '../lib/roster-status';

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

check('shows a resolved linked user report as Resolved instead of Active', () => {
  assert.equal(projectMapDisplayStatus({ requestStatus: 'VERIFIED', incidentStatus: 'RESOLVED' }), 'RESOLVED');
});

check('uses the same resolved result for the responder representation', () => {
  assert.equal(projectMapDisplayStatus({ requestStatus: 'VERIFIED', incidentStatus: 'RESOLVED' }), 'RESOLVED');
});

check('keeps rejected and duplicate requests out of Active even with legacy incident data', () => {
  assert.equal(projectMapDisplayStatus({ requestStatus: 'REJECTED', incidentStatus: 'RESOLVED' }), 'REJECTED');
  assert.equal(projectMapDisplayStatus({ requestStatus: 'DUPLICATE', incidentStatus: 'EN_ROUTE' }), 'REJECTED');
});

check('keeps open request and incident work Active', () => {
  assert.equal(projectMapDisplayStatus({ requestStatus: 'PENDING', incidentStatus: null }), 'ACTIVE');
  assert.equal(projectMapDisplayStatus({ requestStatus: 'VERIFIED', incidentStatus: 'EN_ROUTE' }), 'ACTIVE');
});

check('preserves Pending responder accounts instead of presenting them as Deactivated', () => {
  assert.equal(normalizeRosterAccountStatus('PENDING'), 'PENDING');
  assert.equal(normalizeRosterAccountStatus('ACTIVE'), 'ACTIVE');
  assert.equal(normalizeRosterAccountStatus('SUSPENDED'), 'SUSPENDED');
  assert.equal(normalizeRosterAccountStatus('DEACTIVATED'), 'DEACTIVATED');
});

console.log('Map and roster status projection checks passed.');
