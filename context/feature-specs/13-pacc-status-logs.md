# Feature Spec 13: Status & Logs (PACC Admin)

## Overview
Implement a real-time activity tracking system for the **PACC Admin**. This interface provides an audit trail of responder activities, shift changes, and status transitions, matching the specific needs of a dispatcher. It will reuse the existing components created for the CDRRMO Super Admin to ensure visual consistency and minimize code duplication.

## Requirements

### Shared Component Reusability
The PACC Admin Status & Logs page will leverage the existing components built for Feature 08 (`context/feature-specs/08-status-logs.md`).
- **`LogsHeader.tsx`**: Used for the blue header, search input, and filter popover.
- **`LogsTable.tsx`**: Used for displaying the tabular data. **Modification Required**: The PACC Admin design image does *not* include the "Action" column shown in the Super Admin view. The `LogsTable` component must be updated to conditionally hide the "Action" column based on a new prop (e.g., `hideActionColumn?: boolean`) passed by the parent page based on the user's role.

### UI & Design Alignment
- Follow the design specified in `@context/design-image/PACCAdmin/Status & Logs.png`.
- Ensure the table only displays: `DATE & TIME`, `RESPONDER NAME`, `LOG`, and `STATUS`.
- Ensure the pagination remains circular and bottom-aligned.

### Data & State Management
- Data fetching must be aware of the user's role. The API endpoints should serve the full set of logs.
- Maintain Zod schemas defined in `types/logs.ts` (e.g., `StatusLogEntrySchema`, `LogStatusSchema`) strictly. Do not use `any` or `unknown` types.

## Backend Architecture

1. **REST API Endpoints (`app/api/logs/`)**:
   - `GET /api/logs`: Fetch activity logs. The existing endpoint must ensure it handles the `pacc_admin` role check in addition to `cdrrmo_super_admin`.

2. **Real-Time Synchronization**:
   - Supabase Realtime subscriptions must enforce Row Level Security (RLS) or channel filtering appropriate for the `pacc_admin` role, allowing them to see the stream of activity as it happens.

## Frontend Implementation

1. **Page Component (`app/(dashboard)/logs/page.tsx`)**:
   - Detect the current user's role using the Supabase JWT claim or a shared context/utility.
   - Pass the role to the `LogsTable` (or a `hideActionColumn` boolean) to ensure the table renders correctly for the PACC Admin.

## Design Alignment Checklist
- [ ] Table header uses the `bg-[#1E3A8A]` Navy Blue card header.
- [ ] "Action" column is hidden when viewed by a PACC Admin.
- [ ] Existing `LogsHeader.tsx` and `LogsTable.tsx` are successfully reused.
- [ ] All data is strictly typed using existing Zod schemas in `types/logs.ts`.
