import assert from 'node:assert/strict';
import { reportRefreshCopy } from '../mobile/lib/report-status-feedback';

assert.match(reportRefreshCopy({ lastCheckedAt: null, error: null }).text, /Checking/);
assert.match(reportRefreshCopy({ lastCheckedAt: new Date(), error: 'offline' }).text, /last confirmed update/);
assert.equal(reportRefreshCopy({ lastCheckedAt: new Date(), error: null }).tone, 'confirmed');
console.log('Mobile status feedback checks passed.');
