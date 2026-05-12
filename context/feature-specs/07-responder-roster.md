# Feature Spec 07: Responder Roster (CDRRMO Super Admin)

## Overview
Implement an attendance and shift management system for emergency responders. This interface allows **CDRRMO Super Admins** to monitor responder availability, track log hours, and audit shift attendance (check-in/check-out) for Baliwag City's emergency personnel.

## Requirements

### Roster Header Actions
- **Search Bar**: Search for responders by name or department.
- **Filter Button**: Open a popover or modal to filter by:
    - **Department**: (e.g., RESCUE FIVE, PACC, etc.)
    - **Status**: (e.g., PRESENT, ABSENT, ON-LEAVE, ON-DUTY)
    - **Date**: Select a specific day to view historical roster data.

### Responder Table
A high-fidelity data table displaying shift attendance.
- **Columns**:
    - **Full Name**: Responder's display name.
    - **Department**: The unit they belong to (e.g., `RESCUE FIVE`).
    - **Check In Time**: Time the responder started their shift (e.g., `07:32 AM`).
    - **Check Out Time**: Time the responder ended their shift (e.g., `05:21 PM`).
    - **Log Hours**: Total duration of the shift (formatted as `HH:MM:SS`).
    - **Status**: Colored badge indicating current presence (e.g., `PRESENT` = Green).
- **Pagination**: Standard controls (1, 2, 3... 10) with prev/next arrows.

### Attendance Logic
- **Real-Time Presence**: Responders "checking in" via their mobile app (Responder Flow) updates this table instantly via Supabase Realtime.
- **Shift Calculation**: The `Log Hours` should be calculated server-side or via a utility function based on the difference between check-in and check-out times.

## Frontend Implementation

1. **Schemas & Types (`types/roster.ts`)**:
   ```typescript
   import { z } from "zod";

   export const RosterStatusSchema = z.enum(["PRESENT", "ABSENT", "ON-LEAVE", "ON-DUTY"]);
   export type RosterStatus = z.infer<typeof RosterStatusSchema>;

   export const RosterEntrySchema = z.object({
     id: z.string(),
     fullName: z.string(),
     department: z.string(),
     checkIn: z.string().nullable(), // Nullable if they haven't checked in yet
     checkOut: z.string().nullable(), // Nullable if they are still on duty
     logHours: z.string().optional(), // "HH:MM:SS"
     status: RosterStatusSchema,
   });
   export type RosterEntry = z.infer<typeof RosterEntrySchema>;

   export const RosterFilterSchema = z.object({
     search: z.string().optional(),
     department: z.string().optional(),
     status: RosterStatusSchema.optional(),
     date: z.date().optional(),
   });
   export type RosterFilter = z.infer<typeof RosterFilterSchema>;
   ```

2. **Components**:
   - `RosterTable.tsx`: Uses `@tanstack/react-table` with the specific high-fidelity styling (Blue header card).
   - `RosterSearch.tsx`: Custom search input component.
   - `RosterFilter.tsx`: Popover-based filtering system.

## Backend Architecture

1. **REST API Endpoints (`app/api/roster/`)**:
   - `GET /api/roster`: Returns paginated and filtered attendance records for the current day.
   - `GET /api/roster/history`: Returns historical attendance data for audit purposes.

2. **Real-Time Sync**:
   - Subscribe to the `responder_attendance` table in Supabase to reflect check-ins/outs without page refreshes.

## Design Alignment Checklist
- [ ] Table is wrapped in a Shadcn `Card` with a `bg-[#1E3A8A]` header (Navy Blue).
- [ ] Columns match the "ResponderRoster.png" reference exactly.
- [ ] Status badges use the `bg-green-100 text-green-700` styling for "PRESENT".
- [ ] Pagination follows the rounded-circle style shown in the design.
- [ ] All typography uses the `Inter` font family.
