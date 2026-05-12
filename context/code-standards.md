# Code Standards

## General

- Keep modules small and single-purpose.
- Fix root causes — do not layer workarounds.
- Do not mix unrelated concerns in one component or route.
- Respect the system boundaries defined in `architecture-context.md`.
- The REST API is the single source of truth — mobile and web are both consumers.

## TypeScript

- Strict mode is required throughout the project (Next.js and Expo).
- Avoid `any`; use explicit interfaces or narrowly scoped types.
- Validate unknown external input at system boundaries (API routes, form submissions) before trusting it.
- Use `interface` for object contracts.
- Use Zod for runtime validation of all API inputs and form data.

## Next.js (Web Dashboard)

- Default to React Server Components.
- Add `"use client"` only when the component needs browser interactivity, hooks, or real-time state.
- Keep route handlers focused on a single responsibility.
- All API routes live under `app/api/` and follow RESTful conventions.
- Enforce Clerk auth and role checks in every API route handler before any mutation.
- Verify account verification status for mobile user requests at the API level.

## Expo (Android Mobile App)

- Follows the same TypeScript strict-mode and Zod validation rules.
- Consumes the Next.js REST API — no direct database access from the mobile client.
- Enforce the verification gate on the client side: unverified users see only the pending-approval screen.
- Handle offline scenarios gracefully — drafts are stored locally and synced when connectivity restores.
- GPS and camera permissions are requested only when needed (just-in-time).

## Database & ORM (Drizzle + Supabase PostgreSQL)

- All database access goes through Drizzle ORM — no raw SQL in application code.
- Schema definitions live in `db/schema/` with logical grouping (users, incidents, dispatches, reports, notifications).
- Migrations are managed via Drizzle Kit (`drizzle-kit generate` and `drizzle-kit push`).
- Use Supabase Row Level Security (RLS) policies as a defense-in-depth layer — not as the primary auth mechanism.
- Foreign keys and constraints are defined in the schema — do not rely on application-level enforcement alone.

## File Storage (Supabase Storage)

- Binary assets (government IDs, scene photos, exported PDFs) go in Supabase Storage buckets.
- The bucket path/URL is stored in the database as the reference — never store binary data in PostgreSQL.
- Bucket structure: `ids/{userId}/`, `scenes/{incidentId}/`, `exports/`.
- Validate file type and size on upload before persisting.

## Real-Time (Supabase Realtime)

- Use Supabase Realtime channels for all live data sync — no polling.
- Scope channels by role and context to minimize data transfer.
- Handle connection drops and reconnection gracefully on both web and mobile clients.

## Mapping (OpenFreeMap + MapLibre)

- All mapping uses OpenFreeMap tiles + MapLibre GL — no paid services.
- Web: MapLibre GL JS. Mobile: MapLibre React Native (or equivalent Expo-compatible library).
- GPS coordinates are captured at the device level and validated before storage.

## Authentication & Authorization (Clerk)

- All routes (API and page) are protected by Clerk middleware.
- Roles are stored in Clerk user metadata: `public_user`, `ambulance_responder`, `pacc_admin`, `cdrrmo_super_admin`.
- Every API mutation checks both authentication (is the user logged in?) and authorization (does their role permit this action?).
- Account verification status is checked for all mobile-user API requests — unverified users receive a 403.

## Notifications

- In-app only — no push notification infrastructure.
- Notification records are stored in the database and delivered via Supabase Realtime.
- All notification types use a consistent schema (type, title, body, read status, timestamp, recipient).

## API Routes

- Validate and parse request input with Zod before any logic runs.
- Enforce Clerk auth and role-based permission checks before any mutation.
- Return consistent, predictable JSON response shapes (`{ data, error, message }`).
- Keep route handlers thin — push complexity into shared modules in `lib/`.
- Use appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 500).

## File Organization

### Next.js Web App

- `app/(dashboard)/` — Authenticated dashboard pages (PACC Admin, CDRRMO Super Admin).
- `app/(auth)/` — Sign-in, sign-up, and verification pages.
- `app/api/` — REST API route handlers.
- `lib/` — Shared infrastructure: Drizzle client, auth helpers, validation schemas, utilities.
- `components/` — UI composition only; no business logic.
- `db/` — Drizzle schema, migrations, and seed scripts.

### Expo Mobile App

- Follows standard Expo file structure with screens, components, hooks, and services directories.
- `services/` — API client functions that call the Next.js REST API.
- `stores/` — Local state management (offline drafts, cached data).
- Name files after the responsibility they contain, not the technology.
