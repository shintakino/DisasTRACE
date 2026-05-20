# Feature Spec 22: Dashboard Auth & Role Sync Fix

## Overview
This specification addresses the issue where CDRRMO Super Admin and PACC Admin users are unable to see dashboard data after the migration from Clerk to Supabase Auth. The dashboard displays an access/authorization error because the custom role claims are missing from the logged-in user's Supabase JWT (`app_metadata.role`).

## Problem Analysis
During the Supabase Auth migration, the system was designed to propagate user roles from the `public.users` table to `auth.users.raw_app_meta_data` via a Postgres database trigger (`on_user_role_sync`). However, this trigger failed to apply and execute successfully due to the following issues:

1. **Type Mismatch on User ID**:
   - In `public.users`, the `id` column is a `character varying` (varchar).
   - In `auth.users`, the `id` column is a `uuid`.
   - In the trigger function `handle_update_user_role_and_status` and the initial sync block, the ID comparison was written as `where id = new.id` or `where id = r.id`. 
   - This comparison causes Postgres to throw a type mismatch error: `operator does not exist: uuid = character varying`.

2. **Transaction Abortion during RBAC setup**:
   - Because of this type mismatch, executing `db/rbac-setup.sql` threw an error during the initial sync step.
   - The transaction was aborted, preventing the trigger `on_user_role_sync` from being successfully created.
   - Consequently, when user accounts were seeded or created, their roles never synced to their `auth.users` app metadata, leaving the JWT claims empty.

3. **API Response Failure**:
   - When an admin logged in and loaded the dashboard, the page made requests to `/api/dashboard/kpis` (and others).
   - The API route handler parsed the JWT via `getUserRole()`, which fell back to `'public_user'` due to the missing role claim.
   - The API returned a `403 Forbidden` response, causing the dashboard page to fail validation and display the access error screen.

## Requirements

### 1. Fix Database Trigger & Functions
Update `db/rbac-setup.sql` to resolve the type mismatch:
- Check if the varchar user ID matches a valid UUID format using regex: `^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`.
- Explicitly cast the `character varying` ID to `uuid` (i.e. `id = new.id::uuid` or `id = r.id::uuid`) when querying/updating `auth.users`.
- Ensure status syncing is robust.

### 2. Update Database Seeding Script
Update `scripts/seed-supabase.ts` to:
- Explicitly set `status: 'ACTIVE'` and `verification_status: 'APPROVED'` (in uppercase matching the schema enums) during initial upsert.
- Clean up any previous incomplete sync data.

### 3. Re-apply SQL and Seed the Database
- Execute the corrected `db/rbac-setup.sql` to install the functions and triggers in the Supabase database.
- Execute `scripts/seed-supabase.ts` to recreate the users with correct roles.
- Run an inspection script to verify that `auth.users` now correctly contains the role in `raw_app_meta_data`.

## Verification Criteria
- [ ] Running the DB trigger and sync scripts completes successfully with no Postgres type errors.
- [ ] Seeding script executes successfully.
- [ ] Users in `auth.users` have their `role` and `status` fields present inside their `app_metadata`.
- [ ] Accessing `/api/dashboard/kpis` as `admin@disastrace.com` returns the correct mock KPI data with a 200 OK status.
- [ ] Accessing the web dashboard page loads the full KPI cards, charts, and tables without error.
