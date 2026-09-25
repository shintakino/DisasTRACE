import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getResponderStatusLabel,
  getRestoredResponderState,
  shouldRequestResponderRoute,
} from '../mobile/lib/responder-lifecycle-policy';

const responderLocation = { latitude: 15.015023, longitude: 120.8939991 };
const incidentLocation = { latitude: 15.016023, longitude: 120.8939991 };

assert.equal(getRestoredResponderState('EN_ROUTE', 'NONE'), 'en_route');
assert.equal(getRestoredResponderState('ARRIVED', 'NONE'), 'on_scene');
assert.equal(getRestoredResponderState('ARRIVED', 'TO_HOSPITAL'), 'to_hospital');
assert.equal(getRestoredResponderState('ARRIVED', 'ARRIVED_AT_HOSPITAL'), 'at_hospital');
assert.equal(getRestoredResponderState('DOCUMENTATION_PENDING', 'ARRIVED_AT_HOSPITAL'), null);
assert.equal(getRestoredResponderState('RESOLVED', 'ARRIVED_AT_HOSPITAL'), null);
assert.equal(getResponderStatusLabel('dispatch_offered'), 'Incoming');
assert.equal(getResponderStatusLabel('en_route'), 'Dispatched');
assert.equal(getResponderStatusLabel('on_scene'), 'On Scene');
assert.equal(getResponderStatusLabel('to_hospital'), 'To Hospital');
assert.equal(getResponderStatusLabel('at_hospital'), 'At Hospital');
assert.equal(getResponderStatusLabel('report_filling'), 'Documentation');

assert.equal(shouldRequestResponderRoute({
  status: 'en_route',
  hasLiveLocation: false,
  origin: responderLocation,
  destination: incidentLocation,
}), false);
assert.equal(shouldRequestResponderRoute({
  status: 'en_route',
  hasLiveLocation: true,
  origin: responderLocation,
  destination: responderLocation,
}), false);
assert.equal(shouldRequestResponderRoute({
  status: 'en_route',
  hasLiveLocation: true,
  origin: responderLocation,
  destination: incidentLocation,
}), true);
assert.equal(shouldRequestResponderRoute({
  status: 'on_scene',
  hasLiveLocation: true,
  origin: responderLocation,
  destination: incidentLocation,
}), false);

const responderHome = readFileSync('mobile/components/responder/ResponderHome.tsx', 'utf8');
const broadcastTracker = readFileSync('mobile/hooks/use-broadcast-tracker.ts', 'utf8');
const homeScreen = readFileSync('mobile/app/(tabs)/index.tsx', 'utf8');
const initialLocationBlock = responderHome.slice(
  responderHome.indexOf('const getInitialLocation = async'),
  responderHome.indexOf('const incidentLatitude'),
);

assert.doesNotMatch(
  responderHome,
  /status === 'on_scene'[\s\S]{0,250}lat = activeDispatch\.coordinates\.latitude/,
  'the responder map must not replace trusted GPS with the public incident pin',
);
assert.doesNotMatch(
  broadcastTracker,
  /statusRef\.current === 'on_scene'[\s\S]{0,250}lat = activeDispatchRef\.current\.coordinates\.latitude/,
  'background telemetry must not replace trusted GPS with the public incident pin',
);
assert.doesNotMatch(
  initialLocationBlock,
  /setHasLiveLocation\(true\)|currentLocation: \[lng, lat\]/,
  'a cached location may center the map but must not unlock live routing or arrival actions',
);
assert.match(responderHome, /shouldRequestResponderRoute\(/);
assert.match(homeScreen, /getRestoredResponderState\(activeInc\.status, activeInc\.transport_status\)/);
assert.match(homeScreen, /transportHospitalId: activeInc\.transport_hospital_id/);
assert.match(responderHome, /activeDispatch\.transportHospitalId/);
assert.match(responderHome, /submittedIncidentIds\.includes\(inc\.id\)/);
assert.match(responderHome, /transport_status, transport_hospital_id/);
assert.match(responderHome, /getRestoredResponderState\(incident\.status, incident\.transport_status\)/);

console.log('Responder route and lifecycle policy checks passed.');
