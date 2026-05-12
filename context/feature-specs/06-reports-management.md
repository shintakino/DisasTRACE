# Feature Spec 06: Reports Management (CDRRMO Super Admin)

## Overview
Implement a high-fidelity incident report management system for the **CDRRMO Super Admin**. This interface allows admins to review detailed reports submitted by ambulance responders, filter through historical incident data, and export records for official documentation.

## Requirements

### Reports Header Actions (Blue Card Header)
- **Card Styling**: The table and actions are contained within a Shadcn `Card` with a `bg-[#1E3A8A]` (Navy Blue) header area.
- **Search Bar**: "Search reports..." input to search by responder name or incident type.
- **Filter Button**: Popover-based filtering for status, incident type, and date range.
- **Export PDF Button**: Primary button to export selected reports or the current filtered view as a PDF.

### Responder Reports Table
A high-density data table with row selection capabilities.
- **Columns**:
    - **Selection**: Checkbox for individual or bulk row selection.
    - **Responder Name**: Full name of the responder (e.g., "Bastes, Renzy").
    - **Incident Type**: Descriptive label (e.g., "Fire Emergency").
    - **Status**: Colored badge indicating the submission status (`DRAFT` or `SUBMITTED`).
    - **Date & Time**: Multi-line cell with the date (e.g., "21 March 2026") and time (e.g., "09:43 AM").
    - **Location**: Scene location string (e.g., "Brgy. Sabang, Baliwag City").
    - **Action**: "VIEW" button to open the detailed report sheet.
- **Pagination**: Circular navigation buttons (1, 2, 3...) with prev/next arrows matching the design.

### Incident Detail Sheet
A slide-over sheet (Shadcn `Sheet`) triggered by the "VIEW" button.
- **Metadata**: Display Case ID, Responder Name, and Vehicle ID.
- **Photos**: Gallery of scene photos uploaded by the responder.
- **Incident Logs**: Step-by-step timeline of the response (Dispatch -> Arrival -> Resolution).
- **Narrative**: The descriptive outcome and findings submitted by the responder.
- **Participants**: List of victims or involved parties with triage statuses.

## Frontend Implementation

1. **Schemas & Types (`types/reports.ts`)**:
   ```typescript
   import { z } from "zod";

   export const ReportStatusSchema = z.enum(["DRAFT", "SUBMITTED"]);
   export type ReportStatus = z.infer<typeof ReportStatusSchema>;

   export const IncidentTypeSchema = z.enum([
     "Fire Emergency",
     "Vehicular Collision",
     "Medical Emergency",
     "Structural Failure",
     "Flood/Water",
     "Unknown Cause"
   ]);
   export type IncidentType = z.infer<typeof IncidentTypeSchema>;

   export const ReportEntrySchema = z.object({
     id: z.string(), // Case ID
     responderName: z.string(),
     type: IncidentTypeSchema,
     status: ReportStatusSchema,
     date: z.string(), // e.g., "21 March 2026"
     time: z.string(), // e.g., "09:43 AM"
     location: z.string(),
   });
   export type ReportEntry = z.infer<typeof ReportEntrySchema>;

   export const ReportFilterSchema = z.object({
     search: z.string().optional(),
     type: IncidentTypeSchema.optional(),
     status: ReportStatusSchema.optional(),
     dateRange: z.object({
       from: z.date().optional(),
       to: z.date().optional(),
     }).optional(),
   });
   export type ReportFilter = z.infer<typeof ReportFilterSchema>;
   ```

2. **Components**:
   - `ReportsHeader.tsx`: Contains the title and the search/filter/export actions within the blue header.
   - `ReportsTable.tsx`: Uses `@tanstack/react-table` with checkboxes and custom cell renderers.
   - `ReportDetailSheet.tsx`: High-fidelity slide-over for full report inspection.

## Backend Architecture

1. **REST API Endpoints (`app/api/reports/`)**:
   - `GET /api/reports`: Returns paginated and filtered incident reports.
   - `GET /api/reports/[id]`: Returns detailed data for a specific report (photos, logs, participants).
   - `POST /api/reports/export`: Generates a PDF for the selected Case IDs.

## Design Alignment Checklist
- [ ] Table header is inside a `bg-[#1E3A8A]` card.
- [ ] "VIEW" buttons are styled as small, navy-blue buttons.
- [ ] Status badges match the `DRAFT` (Yellow/Orange) and `SUBMITTED` (Green) colors.
- [ ] Date and Time are stacked within a single cell.
- [ ] Checkboxes are consistently aligned.
- [ ] All typography uses the `Inter` font family.
