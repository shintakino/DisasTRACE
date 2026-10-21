import assert from 'node:assert/strict';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { USER_REGISTRY_PDF_LAYOUT } from '../lib/user-registry-pdf-layout';

const doc = new jsPDF();
const statuses = ['ACTIVE', 'PENDING', 'SUSPENDED', 'DEACTIVATED'];
const rendered = new Map<string, string[]>();
autoTable(doc, {
  ...USER_REGISTRY_PDF_LAYOUT,
  columns: Object.keys(USER_REGISTRY_PDF_LAYOUT.columnStyles).map(dataKey => ({ dataKey, header: dataKey })),
  body: statuses.map(status => ({ fullName: 'Sample Resident', email: 'resident@example.invalid', role: 'Public User', status, joinedDate: 'October 21, 2026', lastActive: 'Recently' })),
  willDrawCell: ({ section, column, cell }) => {
    if (section === 'body' && column.dataKey === 'status') rendered.set(String(cell.raw), cell.text);
    assert.ok(cell.x + cell.width <= doc.internal.pageSize.getWidth() - 14 + 0.01, 'Table stays within printable width');
  },
});
for (const status of statuses) assert.deepEqual(rendered.get(status), [status], `${status} must render on one line`);
assert.equal(Object.values(USER_REGISTRY_PDF_LAYOUT.columnStyles).reduce((width, col) => width + col.cellWidth, 0), 182);
console.log('PASS: actual jsPDF user statuses render without split words and within page margins.');
