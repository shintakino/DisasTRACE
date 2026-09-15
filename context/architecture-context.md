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

- An unauthenticated device may use only the Emergency Chatbot, its report-status views, and a bounded device-local Guest Report History. Guest reports have no `resident_id`; a random report access token returned only to the submitting device authorizes that report's status reads. Guest history is not a global account history: report summaries and chatbot transcripts stay on the submitting device, each retained bearer token stays in secure device storage, and uninstalling/clearing app data removes the history. Guests cannot access resident tabs, profile data, or protected APIs. Because a guest has no Supabase session, guest pending, response-status, and history-detail views refresh the scoped token API instead of subscribing directly to protected database Realtime channels.
- Approved residents and guests use the same validated REST intake. Guests provide a valid Philippine mobile callback number; the registered route derives that number from the verified account record rather than trusting device input. Both record incident details, an exact people-affected count, condition, automatic GPS, a nearby landmark/reference, and required evidence. Both chatbots automatically request foreground location permission and cannot proceed without a GPS capture inside the Baliwag City service boundary; the client explains an out-of-area capture and the API rejects it as a defense in depth.
- Guest chatbot evidence is uploaded through `POST /api/emergency-intake/evidence`, which validates a 5MB JPEG/PNG/WebP file and uses the server storage client. This avoids granting unauthenticated guest devices direct Storage write access; the endpoint returns the public incident-photo URL used by intake.
- The API records deterministic initial triage with reasons: `HIGH_CONFIDENCE_EMERGENCY`, `HIGH_CONFIDENCE_NON_EMERGENCY`, `UNCERTAIN_INCOMPLETE`, or `SUSPICIOUS_POSSIBLE_PRANK`. Only the first class starts automated ambulance dispatch. PACC receives the other classes and can override any classification.
- PACC report rejection is a terminal triage decision stored as `verification_requests.status = REJECTED` with a dedicated, required `rejection_reason`. It is distinct from an incident reaching `RESOLVED`, which is displayed as **Case Closed** because emergency response was completed. Rejected reports leave every active PACC action/review queue immediately but remain available as rejected audit/history records.
- The scoped report-status API returns the same terminal rejection status and reason to the submitting party: an authenticated owner for registered reports or the exact per-report access token for Guest Mode. Registered reporters also receive an owner-scoped in-app rejection notification. Both mobile modes clear the active report lock after presenting the reason and can start a new report immediately.
- The server, not the incident selector, owns initial incident classification. `Patient Transport` and `Other / non-emergency request` are non-emergency. `Unknown Cause` is always normalized to non-emergency plus `UNCERTAIN_INCOMPLETE` and remains in PACC review until an authorized dispatcher explicitly reclassifies it; an Unknown Cause client hint can never start automatic dispatch. All remaining categories are normalized to emergency so client-side changes cannot downgrade them.
- If a high-confidence emergency initially has no eligible nearby unit, it remains visible to PACC as `PENDING`, but it must not block a later request that has a different eligible nearby unit. Automatic dispatch orders dispatchable work by severity tier and then FIFO within a tier, while PACC's display independently keeps the most urgent and newest reports visible. A responder changing to `ON_DUTY` or publishing a fresh GPS location runs a bounded retry of eligible confirmed emergencies. An unexpired offer retains the responder for its first request; after a timed-out offer with no alternate unit, the incident remains durable with no current owner, preserves its skipped responders, and appears as a PACC reassignment action while other dispatchable work advances. Automatic dispatch, PACC manual dispatch, and expiry cascading use compare-and-swap state changes plus atomic responder reservations so acceptance, reassignment, and timeout cannot all win. These paths never delete an incident as an expiry fallback. Candidate selection and reservation both require an active, approved, on-duty ambulance responder with a fresh one-minute trusted location heartbeat. The server remains the source of truth.
- PACC-recorded coordination agencies live on the verification request and are delivered through its existing Realtime updates. The client derives human-readable coordination text from one or more recorded agencies and the actual incident/dispatch state. PNP, BFP, and other agencies are coordination entries; only ambulance responders are auto-dispatched by this system.
- CDRRMO Super Admins control the lifetime Guest Mode report limit through the singleton `system_settings` row. A new guest report must remain below that limit for both its normalized Philippine mobile number and its SHA-256 Android app-scoped device digest. The raw Android identifier is never stored; `verification_requests.guest_device_hash` and `guest_device_report_quotas` retain only the digest and its reserved report count. A retry for the same chatbot submission from the same phone and device never consumes another allowance; new reports receive a controlled `429` once either quota reaches `guest_reports_per_phone_limit`. Guest intake and scoped status responses expose the minimum authoritative allowance remaining across phone and device so the client can warn the reporter before it reaches zero. Guest entry accepts one local Philippine mobile form only (`09XXXXXXXXX`, exactly 11 digits); this is format and obvious-synthetic-number validation for a responder callback value, not proof of phone ownership, and must not depend on an SMS provider during an emergency. The device digest is an abuse-control signal rather than hardware attestation.

### Automatic Arrival at Scene

- Responder arrival is server-authoritative. After mock-location and implausible-movement checks pass, an authenticated location heartbeat for the assigned responder may transition an `EN_ROUTE` incident to `ARRIVED` only after two consecutive trusted readings within 75 metres of the incident pin and with reported horizontal accuracy no worse than 50 metres. The transition is conditional and idempotent, and the responder and public clients reconcile from the incident record.
- Manual arrival remains available as a fallback when GPS is unavailable or the reported pin is imprecise; it still requires the active assigned responder and cannot mutate a stale or reassigned incident. Automatic arrival never uses developer fallback coordinates, cached untrusted coordinates, or mock-location signals.

### Responder Report Management and Hospital Destination

- A responder's submitted-report history is queried through the authenticated REST API with bounded server-side pagination, allow-listed search/filter/sort inputs, and responder ownership enforced in every read or mutation. A nullable responder archive timestamp is a reversible filing preference only: it never deletes a report or removes it from authorized CDRRMO/PACC audit and export access.
- Direct authenticated database access to responder reports, patient-care reports, and driver trip tickets is read-only and restricted to the owning responder or an authorized PACC/CDRRMO administrator; inserts and mutations use the server API. Public report owners receive a redacted status/history projection and never receive PCR, trip-ticket, signature, crew-note, scene-photo, or duplicate-reporter identity data.
- Medical transport destination eligibility uses the existing `hospitals.caters` flag. The mobile app deterministically recommends the nearest eligible configured hospital from the responder's trusted position and permits manual override only among other eligible hospitals. Because the current hospital model has no specialty, live bed capacity, trauma level, or acceptance feed, the recommendation must be presented as proximity/configured emergency availability rather than clinical suitability.
- Transport progression and report completion remain disabled until an eligible destination has been selected. The server independently rejects unknown or non-catering hospital identifiers so a modified or stale client cannot persist an inappropriate destination.
- Responder form controls use shared numeric sanitizers and field validators, with matching API schema refinements for persisted values. Incomplete work may still be saved locally as a draft; final submission and dependent workflow actions cannot bypass required state.
- Patient-care pain assessment and GCS values are persisted explicitly with the PCR. Final report submission requires the server-authoritative incident to have reached `ARRIVED`, persists only the Zod-parsed payload, and releases the responder only when no other unresolved incident remains assigned.

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
- Channels are scoped by role and incident context to minimize unnecessary data transfer. Realtime Broadcast remains the low-latency foreground path for ambulance marker movement, while public tracking also refreshes the authorized report-status API every three seconds as a recovery path when either Android app is backgrounded or a broadcast is missed. During patient transport, the responder heartbeat persists the active transport state and selected hospital on the incident; the same authorized status response supplies that destination to the public map. Guests use that endpoint with their per-report token rather than exposing a direct anonymous Realtime subscription.

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
- Report rejection notifications use the distinct `incident_rejected` type and include only the owned request identifier and the PACC-provided reason. Guest reports do not create user notification rows; their reason is returned only by the token-scoped report-status endpoint.
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
5. Authenticated real-time data flows through Supabase Realtime. Public tracking additionally refreshes its authorized report-status endpoint as a bounded recovery path for missed/backgrounded telemetry; anonymous database subscriptions are never exposed.
6. The REST API is the single source of truth — the mobile app and web dashboard are both consumers.
7. All mapping uses OpenFreeMap + MapLibre — no paid map services.
8. Responder dispatch push tokens are stored only for the matching active mobile session; external push delivery never changes dispatch authority or bypasses API expiry checks.
