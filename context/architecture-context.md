# Architecture Context

## Stack

| Layer              | Technology                            | Role                                                                   |
| ------------------ | ------------------------------------- | ---------------------------------------------------------------------- |
| Full-Stack Framework | Next.js + TypeScript                | Web dashboard (frontend + backend REST API)                            |
| Mobile App         | Expo (React Native, Android only)     | Public User and Ambulance Responder mobile client                      |
| Auth               | Supabase Auth                         | User identity, role-based access (JWT claims), route protection        |
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

- **Report geography:** Each verification request stores the derived `barangay` and `barangayPsgcCode` from its GPS point. Assignment uses the checked-in City of Baliwag polygon subset sourced from the PSA GeoRisk Barangay Boundary service, rather than a reporter-entered address.

- **PostgreSQL (Supabase)**: All relational data — users, incidents, dispatches, responder reports, verification records, activity logs, notification records.
- **Supabase Storage**: Binary assets — government ID photos at `ids/{userId}/`, scene photos at `scenes/{incidentId}/`, exported PDFs at `exports/`. When a scene photo supplies EXIF GPS, its coordinates are retained as optional evidence metadata on the verification record; the separately captured report GPS remains the authoritative dispatch location.
- **Drizzle ORM**: All database access goes through Drizzle — no raw SQL in application code.
- The storage bucket URL/path is stored in the database as the reference to the file.

## Auth and Verification Model

### Authentication

- All users authenticate via Supabase Auth (web and mobile).
- Supabase manages user identity, sessions, and JWT tokens.
- Role-based access control (RBAC) is enforced via custom JWT claims:
  - Roles are stored in the `public.users` table.
  - A database trigger syncs the `role` to `auth.users` (`raw_app_meta_data`).
  - Next.js middleware (`proxy.ts`) parses the JWT to enforce route protection.
  - Roles:
    - `public_user` — Public User
    - `ambulance_responder` — Ambulance Responder
    - `pacc_admin` — PACC Admin (Dispatcher)
    - `cdrrmo_super_admin` — CDRRMO Super Admin

Public Users and Ambulance Responders sign in through the mobile-auth API. A single row in `mobile_device_sessions` holds a SHA-256 digest of the Android app-scoped identifier for each account; an atomic conditional upsert admits the original device and rejects a different active device. The raw device identifier is never stored. Dashboard/admin browser sessions are intentionally outside this mobile-only rule.

### Account Verification Gate

- Mobile users (Public User, Ambulance Responder) must be verified before accessing any app functionality.
- Verification status is stored in the database (`verification_status`: `pending`, `approved`, `rejected`).
- Only the **CDRRMO Super Admin** can approve or reject pending registrations. PACC Admins are excluded from registration approvals.
- The mobile app checks verification status on every session — unverified users see only a pending-approval screen.
- Rejection includes an optional reason; the user may re-submit.
- Rejection notification is sent via textbee.dev SMS gateway.

### Guest Emergency Exception and Initial Triage

- An unauthenticated device may use only the Emergency Chatbot and its report-status view. Guest reports have no `resident_id`; a random report access token returned only to the submitting device authorizes guest status reads. Guests cannot access tabs, history, profile data, or protected APIs. Because a guest has no Supabase session, the guest pending and response-status views refresh that scoped token API every three seconds instead of subscribing directly to protected database Realtime channels.
- Approved residents and guests use the same validated REST intake. Guests provide a valid Philippine mobile callback number; the registered route derives that number from the verified account record rather than trusting device input. Both record incident details, an exact people-affected count, condition, automatic GPS, a nearby landmark/reference, and required evidence. Both chatbots automatically request foreground location permission and cannot proceed without a GPS capture inside the Baliwag City service boundary; the client explains an out-of-area capture and the API rejects it as a defense in depth.
- Guest chatbot evidence is uploaded through `POST /api/emergency-intake/evidence`, which validates a 5MB JPEG/PNG/WebP file and uses the server storage client. This avoids granting unauthenticated guest devices direct Storage write access; the endpoint returns the public incident-photo URL used by intake.
- The API records deterministic initial triage with reasons: `HIGH_CONFIDENCE_EMERGENCY`, `HIGH_CONFIDENCE_NON_EMERGENCY`, `UNCERTAIN_INCOMPLETE`, or `SUSPICIOUS_POSSIBLE_PRANK`. Only the first class starts automated ambulance dispatch. PACC receives the other classes and can override any classification.
- The mobile incident selector classifies `Patient Transport`, `Other / non-emergency request`, and `Unknown Cause` as non-emergency; the server normalizes all remaining categories to emergency so client-side changes cannot downgrade emergency categories.
- If a high-confidence emergency initially has no eligible nearby unit, it remains visible to PACC as `PENDING`. A responder changing to `ON_DUTY` or publishing a fresh GPS location runs a bounded first-in, first-out retry of that confirmed-emergency queue. An unexpired offer retains the responder for its first request; after a timed-out offer with no alternate unit, that report remains an unassigned PACC item while the released responder may be offered to the next waiting report. Automatic dispatch, PACC manual dispatch, and PACC rejection serialize on the same locked verification-request row, re-read incident/responder state inside the transaction, and use atomic responder reservations to prevent duplicate incidents, double assignment, or deletion of a newly created offer. Manual selection is limited to active, approved, on-duty responders with a fresh one-minute location heartbeat. Responder acceptance atomically changes the incident to `EN_ROUTE`; timeout/rejection cascading must first atomically claim the still-current offer, so acceptance and reassignment cannot both win. The server remains the source of truth.
- PACC-recorded coordination agencies live on the verification request and are delivered through its existing Realtime updates. The client derives human-readable coordination text from one or more recorded agencies and the actual incident/dispatch state. PNP, BFP, and other agencies are coordination entries; only ambulance responders are auto-dispatched by this system.
- CDRRMO Super Admins control the lifetime Guest Mode report limit through the singleton `system_settings` row. A new guest report must remain below that limit for both its normalized Philippine mobile number and its SHA-256 Android app-scoped device digest. The raw Android identifier is never stored; `verification_requests.guest_device_hash` and `guest_device_report_quotas` retain only the digest and its reserved report count. A retry for the same chatbot submission from the same phone and device never consumes another allowance; new reports receive a controlled `429` once either quota reaches `guest_reports_per_phone_limit`. The phone number is a routing/contact value, not proof of ownership, and the device digest is an abuse-control signal rather than hardware attestation.

### OTP Verification

- Phone number verification during registration uses textbee.dev (open-source SMS gateway).
- OTP is validated server-side before the registration is finalized.

## Real-Time Model

- **Supabase Realtime** powers all authenticated live data synchronization:
  - New incident reports → PACC Admin dashboard.
  - Dispatch assignments → Ambulance Responder mobile app.
  - Ambulance GPS position updates → Public User tracking screen and admin map.
  - Responder status changes → Admin status monitoring panels.
  - Notification delivery → In-app notification panels.
- Channels are scoped by role and incident context to minimize unnecessary data transfer. Guest response-state synchronization uses the restricted report-status API with the per-report token rather than exposing a direct anonymous Realtime subscription.

## Mapping Model

- **OpenFreeMap** provides free, open-source map tiles — no API key, no payment.
- **MapLibre GL** renders interactive maps on both web (MapLibre GL JS) and mobile (MapLibre React Native).
- Used for: incident location display, ambulance real-time tracking, hospital map view, route visualization.
- GPS coordinates are captured at the device level and transmitted with incident reports.

## Notification Model

- Notifications are stored in the database and delivered via Supabase Realtime subscriptions while the app is active.
- Responder dispatch offers additionally use Expo Push Notifications delivered through FCM, so Android can alert an approved responder while the app is backgrounded or stopped. Expo push tokens are bound to the account's one active mobile session and removed on sign-out or provider invalidation. Push delivery is advisory: the server remains the authority for offer ownership and expiry.
- Responder draft reminders are scheduled natively on the device when a draft exists and cancelled after submission, so they do not rely on a running JavaScript timer.
- Notification types: report verification updates, dispatch alerts, incident resolutions, account verification results, pending registration alerts (for admins).
- Both all/unread filtering is supported in the notification panel.
- While the responder process is running, a dispatch offer also raises a maximum-priority Android local notification with sound and vibration. Tapping it returns to the server-backed offer screen, which retains explicit responder confirmation. Guaranteed delivery after Android has killed the app requires a future push-notification service.

## Location Integrity

- Android reports and responder telemetry reject locations explicitly marked by the Android location provider as mocked. Responder telemetry retains the last trusted server position when a fresh coordinate would require implausible travel; both events are rate-limited in the audit trail.
- These signals are not device attestation. Release enforcement against a modified or rooted client requires a server-verified Google Play Integrity verdict bound to the protected request.

## Invariants

1. Unverified mobile users are blocked from all app functionality — enforced at both API and client level.
2. Auth and role checks are enforced at every API mutation boundary.
3. A public-user or responder account has at most one active mobile device record; only a matching device digest can renew it, and sign-out removes it. Web administrator sessions are not affected.
3. All database access goes through Drizzle ORM — no raw SQL.
4. Binary assets (photos, IDs, PDFs) are stored in Supabase Storage, not in the database.
5. Authenticated real-time data flows through Supabase Realtime. The only polling exception is a guest device refreshing its own token-authorized response state; anonymous database subscriptions are never exposed.
6. The REST API is the single source of truth — the mobile app and web dashboard are both consumers.
7. All mapping uses OpenFreeMap + MapLibre — no paid map services.
8. Responder dispatch push tokens are stored only for the matching active mobile session; external push delivery never changes dispatch authority or bypasses API expiry checks.
