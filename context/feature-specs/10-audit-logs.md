# Feature Spec 10: Audit Logs (CDRRMO Super Admin)

## Overview
Implement a system-wide audit trail to track administrative and user activities. This interface allows **CDRRMO Super Admins** to monitor who did what and when, providing accountability and security oversight for all sensitive operations (e.g., dispatching, user role changes, report exports).

## Requirements

### Audit Log Header Actions (Blue Card Header)
- **Card Styling**: The log table is contained within a Shadcn `Card` with a `bg-[#1E3A8A]` (Navy Blue) header area.
- **Search Bar**: "Search reports..." input to search logs by user name or action description.
- **Filter Button**: Popover-based filtering for user roles and date ranges.

### Audit Log Table
A high-density table displaying chronological administrative events.
- **Columns**:
    - **USER**: Full name of the person performing the action (e.g., "Guanzing, Toper").
    - **ACTION**: 
        - **Primary Action**: Bold description of the event (e.g., "Accepted Ambulance Dispatch DR-2026-0047").
        - **Context Path**: Sub-text showing the navigation or system path (e.g., "Home > Notifications > CDRRMO Updates").
    - **DATE & TIME**: Multi-line cell with the date (e.g., "21 March 2026") and time (e.g., "09:43 AM").
- **Pagination**: Circular navigation buttons (1, 2, 3...) with prev/next arrows matching the design.

### Tracking Logic
- Every mutation in the system (POST/PATCH/DELETE) must generate an audit log entry.
- Key read actions (e.g., viewing sensitive reports or notifications) should also be logged.
- Logs are immutable; once written, they cannot be edited or deleted through the UI.

## Frontend Implementation

1. **Schemas & Types (`types/audit.ts`)**:
   ```typescript
   import { z } from "zod";

   export const AuditLogEntrySchema = z.object({
     id: z.string(),
     userName: z.string(),
     action: z.string(), // Primary description
     contextPath: z.string(), // Breadcrumb/System path
     timestamp: z.string(), // ISO or formatted
     date: z.string(), // e.g., "21 March 2026"
     time: z.string(), // e.g., "09:43 AM"
   });
   export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

   export const AuditFilterSchema = z.object({
     search: z.string().optional(),
     userId: z.string().optional(),
     dateRange: z.object({
       from: z.date().optional(),
       to: z.date().optional(),
     }).optional(),
   });
   export type AuditFilter = z.infer<typeof AuditFilterSchema>;
   ```

2. **Components**:
   - `AuditHeader.tsx`: Contains the "Audit Log" title and search/filter actions.
   - `AuditTable.tsx`: Uses `@tanstack/react-table` for the event stream.
   - `ActionCell.tsx`: Specialized renderer for the action column, stacking the bold description and the context path.

## Backend Architecture

1. **Database Schema (`db/schema/audit.ts`)**:
   - `audit_logs` table: `id`, `user_id`, `action`, `context_path`, `ip_address` (optional), `metadata` (JSONB for details), `created_at`.

2. **REST API Endpoints (`app/api/audit/`)**:
   - `GET /api/audit`: Returns paginated and filtered audit logs.
   - Restrict access strictly to the `cdrrmo_super_admin` role.

3. **Middleware/Utility**:
   - Create a `lib/audit.ts` utility to easily insert logs from anywhere in the backend (API routes or Server Actions).

## Design Alignment Checklist
- [ ] Table header is inside a `bg-[#1E3A8A]` card.
- [ ] Action column correctly stacks the bold title and greyed-out context path.
- [ ] Date and Time are stacked within the final column.
- [ ] Pagination follows the rounded-circle style from the reference design.
- [ ] All typography uses the `Inter` font family.
