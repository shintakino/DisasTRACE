# Feature Spec 09: User Management (CDRRMO Super Admin)

## Overview
Implement a centralized user administration dashboard for the **CDRRMO Super Admin**. This interface provides full control over system access, allowing admins to monitor user activity, manage roles (Public User, Responder, PACC Admin), and enforce security policies like account suspension or deactivation.

## Requirements

### User Summary Cards (Top Row)
Four high-visibility cards displaying aggregated user metrics.
- **Total Users**: Overall count of registered accounts.
- **Active**: Accounts currently in good standing and verified.
- **Suspended**: Accounts temporarily blocked due to policy violations or pending investigation.
- **Deactivated**: Accounts permanently disabled or withdrawn.

### Users Management Table
A high-density administrative table with bulk action support.
- **Header Actions (Blue Header)**:
    - **Search Bar**: "Search reports..." input to search by name or email.
    - **Filter Button**: Filter by Role (Public User, Responder, PACC Admin) and Status.
    - **Export PDF Button**: Export the current user list or selected users to a PDF report.
- **Columns**:
    - **Selection**: Checkbox for individual or bulk user management.
    - **Full Name**: User's display name (e.g., "Bastes, Renzy").
    - **Email Address**: Primary contact email.
    - **Status**: Colored badge (e.g., `ACTIVE` = Green, `SUSPENDED` = Orange, `DEACTIVATED` = Red).
    - **Role**: User's system role in uppercase (e.g., `RESPONDER`).
    - **Joined Date**: Formatting: "Month Day, Year" (e.g., "March 25, 2025").
    - **Last Active**: Relative time string (e.g., "Active now", "10 days ago", "15 minutes ago").
    - **Action**: 
        - **Manage Status Icon**: Opens a dialog to suspend, ban, or reactivate the user.
        - **Delete Icon**: Permanent account removal with a confirmation prompt.

### Administrative Actions
- **Suspend/Ban**: Requires a mandatory "Reason for Suspension" text field.
- **Role Management**: Ability to upgrade/downgrade user permissions (e.g., promoting a Responder to a PACC Admin).
- **Verification Review**: Direct link to the user's verification documents (if applicable).

## Frontend Implementation

1. **Schemas & Types (`types/users.ts`)**:
   ```typescript
   import { z } from "zod";

   export const UserStatusSchema = z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED", "PENDING"]);
   export type UserStatus = z.infer<typeof UserStatusSchema>;

   export const UserRoleSchema = z.enum([
     "public_user",
     "ambulance_responder",
     "pacc_admin",
     "cdrrmo_super_admin"
   ]);
   export type UserRole = z.infer<typeof UserRoleSchema>;

   export const UserManagementEntrySchema = z.object({
     id: z.string(),
     fullName: z.string(),
     email: z.string().email(),
     status: UserStatusSchema,
     role: UserRoleSchema,
     joinedDate: z.string(),
     lastActive: z.string(),
   });
   export type UserManagementEntry = z.infer<typeof UserManagementEntrySchema>;

   export const UserFilterSchema = z.object({
     search: z.string().optional(),
     role: UserRoleSchema.optional(),
     status: UserStatusSchema.optional(),
   });
   export type UserFilter = z.infer<typeof UserFilterSchema>;
   ```

2. **Components**:
   - `UserSummaryCards.tsx`: Stat cards with icons matching the "UserManagement.png" reference.
   - `UsersTable.tsx`: Uses `@tanstack/react-table` with row selection and status badges.
   - `UserActionDialogs.tsx`: Modals for banning, deleting, or editing user roles.

## Backend Architecture

1. **REST API Endpoints (`app/api/users/`)**:
   - `GET /api/users`: Paginated and filtered list of users (Role: `cdrrmo_super_admin` only).
   - `PATCH /api/users/[id]/status`: Update status with a required `reason` field.
   - `PATCH /api/users/[id]/role`: Update the user's role in Clerk metadata.
   - `DELETE /api/users/[id]`: Permanent deletion from both Clerk and the database.

2. **Clerk Integration**:
   - Use Clerk's Backend SDK to update `publicMetadata` for role changes.
   - Sync status changes to a local `users` table for faster querying and reporting.

## Design Alignment Checklist
- [ ] Summary cards match the exact icons and color scheme from the design.
- [ ] Users table header uses the `bg-[#1E3A8A]` Navy Blue card header.
- [ ] Role labels are shown in uppercase (e.g., RESPONDER).
- [ ] Status badges follow the Light Mode color system (Green/Orange/Red).
- [ ] Action icons (User-Ban, Trash) are consistently styled.
- [ ] All typography uses the `Inter` font family.
