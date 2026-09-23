import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { manilaCalendarDate } from '../lib/manila-time';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const kpis = read('app/api/dashboard/kpis/route.ts');
const mapIncidents = read('app/api/map/incidents/route.ts');
const mapResponders = read('app/api/map/responders/route.ts');
const mapSummary = read('app/api/map/summary/route.ts');
const mapDataHook = read('hooks/use-map-data.ts');
const pdfExport = read('lib/pdf-export.ts');

assert.equal(manilaCalendarDate(new Date('2026-09-22T15:59:59.000Z')), '2026-09-22');
assert.equal(manilaCalendarDate(new Date('2026-09-22T16:00:00.000Z')), '2026-09-23');
assert.match(kpis, /currentManilaDayBounds/);
assert.match(kpis, /verificationRequests\.updatedAt/);
assert.match(mapIncidents, /const MAP_RECORD_LIMIT = 200/);
assert.match(mapIncidents, /inArray\(incidents\.status, \['DISPATCHED', 'EN_ROUTE', 'ARRIVED'\]\)/);
assert.match(mapDataHook, /\?date=\$\{encodeURIComponent\(date\)\}/);
assert.match(mapResponders, /inArray\(users\.dutyStatus, \['ON_DUTY', 'ACTIVE_DISPATCH'\]\)/);
assert.match(mapResponders, /isNotNull\(users\.lastLatitude\)/);
assert.doesNotMatch(mapSummary, /allIncidents/);
assert.match(pdfExport, /CDRRMO_TripTicket_DTT_\$\{reportId\}\.pdf/);
assert.doesNotMatch(pdfExport, /CDRRMO_TripTicket_DTT_&\{reportId\}/);

console.log('Dashboard day-boundary, live-map scope, and trip-ticket naming checks passed.');
