# Feature Spec 08: Status & Logs (CDRRMO Super Admin)

## Overview
Implement a real-time activity tracking system that logs every significant action taken by responders. This interface allows **CDRRMO Super Admins** to audit the sequence of events for any incident, monitor shift changes, and verify responder status transitions in a chronological "audit trail" format.

## Requirements

### Logs Header Actions (Blue Card Header)
- **Card Styling**: The log table is contained within a Shadcn `Card` with a `bg-[#1E3A8A]` (Navy Blue) header area.
- **Search Bar**: "Search reports..." input to search logs by responder name or incident ID (within the log description).
- **Filter Button**: Popover-based filtering for status types and date ranges.

### Status & Logs Table
A high-density data table displaying a chronological stream of events.
- **Columns**:
    - **Date & Time**: Multi-line cell with the date (e.g., "21 March 2026") and time (e.g., "09:43 AM").
    - **Responder Name**: Full name of the responder (e.g., "Bastes, Renzy").
    - **Log**: A descriptive string of the activity (e.g., "Dispatched to DR-2026-0047", "Shift started", "Returned from DR-2026-0044").
    - **Status**: Current status of the responder at the time of the log (e.g., `DISPATCHED` = Blue, `STANDBY` = Green).
    - **Action**: The specific action trigger or result (e.g., `DISPATCHED`, `COMPLETED`, or `-` for system events like shift starts).
- **Pagination**: Circular navigation buttons (1, 2, 3...) with prev/next arrows matching the design.

### Real-Time Updates
- The table must update instantly via Supabase Realtime as new logs are inserted into the `activity_logs` table.
- New entries should appear at the top of the list (descending chronological order).

## Frontend Implementation

1. **Schemas & Types (`types/logs.ts`)**:
   ```typescript
   import { z } from "zod";

   export const LogStatusSchema = z.enum(["DISPATCHED", "STANDBY", "ON-SCENE", "OFF-DUTY"]);
   export type LogStatus = z.infer<typeof LogStatusSchema>;

   export const LogActionSchema = z.enum(["DISPATCHED", "COMPLETED", "ARRIVED", "STARTED", "ENDED", "NONE"]);
   export type LogAction = z.infer<typeof LogActionSchema>;

   export const StatusLogEntrySchema = z.object({
     id: z.string(),
     timestamp: z.string(), // ISO or formatted
     date: z.string(), // e.g., "21 March 2026"
     time: z.string(), // e.g., "09:43 AM"
     responderName: z.string(),
     logDescription: z.string(),
     status: LogStatusSchema,
     action: LogActionSchema,
   });
   export type StatusLogEntry = z.infer<typeof StatusLogEntrySchema>;

   export const LogFilterSchema = z.object({
     search: z.string().optional(),
     status: LogStatusSchema.optional(),
     dateRange: z.object({
       from: z.date().optional(),
       to: z.date().optional(),
     }).optional(),
   });
   export type LogFilter = z.infer<typeof LogFilterSchema>;
   ```

2. **Components**:
   - `LogsHeader.tsx`: Contains the "Responder Status & Logs" title and search/filter actions.
   - `LogsTable.tsx`: Uses `@tanstack/react-table` for the event stream.
   - `LogCell.tsx`: Specialized renderer for the "Log" description, potentially highlighting incident IDs.

## Backend Architecture

1. **Database Schema (`db/schema/logs.ts`)**:
   - `activity_logs` table: `id`, `responder_id`, `incident_id` (optional), `type` (enum), `description`, `created_at`.

2. **REST API Endpoints (`app/api/logs/`)**:
   - `GET /api/logs`: Returns paginated and filtered activity logs.
   - Supports searching within the `description` and `responder_name` fields.

3. **Real-Time Hookup**:
   - Realtime subscription on `activity_logs` table with row-level security ensuring only admins see the full stream.

## Design Alignment Checklist
- [ ] Table header is inside a `bg-[#1E3A8A]` card.
- [ ] Date and Time are stacked within the first column.
- [ ] Status and Action badges use consistent color coding from `ui-context.md`.
- [ ] Log descriptions are clear and formatted correctly.
- [ ] Pagination follows the rounded-circle style from the reference design.
- [ ] All typography uses the `Inter` font family.
