# DisasTRACE: Digital Incident Reporting and Ambulance Response System
**CDRRMO Baliwag City — Functionalities & MVPs**

> A capstone project by Team Code Blooded, BSIT — Dalubhasaang Politekniko ng Lungsod ng Baliwag (April 2026)

---

## System Overview

DisasTRACE is a centralized digital platform that connects public users, ambulance responders, PACC (Public Assistance and Command Center) dispatchers, and CDRRMO administrators for streamlined emergency incident reporting and ambulance response in Baliwag City.

---

## Core Objectives (MVPs)

1. **Digital Incident Reporting** — Replace manual/hotline-based reporting with a mobile-first digital system that transmits emergency information quickly and accurately.
2. **Optimized Ambulance Dispatch** — Automate ambulance selection and dispatch to reduce response time and minimize human error.
3. **Real-Time Ambulance Tracking** — Provide live GPS-based monitoring so authorized personnel can track ambulance locations and coordinate responses effectively.

---

## User Roles

| Role | Platform |
|------|----------|
| Public User | Mobile App (Android only — Expo) |
| Ambulance Responder | Mobile App (Android only — Expo) |
| PACC Admin (Dispatcher) | Web Dashboard (Next.js) |
| CDRRMO Super Admin | Web Dashboard (Next.js) |

---

## Account Verification & Access Control

> **Critical Rule:** Ambulance Responders and Public Users **cannot access any functionality** of the Android app until their account has been verified by an authorized admin.

### Verification Flow

1. **Registration** — The user (Public User or Ambulance Responder) registers through the mobile app by submitting their personal details, contact information, and a government-issued ID photo.
2. **Pending Status** — Upon registration, the account enters a **"Pending Approval"** state. The user sees a verification-pending screen and is blocked from accessing any app features.
3. **Admin Review** — Either a **PACC Admin** or **CDRRMO Super Admin** can review and approve/reject the pending registration:
   - **PACC Admin** — Can verify pending account registrations for both Ambulance Responders and Public Users to ease the workload of the CDRRMO Super Admin.
   - **CDRRMO Super Admin** — Can also verify pending account registrations for both Ambulance Responders and Public Users (retains full authority).
4. **Approval / Rejection** — The admin reviews the submitted government ID and details, then approves or rejects the registration with an optional note.
5. **Access Granted** — Once approved, the user gains full access to all app functionalities. If rejected, the user is notified with the reason and may re-submit handled via **[textbee.dev](https://textbee.dev)** — an open-source SMS gateway.

### Mobile Verification (OTP)

- **Phone number verification** is handled via **[textbee.dev](https://textbee.dev)** — an open-source SMS gateway for OTP delivery during registration.

---

## Functional Requirements by Role

### 1. Public User

- **Account Registration & Authentication** — Register with name, contact info, address, and a government-issued ID for identity verification and false-report prevention. Account must be verified by a PACC Admin or CDRRMO Super Admin before accessing app features.
- **Verification Gate** — If the account is not yet verified, the user is restricted to a pending-approval screen with no access to core app functionality.
- **Incident Reporting** — Submit emergency or non-emergency reports via mobile; includes photo capture, automatic GPS location tagging, and a structured WH form (What, Where, When, Who).
- **Real-Time Ambulance Tracking** — After dispatch confirmation, view a live map with the assigned ambulance's GPS position and Estimated Time of Arrival (ETA).
- **Report History ("My Reports")** — View status and full history of all previously submitted emergency requests.
- **In-App Notification Center** — Receive in-app notifications for report verifications, ambulance dispatches, and resolved incidents.
- **Hospital Map View** — View nearby hospitals in Baliwag City marked on a live map (OpenFreeMap + MapLibre) with tap-to-view details.
- **Help & Support Access** — Access support and contact options from the profile section.
- **Profile Management** — Edit personal information, manage privacy and security settings, and log out with confirmation.

---

### 2. Ambulance Responder

- **Account Registration & Authentication** — Register with personal details and credentials; account enters pending approval status. Must be verified by a PACC Admin or CDRRMO Super Admin before accessing app features.
- **Verification Gate** — If the account is not yet verified, the responder is restricted to a pending-approval screen with no access to core app functionality.
- **Dispatch Notification with Timer** — Receive active dispatch alerts with incident details and a countdown timer to accept; auto-forwards to next available unit if no response.
- **Live Navigation Map** — Upon accepting a dispatch, access a GPS map (OpenFreeMap + MapLibre) showing estimated duration, speed, and real-time navigation to the incident site.
- **Arrival Confirmation & On-Scene Logging** — Confirm arrival, log scene time, and select an outcome.
- **Incident Report Form** — Fill out a detailed response report pre-populated from the public user's submission; includes nature of call, emergency type, severity, number of patients, and patient conditions.
- **Draft / Offline Save** — Save incident reports as drafts when connectivity is unavailable; system reminds responders to sync when the network is restored.
- **Report List** — View all assigned reports (all, active, resolved) with full incident details and attached scene photos.
- **Status Management** — Update duty status; visible to PACC and CDRRMO administrators.
- **In-App Notification Center & Profile** — Access in-app system updates, manage profile, and log out with confirmation.

---

### 3. PACC Admin (Dispatcher)

- **Secure Web Login** — Access via Supabase Auth authentication (email, employee ID) through the Next.js web dashboard.
- **Automated Incident Triaging** — System automatically classifies incoming reports into emergency vs. non-emergency; non-emergencies are routed to the appropriate barangay office.
- **Report Verification & Dispatching** — Review incoming emergency reports for authenticity and severity, then dispatch the nearest and most suitable ambulance unit.
- **Real-Time Incident Map** — Monitor live positions of all dispatched ambulances and active incident locations (OpenFreeMap + MapLibre), filterable by status (new, ongoing, completed, standby).
- **Incident Report Summary View** — Access full details of each report including nature of call, emergency type, severity, persons involved, location, and scene photo.
- **Emergency & Non-Emergency Report List** — Browse and filter all submitted reports by nature of call, status, and other criteria.
- **Responder Status Monitoring** — Track responder activity and current duty states in real time.
- **Account Registration Verification** — Review and approve/reject pending account registrations for both Ambulance Responders and Public Users to ease the workload of the CDRRMO Super Admin.
- **In-App Notification Panel** — Receive in-app real-time updates on new reports, resolved cases, and pending account registrations (all/unread tabs).
- **Profile & Account Management** — Manage personal account settings and log out securely.

---

### 4. CDRRMO Super Admin

- **Secure Web Login** — Access via Supabase Auth authentication (email, employee ID).
- **Central Dashboard with KPIs** — View key metrics including total incidents today, total responders, total resolved, and average response time; includes an incident summary chart and responder status overview.
- **Real-Time Incident Map** — Full map view (OpenFreeMap + MapLibre) of all active incidents and ambulance positions with drill-down report details.
- **Data Analytics & Visualization** — Auto-generated statistical charts (pie charts, graphs) categorizing daily incidents to support data-driven decision-making.
- **Responder Report Management** — View, filter, search, and export PDF records of all responder-submitted reports.
- **Responder Status & Activity Logs** — Chronological log of each responder's movement, duty transitions, and status changes; searchable and filterable.
- **User Management** — View all registered users with totals by status (active, pending, suspended, deactivated); search, filter, and export functions included.
- **Account Registration Verification** — Review and approve/reject pending account registrations for both Ambulance Responders and Public Users (retains full authority alongside PACC Admin).
- **Account Banning** — Ban accounts flagged for false reporting, spamming, or abuse, with required reason selection and optional notes.
- **Responder Roster & Approval** — Review, approve, or reject pending responder registrations based on submitted ID verification.
- **Post-Incident Report Summary** — Generate and review system-wide incident documentation for accountability and future planning.
- **In-App Notification Panel** — Full visibility over all system-wide emergency activity and pending account registrations via all/unread notification tabs.

---

## Non-Functional Requirements

- **Usability** — Streamlined, low-cognitive-load interface optimized for high-stress emergency use by both general public and administrators.
- **Performance / Quality** — Low-latency GPS tracking and data synchronization; real-time map updates without significant delay.
- **Portability** — Mobile app supports Android 10+ (built with Expo); web dashboard accessible on Windows/MacOS via Chrome, Firefox, Edge, and Opera.
- **Security** — Encrypted user credentials, government ID data, and sensitive medical reports; role-based access control (RBAC) limits data access by user type. Authentication handled by Supabase Auth.
- **Maintainability** — Structured codebase to enable easy updates, modifications, and troubleshooting.
- **Accessibility** — Available on any internet-connected device; desktop for command operations, mobile for field use.

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Full-Stack Framework | Next.js (Frontend + Backend REST API) |
| Mobile App | Expo (Android only) |
| Authentication | Supabase Auth |
| Database | PostgreSQL (hosted by Supabase) |
| ORM | Drizzle ORM |
| Storage (Buckets) | Supabase Storage |
| Real-Time Sync | Supabase Realtime |
| Mapping & Location | OpenFreeMap + MapLibre GL (free, open-source, no API key required) |
| Mobile Verification (OTP) | textbee.dev (open-source SMS gateway) |
| Notifications | In-App only (no push notifications / no external services) |
| Architecture | Client-Server, Star Network Topology |
| Security | Encrypted transmission, RBAC, Supabase Auth-based authentication |

---

## Key Integrations

- **OpenFreeMap + MapLibre** — Free, open-source mapping for real-time location tracking, route visualization, and nearest-ambulance identification. No payment or API key required.
- **GPS (Device-level)** — Automatic geo-tagging of incident reports and live ambulance positioning.
- **Supabase Realtime** — Real-time data synchronization and live dispatch notifications via WebSockets.
- **Supabase Storage** — Cloud storage buckets for government ID uploads, scene photos, and generated reports.
- **Supabase Auth** — Secure authentication with role-based access control for all user types.
- **textbee.dev** — Open-source SMS gateway for phone number verification (OTP) during mobile registration.
- **Government ID Verification** — Photo upload and admin-reviewed ID validation during account registration (verified by PACC Admin or CDRRMO Super Admin).

---

## Risk Management Summary

| Risk | Mitigation |
|------|------------|
| Data Breach | Encryption, Supabase RLS policies, Supabase Auth auth, RBAC |
| Internet Connectivity Issues | Network redundancy; reports queued and retried when connection restores |
| System Downtime | System monitoring, maintenance schedule, Supabase managed infrastructure |
| GPS / Location Error | OpenFreeMap + MapLibre with manual location verification fallback |
| Unauthorized Access | Supabase Auth authentication, user verification, role-based permissions |
| Data Loss / Corruption | Regular backups, Supabase managed PostgreSQL with point-in-time recovery |
| Mobile App Failure | Regular testing, updates, and application maintenance |
| Unverified User Access | Verification gate blocks all app functionality until admin approval |

---

## System Scope

- Exclusively developed for **CDRRMO Baliwag City** and its associated **PACC**.
- Covers **medical emergency incident reporting and ambulance dispatch only** — does not extend to fire, flood, police, or other emergency agencies.
- Does **not** include automated emergency detection, predictive analytics, employee monitoring, or advanced data analysis features.
- Requires internet connectivity; limited functionality in offline/low-signal environments (draft saving is supported for responders).
- **Android only** — no iOS support in the current scope.
- **In-app notifications only** — no push notifications or external notification services.

---

## Economic Summary

| Item | Value |
|------|-------|
| One-Time Development Cost | ₱130,000 |
| Staff Training | ₱10,000 |
| Monthly Recurring (Dev + Ops) | ₱26,000/month |
| 5-Year NPV | ₱562,122 |
| ROI | 114% |
| Break-Even Point | ~0.68 years (~8 months) |
