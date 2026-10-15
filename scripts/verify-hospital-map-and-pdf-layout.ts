import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const hospitalSettings = read('components/account/hospital-settings.tsx');
const pdfExport = read('lib/pdf-export.ts');

assert.match(hospitalSettings, /mapStyle="https:\/\/tiles\.openfreemap\.org\/styles\/liberty"/);
assert.doesNotMatch(hospitalSettings, /mapStyle="https:\/\/tiles\.openfreemap\.org\/styles\/dark"/);
assert.match(hospitalSettings, /bg-slate-100/);

assert.match(pdfExport, /doc\.text\("REPORT STATUS:", 120, 58\)/);
assert.doesNotMatch(pdfExport, /STATUS STATUS:/);
assert.match(pdfExport, /cellPadding: 2\.5/);
assert.match(pdfExport, /status: \{ fontStyle: "bold", halign: "center", cellWidth: 27 \}/);

// Keep fixed widths inside the 210 mm A4 page less 14 mm margins on both sides.
const reportSummaryWidth = 26 + 32 + 29 + 27 + 29 + 39;
assert.equal(reportSummaryWidth, 182);

console.log('Hospital locator light-style and report-PDF status-layout checks passed.');
