import type { UserOptions } from 'jspdf-autotable';

// A4 portrait: 210 mm minus the two 14 mm margins = 182 mm.
// Status has 22 mm of content space, enough for DEACTIVATED in bold at 8 pt.
export const USER_REGISTRY_PDF_LAYOUT = {
  margin: { left: 14, right: 14 },
  styles: { fontSize: 8, font: 'helvetica', cellPadding: 2.5, valign: 'middle' },
  columnStyles: {
    fullName: { fontStyle: 'bold', cellWidth: 34 },
    email: { cellWidth: 44 },
    role: { cellWidth: 26 },
    status: { fontStyle: 'bold', cellWidth: 27 },
    joinedDate: { cellWidth: 26 },
    lastActive: { cellWidth: 25 },
  },
} satisfies UserOptions;
