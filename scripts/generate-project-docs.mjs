import fs from "node:fs";
import { jsPDF } from "jspdf";

const OUT_DIR = process.cwd();
const DATE = "11 September 2026";

const COLORS = {
  navy: [30, 58, 138],
  blue: [37, 99, 235],
  red: [220, 38, 38],
  ink: [31, 41, 55],
  muted: [75, 85, 99],
  pale: [239, 246, 255],
  line: [203, 213, 225],
};

function makeDoc(title, subtitle) {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  doc.setProperties({ title, subject: subtitle, author: "DisasTRACE", creator: "DisasTRACE documentation generator" });
  let y = 0;
  let section = "";

  const header = () => {
    doc.setFillColor(...COLORS.navy);
    doc.rect(0, 0, 210, 19, "F");
    doc.setFillColor(...COLORS.red);
    doc.rect(0, 19, 210, 1.4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("CDRRMO BALIWAG CITY | DISASTRACE", 15, 12);
  };

  const footer = () => {
    const page = doc.getNumberOfPages();
    doc.setDrawColor(...COLORS.line);
    doc.line(15, 285, 195, 285);
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`DisasTRACE | ${DATE}`, 15, 291);
    doc.text(`Page ${page}`, 195, 291, { align: "right" });
  };

  const page = () => {
    if (doc.getNumberOfPages() > 0) footer();
    doc.addPage();
    header();
    y = 30;
  };

  const ensure = (height = 10) => {
    if (y + height > 278) page();
  };

  const text = (value, opts = {}) => {
    const size = opts.size ?? 9.5;
    const color = opts.color ?? COLORS.ink;
    const width = opts.width ?? 178;
    const leading = opts.leading ?? size * 0.46;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(value), width);
    ensure(lines.length * leading + 2);
    doc.text(lines, opts.x ?? 16, y, { align: opts.align });
    y += lines.length * leading + (opts.gap ?? 2);
  };

  const titleBlock = () => {
    header();
    y = 42;
    doc.setTextColor(...COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(25);
    doc.text(title, 16, y);
    y += 12;
    text(subtitle, { size: 12, color: COLORS.muted, gap: 7 });
    doc.setDrawColor(...COLORS.red);
    doc.setLineWidth(1);
    doc.line(16, y, 72, y);
    y += 10;
    text(`Prepared ${DATE}. This document describes the current implemented repository state and should be regenerated when material behavior changes.`, { size: 9.5, color: COLORS.muted, gap: 8 });
  };

  const h1 = (value) => {
    ensure(17);
    doc.setTextColor(...COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(value, 15, y);
    y += 8;
    section = value;
  };

  const h2 = (value) => {
    ensure(13);
    doc.setTextColor(...COLORS.blue);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.text(value, 16, y);
    y += 6;
  };

  const bullet = (value) => text(`- ${value}`, { x: 20, width: 172, gap: 1.2 });

  const callout = (label, value, color = COLORS.pale) => {
    const lines = doc.splitTextToSize(value, 165);
    const height = lines.length * 4.4 + 12;
    ensure(height + 3);
    doc.setFillColor(...color);
    doc.roundedRect(16, y - 4, 178, height, 2, 2, "F");
    doc.setTextColor(...COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(label, 21, y + 2);
    y += 7;
    text(value, { x: 21, width: 165, size: 8.8, gap: 2 });
    y += 2;
  };

  const finish = (path) => {
    if (doc.getNumberOfPages() === 0) page();
    footer();
    doc.save(path);
  };

  return { doc, page, titleBlock, h1, h2, text, bullet, callout, finish, get section() { return section; } };
}

function writeSystemDoc() {
  const d = makeDoc("DisasTRACE Overall System Documentation", "Current system, feature, security, and operational reference");
  d.titleBlock();
  d.h1("1. Executive Summary");
  d.text("DisasTRACE is a centralized digital emergency incident reporting and ambulance dispatch platform for CDRRMO Baliwag City and the Public Assistance and Command Center (PACC). It connects residents, guests, ambulance responders, PACC dispatchers, and CDRRMO Super Administrators through an Android Expo mobile app and a Next.js command dashboard.");
  d.callout("Operational principle", "The server and database are the source of truth for identity, verification, incident state, dispatch ownership, expiry, location integrity, and guest access. Mobile and dashboard clients present and reconcile that state.");
  d.h2("Current outcomes");
  [
    "Residents and responders are blocked until CDRRMO Super Admin approval.",
    "Guests can reach an emergency chatbot without creating an account, with scoped status access only.",
    "High-confidence emergencies enter FIFO ambulance dispatch; uncertain, non-emergency, suspicious, duplicate, or unassigned cases remain visible to PACC.",
    "PACC and CDRRMO can monitor multiple active ambulances, incident severity, responder presence, and road routes in real time.",
    "Responders can complete PCR and Driver's Trip Ticket forms, capture electronic signatures, save drafts offline, and submit when connected.",
  ].forEach(d.bullet);

  d.h1("2. Users and Responsibilities");
  d.h2("Public User / Resident");
  d.text("Registers with personal details, government ID, and OTP-verified Philippine phone number. After approval, the resident uses the chatbot or legacy intake, provides foreground GPS, tracks an assigned response, receives report updates, and views report history and hospitals.");
  d.h2("Guest Reporter");
  d.text("Uses Login as Guest during an emergency. No account, tabs, history, profile, or protected API access is granted. The guest supplies a callback number, automatic GPS, nearby landmark, incident details, affected-person count, condition, and required evidence, then receives a random report access token for scoped status refresh.");
  d.h2("Ambulance Responder");
  d.text("After approval and one-device sign-in, the responder manages duty status, receives dispatch offers, accepts and navigates to incidents, confirms arrival, completes operational reports, and synchronizes offline drafts. Foreground location is required for app use; background tracking is an on-duty capability.");
  d.h2("PACC Admin / Dispatcher");
  d.text("Triages incoming reports, monitors the live map and responder roster, records coordination with partner agencies, dispatches or overrides responder selection, and handles cases requiring human review.");
  d.h2("CDRRMO Super Admin");
  d.text("Owns registration approval/rejection, user management, bans and device release, analytics, exports, security audit review, system settings, and operational oversight. PACC Admins do not approve registrations.");

  d.h1("3. System Architecture");
  d.h2("Technology stack");
  [
    "Next.js 16.2.6, React 19, and TypeScript for the authenticated web dashboard and REST API route handlers.",
    "Expo / React Native for the Android resident and responder mobile clients.",
    "Supabase Auth for identity, sessions, JWT claims, and browser/mobile authentication.",
    "Supabase PostgreSQL with Drizzle ORM for relational data, migrations, transactions, and constraints.",
    "Supabase Realtime for authenticated live incident, dispatch, telemetry, notification, and coordination updates.",
    "Supabase Storage for IDs, scene evidence, avatars, and exported report assets.",
    "OpenFreeMap tiles with MapLibre on web and mobile; no map API key is required.",
    "textbee.dev for OTP SMS and Expo Push Notifications/FCM for responder dispatch offers when Android is backgrounded or stopped.",
  ].forEach(d.bullet);
  d.h2("Data boundaries");
  d.text("The web dashboard owns command and administration workflows. The mobile app consumes validated REST endpoints and uses Realtime where authenticated access is appropriate. Binary assets are stored in Supabase Storage; relational references and evidence metadata remain in PostgreSQL. Guest status uses a token-scoped endpoint rather than anonymous database subscriptions.");
  d.h2("Core data");
  d.text("Users, verification requests, incidents, dispatch offers, responder reports, patient care reports, driver trip tickets, notifications, audit logs, status histories, hospitals, support content, system settings, mobile push tokens, mobile device sessions, and guest device quota records are represented in the Drizzle schema.");

  d.h1("4. Emergency Intake and Triage");
  d.h2("Required intake controls");
  [
    "Foreground location permission is mandatory and coordinates must resolve inside the official Baliwag City barangay polygon set.",
    "The server derives the official barangay label from GPS; user-entered landmarks are references, not authoritative incident locations.",
    "Guest evidence is uploaded through a protected server endpoint with 5 MB JPEG, PNG, or WebP validation; unauthenticated clients do not receive direct Storage write access.",
    "The same-submission retry is idempotent for the same phone and device digest.",
  ].forEach(d.bullet);
  d.h2("Deterministic initial triage");
  d.text("The system records one of four reasons: HIGH_CONFIDENCE_EMERGENCY, HIGH_CONFIDENCE_NON_EMERGENCY, UNCERTAIN_INCOMPLETE, or SUSPICIOUS_POSSIBLE_PRANK. Only the first class starts automatic ambulance dispatch. PACC receives the other classes and may override the classification. The chatbot may use reviewed English, Filipino, and Taglish signal rules and a server-only DeepSeek gateway, but it never dispatches on its own.");
  d.h2("Duplicate and capacity protection");
  d.text("Likely duplicate reports are held for PACC review using a configurable Haversine radius and recent time window. Guest lifetime limits are enforced per normalized Philippine phone and SHA-256 Android app-scoped device digest; raw device identifiers are never stored. The CDRRMO Super Admin controls the phone limit from the singleton system settings row.");

  d.h1("5. Dispatch, Tracking, and Recovery");
  d.h2("Dispatch lifecycle");
  [
    "Confirmed emergencies are considered oldest-first (FIFO). Automatic selection uses eligible active, approved, on-duty responders with a trusted location heartbeat no older than one minute.",
    "A responder offer has a countdown and is protected until it expires. Acceptance atomically changes the incident to EN_ROUTE.",
    "Expiry is driven by the Supabase Cron/pg_net scheduler and is also reconciled by scoped status reads; it does not depend on a responder phone remaining online.",
    "If no alternate unit is available, the report remains visible as PACC reassignment required. PACC can use guarded Override Dispatch for a fresh eligible responder.",
    "Automatic dispatch, manual dispatch, PACC rejection, expiry cascading, and acceptance serialize around locked request state and atomic responder reservation.",
  ].forEach(d.bullet);
  d.h2("Tracking");
  d.text("Residents and guests see ambulance movement only after a responder accepts. The web command map supports concurrent active ambulances, severity-labelled incident markers, responder identity, active incident relationships, telemetry subscriptions, and cached road routes. Guest tracking refreshes a token-scoped status endpoint every three seconds; it never reads protected incident tables.");
  d.h2("Agency coordination");
  d.text("PACC may record PNP, BFP, CDRRMO, Barangay, DSWD, and Hospital coordination on the verification request. The client derives readable coordination status and appends actual incident and responder state. These agencies are coordination entries; only ambulance responders are auto-dispatched by this system.");

  d.h1("6. Responder Documentation");
  d.text("The responder workflow includes a pre-hospital Patient Care Report and Driver's Trip Ticket aligned to the CDRRMO paper forms. Captured details include vitals, GCS, SAMPLE, pain assessment, narrative, handoff and referral information, mileage, fuel, travel date, grease log, passenger records, driver contact, and responder identity.");
  d.text("Patient, witness, accomplished-by, driver, and authorized-passenger signatures are drawn as SVG paths, persisted in drafts and report payloads, rendered in the web detail sheet, and converted to embedded images for PDF export.");
  d.callout("Offline behavior", "Complete responder form drafts are persisted locally. Intentional Save as Draft is distinct from background recovery. When connectivity returns and drafts remain unsent, native high-priority reminders repeat every five minutes and an in-app banner links to review and submit.");

  d.h1("7. Security, Integrity, and Privacy");
  [
    "Role-based access is enforced through Supabase JWT claims, Next.js proxy checks, API authorization, and database policies.",
    "Mobile residents and responders are bound to one active application session using only a SHA-256 app-scoped device digest and JWT session ID. A different active device receives a logout-first response; CDRRMO/PACC browser sessions are excluded.",
    "Signing in revokes other mobile sessions. Sign-out releases the matching binding, and administrators can release a device from User Management.",
    "Mock Android locations are rejected. Implausible responder movement retains the last trusted position and creates a rate-limited audit event. Evidence-photo GPS is advisory and cannot replace captured report GPS.",
    "Guest access tokens are scoped to one report. Guest quota records retain hashes and counts, not raw Android identifiers.",
  ].forEach(d.bullet);
  d.callout("Known remaining hardening", "Google Play Integrity is not yet configured. Stronger modified/rooted-client resistance requires a Play Console/Google Cloud project, release signing, a request-bound integrity token, and server-side verdict verification.", [255, 247, 237]);

  d.h1("8. Administration and Reporting");
  d.text("The dashboard provides KPI cards, incident distribution, recent reports, responder roster, live maps, verification queues, reports management, user management, security audit trail, support and FAQs, and a CDRRMO-only analytics dashboard. Analytics supports daily, weekly, and monthly trends, incident type frequency, reported/verified/pending/resolved counts, resolution-time summaries, and data-derived preparedness guidance.");
  d.text("Branded PDF exports are available for incident details, report summaries, users, Patient Care Reports, and Driver's Trip Tickets. Exports include Baliwag CDRRMO branding, dynamic multi-line layout handling, official location labels, and embedded signatures where applicable.");

  d.h1("9. Operational Deployment Notes");
  [
    "Run the registered Drizzle migration sequence, including the mobile session, guest quota, barangay, evidence geotag, and dispatch expiry scheduler migrations.",
    "Configure Supabase Auth site and redirect URLs, JWT role synchronization, RLS/RBAC SQL, Storage buckets, Realtime publications, and Supabase Cron/pg_net scheduler secrets.",
    "Configure textbee.dev OTP credentials and Expo Push/FCM credentials for background responder offers.",
    "Seed official Baliwag barangay boundaries and hospitals, initialize singleton system settings, and verify the service-area resolver.",
    "Validate production environment variables, HTTPS, app deep links (including disastrace://reset-password), release signing, and database backups before field deployment.",
  ].forEach(d.bullet);
  d.h1("10. Current Scope and Success Criteria");
  d.text("In scope: Android resident/responder clients, Next.js command dashboard, Supabase Auth/RBAC, verification, emergency intake, triage, dispatch, live tracking, Realtime, offline responder forms, PDF exports, analytics, notifications, OTP, and operational auditability. iOS, billing, predictive emergency detection, and non-medical response automation remain out of scope.");
  d.text("The system is successful when approved residents can report with authoritative GPS, Super Admins can verify accounts, dispatchers can triage and assign the nearest eligible responder, responders can accept/navigate/document, reporters can track an accepted response, and administrators can audit, analyze, and export the resulting record.");
  d.finish(`${OUT_DIR}/DisasTRACE_Overall_System_Documentation.pdf`);
}

function writeDeveloperDoc() {
  const d = makeDoc("FOR DEV - ANSWERED", "Implementation decisions, contracts, deployment requirements, and known follow-ups");
  d.titleBlock();
  d.h1("1. Purpose and Reading Order");
  d.text("This is the developer handoff for the current DisasTRACE implementation. It answers the recurring architecture and behavior questions that affect future changes. Read it with context/project-overview.md, context/architecture-context.md, context/code-standards.md, context/ai-workflow-rules.md, and context/progress-tracker.md.");
  d.callout("Change rule", "When a feature changes a state machine, security boundary, public API, migration, or deployment prerequisite, update the relevant context file and regenerate these PDFs in the same change.");

  d.h1("2. Answered Architecture Decisions");
  d.h2("Why REST plus Realtime?");
  d.text("REST route handlers own validation, authorization, transactional state changes, file handling, and server-only integrations. Supabase Realtime distributes committed changes to authenticated clients. This avoids treating a client event or a websocket message as authoritative.");
  d.h2("Why PostgreSQL and Drizzle?");
  d.text("Incidents, verification requests, dispatch offers, responders, reports, quotas, and audit events have relational constraints and concurrency requirements. Drizzle provides typed access and migration ownership; application code must not use raw SQL for ordinary data access.");
  d.h2("Why official barangay polygons?");
  d.text("A reporter-entered address or free-text landmark is not a reliable service-area authority. GPS is checked against the official 27-polygon Baliwag boundary set; the derived barangay is the display and assignment label while the captured coordinates remain the dispatch truth.");
  d.h2("Why token-scoped guest status?");
  d.text("Guests have no Supabase session. Giving them anonymous database Realtime or Storage writes would widen the attack surface. A random per-report access token and a narrow polling endpoint provide status without exposing protected tables.");
  d.h2("Why hashes for device controls?");
  d.text("The device identifier is needed for one-device sessions and guest abuse resistance, but storing the raw Android identifier is unnecessary. SHA-256 digests support matching and quotas while reducing retained identifying data. This is an abuse-control signal, not hardware attestation.");

  d.h1("3. Authentication and Authorization Contract");
  [
    "Roles: public_user, ambulance_responder, pacc_admin, cdrrmo_super_admin.",
    "Roles are stored in public.users and synchronized into auth.users raw_app_meta_data by database trigger.",
    "Mobile users require verification_status=approved before any app functionality; only cdrrmo_super_admin can approve or reject.",
    "The proxy, API route handlers, and database RLS all enforce the boundary. Never rely on a mobile client gate alone.",
    "A mobile account has one active mobile_device_sessions row containing a device digest and JWT session_id. Browser dashboard sessions do not participate in this binding.",
    "Suspended/deactivated residents are blocked at sign-in and receive an explicit Account Banned state if status changes during a session.",
  ].forEach(d.bullet);
  d.h2("Important session behavior");
  d.text("Successful mobile sign-in revokes other Supabase sessions and atomically binds the current one. Sign-out clears local credentials immediately and attempts matching server release with a short timeout. A replacement device requires administrator release or the logout-first flow.");

  d.h1("4. Intake, AI, and Triage Contract");
  d.h2("Validated fields");
  d.text("Guest and resident chatbot flows require callback/contact routing, automatic in-boundary GPS, nearby landmark/reference, incident details, exact affected-person count, condition, and evidence. Registered users use the verified phone on the account; the client cannot substitute an arbitrary number.");
  d.h2("Classification contract");
  d.text("The allowed triage reasons are HIGH_CONFIDENCE_EMERGENCY, HIGH_CONFIDENCE_NON_EMERGENCY, UNCERTAIN_INCOMPLETE, and SUSPICIOUS_POSSIBLE_PRANK. Client hints are normalized server-side. Patient Transport, Other / non-emergency request, and Unknown Cause are non-emergency; remaining categories are not allowed to downgrade emergency handling.");
  d.text("The server-only DeepSeek gateway and local typed signal rules improve guided intake but never bypass confirmation, API validation, PACC review, or the dispatch engine. Raw training examples stay local and are not sent to the model or mobile clients.");
  d.h2("Guest quota contract");
  d.text("The configurable lifetime limit applies to both normalized Philippine phone and app-scoped device digest. Same phone/device retries for the same submission are idempotent. New reports return 429 when either quota is exhausted. Obvious synthetic numbers are rejected at client and API boundaries.");

  d.h1("5. Dispatch State and Concurrency Contract");
  d.text("Automatic dispatch is FIFO over confirmed pending emergencies. Eligibility requires active, approved, on-duty responder status and a trusted location heartbeat no older than one minute. The scheduler runs every five seconds through Supabase Cron/pg_net and is the authority for expiry, with API reconciliation as a recovery path.");
  d.h2("Race prevention");
  [
    "Automatic dispatch, Override Dispatch, PACC rejection, expiry cascading, and acceptance re-read state inside a transaction and lock the verification-request row.",
    "Responder reservation is atomic; an offer cannot be accepted after expiry at the database boundary.",
    "Expiry/reassignment first claims the still-current offer, so it cannot win over an in-flight acceptance.",
    "An exhausted offer becomes PACC reassignment required rather than silently disappearing.",
    "A public or guest status read can reconcile its own expired offer before returning state when the scheduler has not yet run.",
  ].forEach(d.bullet);
  d.h2("Client rule");
  d.text("Do not infer dispatch ownership from a notification, countdown, or cached state. Hydrate the exact offer/incident from an authorized API and treat server state as final. Push and local notifications are advisory and must not mutate workflow state.");

  d.h1("6. Location, Mapping, and Tracking Contract");
  [
    "Foreground location is a non-dismissible prerequisite for every resident and responder tab. Returning from Settings triggers a permission recheck.",
    "Mock provider locations are rejected before report or telemetry use. Implausible responder movement keeps the last trusted position and writes a rate-limited audit record.",
    "Report GPS is authoritative. EXIF GPS from evidence is optional metadata; a material mismatch routes the report to PACC review.",
    "Map labels use GPS-derived Barangay Name, Baliwag City. Landmarks are never shown as the incident location.",
    "Web maps subscribe to active incident telemetry and render concurrent route caches. Guest maps use only the scoped status endpoint.",
  ].forEach(d.bullet);
  d.callout("Remaining security follow-up", "Implement Google Play Integrity with request-bound tokens and server verification after release signing and Play Console/Cloud configuration. Do not replace this with a client-only boolean.", [255, 247, 237]);

  d.h1("7. Responder Reports and Offline Contract");
  d.text("/api/reports accepts incident-linked responder documentation, including patient_care_reports and driver_trip_tickets. The mobile responder store must serialize both objects and signatures in online and offline payloads. A deliberate Save as Draft is distinct from a crash/background recovery draft and should update the active incident UI accordingly.");
  d.text("Signature paths are stored as serialized SVG path data, rendered with react-native-svg on mobile and SVG on web, then rasterized for jsPDF embedding. PDF layout must calculate multiline heights dynamically; fixed offsets have previously caused overlapping dispatch, address, and narrative text.");
  d.text("Native scheduled notifications, not a JavaScript timer, drive the five-minute reminder while unsent drafts exist and connectivity is available. Submission cancels the reminder.");

  d.h1("8. Realtime and Notification Contract");
  d.text("Authenticated Realtime covers incidents, offers, telemetry, statuses, notifications, and coordination updates. Guest status does not subscribe anonymously; it polls every three seconds. Notification rows support all/unread filtering and linked navigation. Responder offers use foreground/local Android alerts plus Expo Push/FCM when backgrounded; push tokens are tied to the active mobile session and removed on sign-out or provider invalidation.");

  d.h1("9. Migrations and Deployment Checklist");
  [
    "Run the full Drizzle journal in order; ensure dispatch-offer expiry migration 0016 is registered in the migration journal.",
    "Apply database functions, RLS/RBAC, realtime publication setup, logging triggers, spatial/barangay boundary setup, and storage policies.",
    "Configure Supabase Cron/pg_net to call the protected expiry engine every five seconds with its server secret.",
    "Configure textbee.dev, Expo Push/FCM, Supabase Auth redirect URLs, disastrace://reset-password, and production APP_URL.",
    "Initialize system settings, guest limit, deduplication radius, hospitals, and official barangay data.",
    "Verify one-device session behavior, guest phone/device quotas, location integrity, dispatch recovery, chatbot contract, and Baliwag barangay resolution using the repository scripts before release.",
  ].forEach(d.bullet);
  d.h2("Useful verification commands");
  [
    "npx tsc --noEmit",
    "npx tsx scripts/verify-chatbot-contract.ts",
    "npx tsx scripts/verify-dispatch-recovery.ts",
    "npx tsx scripts/verify-guest-phone-limit.ts",
    "npx tsx scripts/verify-location-integrity.ts",
    "npx tsx scripts/verify-baliwag-barangays.ts",
    "npx tsx scripts/audit-database-migrations.ts",
  ].forEach((value) => d.bullet(value));

  d.h1("10. Resolved Questions and Non-Goals");
  d.text("Resolved: PACC is triage/dispatch only; CDRRMO Super Admin owns approvals. Guest intake is accountless and scoped. Automatic dispatch is FIFO and recoverable. Multi-ambulance tracking is supported. PCR/DTT signatures and offline drafts are supported. Official polygons, server-side deduplication, one-device sessions, and quota hashes are authoritative.");
  d.text("Non-goals: iOS, billing, predictive emergency detection, fully automated fire/flood/police response, employee performance monitoring, and guaranteed push delivery after Android has killed the app. Play Integrity remains a planned hardening step, not a claimed current capability.");
  d.finish(`${OUT_DIR}/FOR-DEV-ANSWERED.pdf`);
}

writeSystemDoc();
writeDeveloperDoc();
console.log("Generated current DisasTRACE system and developer documentation PDFs.");
