# Architecture Context

## Stack

| Layer              | Technology                            | Role                                                                   |
| ------------------ | ------------------------------------- | ---------------------------------------------------------------------- |
| Full-Stack Framework | Next.js + TypeScript                | Web dashboard (frontend + backend REST API)                            |
| Mobile App         | Expo (React Native, Android only)     | Public User and Ambulance Responder mobile client                      |
| Auth               | Clerk                                 | User identity, role-based access, route protection                     |
| Database           | PostgreSQL (hosted by Supabase)       | Relational data: users, incidents, dispatches, reports, verifications  |
| ORM                | Drizzle ORM                           | Type-safe database queries and schema management                       |
| Real-Time Sync     | Supabase Realtime                     | Live dispatch notifications, incident updates, status changes          |
| File Storage       | Supabase Storage                      | Government ID uploads, scene photos, generated report PDFs             |
| Mapping            | OpenFreeMap + MapLibre GL             | Real-time maps, ambulance tracking, hospital views (free, no API key)  |
| Mobile Verification| textbee.dev                           | OTP SMS delivery for phone number verification                         |
| Notifications      | In-App only                           | No push notifications or external services                             |

## System Boundaries

### Next.js Web App

- `app/(dashboard)/` — Authenticated web dashboard pages for PACC Admin and CDRRMO Super Admin.
- `app/api/` — REST API route handlers: input validation, auth checks, CRUD operations, dispatch logic.
- `lib/` — Shared infrastructure: Drizzle client, auth helpers, validation schemas, utilities.
- `components/` — UI composition: maps, data tables, dashboards, forms, and interactive elements.
- `db/` — Drizzle schema definitions, migrations, and seed scripts.

### Expo Mobile App

- Separate Expo project for Android — consumes the Next.js REST API.
- Handles: registration, incident reporting, GPS tracking, dispatch acceptance, offline drafts.
- Enforces verification gate locally — blocks all screens until the API confirms account is verified.

## Storage Model

- **PostgreSQL (Supabase)**: All relational data — users, incidents, dispatches, responder reports, verification records, activity logs, notification records.
- **Supabase Storage**: Binary assets — government ID photos at `ids/{userId}/`, scene photos at `scenes/{incidentId}/`, exported PDFs at `exports/`.
- **Drizzle ORM**: All database access goes through Drizzle — no raw SQL in application code.
- The storage bucket URL/path is stored in the database as the reference to the file.

## Auth and Verification Model

### Authentication

- All users authenticate via Clerk (web and mobile).
- Clerk manages user identity, sessions, and JWT tokens.
- Role-based access control (RBAC) is enforced via Clerk user metadata:
  - `public_user` — Public User
  - `ambulance_responder` — Ambulance Responder
  - `pacc_admin` — PACC Admin (Dispatcher)
  - `cdrrmo_super_admin` — CDRRMO Super Admin

### Account Verification Gate

- Mobile users (Public User, Ambulance Responder) must be verified before accessing any app functionality.
- Verification status is stored in the database (`verification_status`: `pending`, `approved`, `rejected`).
- Both **PACC Admin** and **CDRRMO Super Admin** can approve or reject pending registrations.
- The mobile app checks verification status on every session — unverified users see only a pending-approval screen.
- Rejection includes an optional reason; the user may re-submit.
- Rejection notification is sent via textbee.dev SMS gateway.

### OTP Verification

- Phone number verification during registration uses textbee.dev (open-source SMS gateway).
- OTP is validated server-side before the registration is finalized.

## Real-Time Model

- **Supabase Realtime** powers all live data synchronization:
  - New incident reports → PACC Admin dashboard.
  - Dispatch assignments → Ambulance Responder mobile app.
  - Ambulance GPS position updates → Public User tracking screen and admin map.
  - Responder status changes → Admin status monitoring panels.
  - Notification delivery → In-app notification panels.
- Channels are scoped by role and incident context to minimize unnecessary data transfer.

## Mapping Model

- **OpenFreeMap** provides free, open-source map tiles — no API key, no payment.
- **MapLibre GL** renders interactive maps on both web (MapLibre GL JS) and mobile (MapLibre React Native).
- Used for: incident location display, ambulance real-time tracking, hospital map view, route visualization.
- GPS coordinates are captured at the device level and transmitted with incident reports.

## Notification Model

- **In-app notifications only** — no push notifications, no external services.
- Notifications are stored in the database and delivered via Supabase Realtime subscriptions.
- Notification types: report verification updates, dispatch alerts, incident resolutions, account verification results, pending registration alerts (for admins).
- Both all/unread filtering is supported in the notification panel.

## Invariants

1. Unverified mobile users are blocked from all app functionality — enforced at both API and client level.
2. Auth and role checks are enforced at every API mutation boundary.
3. All database access goes through Drizzle ORM — no raw SQL.
4. Binary assets (photos, IDs, PDFs) are stored in Supabase Storage, not in the database.
5. Real-time data flows through Supabase Realtime — no polling.
6. The REST API is the single source of truth — the mobile app and web dashboard are both consumers.
7. All mapping uses OpenFreeMap + MapLibre — no paid map services.
8. Notifications are in-app only — no external notification infrastructure.
