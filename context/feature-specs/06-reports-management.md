# Feature Spec 06: Reports Management (CDRRMO Super Admin)

## Overview
Implement a comprehensive incident reporting and data analysis center for the **CDRRMO Super Admin**. This interface allows admins to search, filter, and audit historical incident data, as well as export detailed reports for official documentation.

## Requirements

### Filter & Search Bar
A robust set of controls to narrow down incident records.
- **Search**: Text input to search by Case ID or Vehicle ID.
- **Date Range Picker**: Select "From" and "To" dates (default: last 30 days).
- **Incident Type**: Select dropdown (e.g., Vehicular, Medical, Structural, Fire, Water, Unknown).
- **Status Filter**: Select dropdown (e.g., NEW, ONGOING, COMPLETED, STANDBY).
- **Reset Button**: Clear all filters.

### Reports Data Table
A high-density table displaying all historical records using TanStack Table.
- **Columns**:
    - **Case ID**: Unique identifier (e.g., `DR-2026-0047`).
    - **Vehicle**: Ambulance ID (e.g., `AMB-001`).
    - **Incident Type**: Icon + Label (e.g., `Vehicular Collision`).
    - **Location**: Origin -> Destination summary (using the `MoveRight` and `MapPin` icons).
    - **Timestamp**: Date and time of the report.
    - **Status**: Colored badge matching status colors in `ui-context.md`.
    - **Actions**: "View Details" (opens a side sheet) and "Download PDF".
- **Pagination**: 10-20 records per page with next/prev controls.
- **Empty State**: Use the `Empty` component if no records match the criteria.

### Export Functionality
- **Export to PDF**: Generate a formal document for a specific incident report using the CDRRMO official header and seal.
- **Batch Export**: Ability to download a CSV or summary PDF of multiple filtered records.

### Incident Detail Sheet
A slide-over sheet (Shadcn `Sheet`) providing deep-dive info on a selected case.
- **Scene Photos**: Gallery of images uploaded from the field (stored in Supabase Storage).
- **Responder Logs**: Timeline of activities (Dispatched -> Arrived -> Resolved).
- **Outcome Summary**: Full notes and findings submitted by the responder.
- **Participant Details**: Information about the involved parties (names, contact, triage status).

## Frontend Implementation

1. **Schemas & Types (`types/reports.ts`)**:
   ```typescript
   import { z } from "zod";

   export const ReportStatusSchema = z.enum(["NEW", "ONGOING", "COMPLETED", "STANDBY"]);
   export type ReportStatus = z.infer<typeof ReportStatusSchema>;

   export const IncidentTypeSchema = z.enum([
     "Vehicular Collision",
     "Medical Emergency",
     "Structural Failure",
     "Fire/Explosion",
     "Flood/Water",
     "Unknown Cause"
   ]);
   export type IncidentType = z.infer<typeof IncidentTypeSchema>;

   export const ReportFilterSchema = z.object({
     search: z.string().optional(),
     dateFrom: z.date().optional(),
     dateTo: z.date().optional(),
     type: IncidentTypeSchema.optional(),
     status: ReportStatusSchema.optional(),
   });
   export type ReportFilter = z.infer<typeof ReportFilterSchema>;

   export const DetailedIncidentReportSchema = z.object({
     id: z.string(),
     vehicleId: z.string(),
     type: IncidentTypeSchema,
     origin: z.string(),
     destination: z.string(),
     timestamp: z.string(),
     status: ReportStatusSchema,
     responderName: z.string(),
     description: z.string().optional(),
     scenePhotos: z.array(z.string()), // URLs to Supabase Storage
     logs: z.array(z.object({
       action: z.string(),
       time: z.string(),
     })),
   });
   export type DetailedIncidentReport = z.infer<typeof DetailedIncidentReportSchema>;
   ```

2. **Components**:
   - `ReportsTable.tsx`: Main data grid using `@tanstack/react-table`.
   - `ReportFilters.tsx`: Container for the filter inputs and search bar.
   - `ReportDetailSheet.tsx`: The side-over sheet for deep-dive analysis.

## Backend Architecture

1. **REST API Endpoints (`app/api/reports/`)**:
   - `GET /api/reports`: Returns paginated and filtered incident records.
   - `GET /api/reports/[id]`: Returns full details for a single incident.
   - `GET /api/reports/export/[id]`: Generates a PDF for a single report.

2. **Data Aggregation**:
   - Use Drizzle ORM to join `incidents`, `dispatches`, and `responder_reports`.
   - All endpoints must enforce `cdrrmo_super_admin` role checks.

## Design Alignment Checklist
- [ ] Table rows use high-density styling with `Inter` font.
- [ ] Status badges match `ui-context.md` (e.g., COMPLETED = Green).
- [ ] Detailed sheet includes the scene photo gallery.
- [ ] PDF export includes the official CDRRMO seal and signature lines.
- [ ] Loading states use `Skeleton` components for the table rows.
