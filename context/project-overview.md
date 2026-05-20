# DisasTRACE

## Overview

DisasTRACE is a centralized digital platform for emergency incident reporting and ambulance dispatch, built for CDRRMO Baliwag City and its associated PACC (Public Assistance and Command Center). It connects four user types — public users, ambulance responders, PACC dispatchers, and CDRRMO administrators — through a mobile app (Android) and a web dashboard to streamline emergency response in Baliwag City.

## Goals

1. Replace manual/hotline-based incident reporting with a mobile-first digital system.
2. Automate ambulance selection and dispatch to reduce response time and minimize human error.
3. Provide live GPS-based ambulance tracking so authorized personnel can monitor and coordinate responses.
4. Enable real-time data synchronization between field responders and command center administrators.
5. Enforce identity verification for all mobile users before granting app access.

## Core User Flows

### Public User (Android — Expo)

1. User registers with personal details, contact info, and a government-issued ID photo.
2. Phone number is verified via OTP (textbee.dev).
3. Account enters "Pending Approval" — user is blocked from all features until a CDRRMO Super Admin verifies the registration (PACC Admins no longer perform user validations).
4. Once verified, user can submit emergency or non-emergency incident reports with photos, GPS location, and a structured WH form.
5. After dispatch, user tracks the assigned ambulance on a live map with ETA.
6. User receives in-app notifications for report status updates.

### Ambulance Responder (Android — Expo)

1. Responder registers with credentials and government ID.
2. Account is pending until verified by a CDRRMO Super Admin.
3. Once verified, responder receives dispatch alerts with a countdown timer.
4. Responder accepts, navigates to the scene via live GPS map, confirms arrival, and logs the outcome.
5. Responder fills out an incident report form (pre-populated from the public user's submission).
6. Reports can be saved as drafts offline and synced when connectivity restores.

### PACC Admin / CDRRMO Super Admin (Web — Next.js)

1. Admin logs in via Supabase authentication.
2. CDRRMO Super Admin reviews and verifies pending user/responder registrations (PACC Admin focuses strictly on emergency triage and dispatching, and no longer performs registration approvals).
3. Admin monitors incoming incident reports, triages emergencies, and dispatches ambulances.
4. Admin tracks all active incidents and ambulance positions on a real-time map.
5. CDRRMO Super Admin accesses KPI dashboards, analytics, user management, account banning, and report exports.

## Features

### Authentication & Verification

- Supabase Auth for all user types.
- Government ID upload and admin-reviewed verification for mobile users.
- OTP phone verification via textbee.dev.
- Verification gate: mobile users are blocked from all features until admin approval.
- Only CDRRMO Super Admin can approve/reject registrations.

### Incident Reporting & Dispatch

- Mobile incident submission with photo capture, GPS tagging, and structured form.
- Automated incident triaging (emergency vs. non-emergency).
- Dispatcher-initiated ambulance dispatch with nearest-unit selection.
- Dispatch notification with countdown timer and auto-forward on no response.

### Real-Time Tracking & Maps

- Live ambulance GPS tracking with ETA for public users post-dispatch.
- Real-time incident map for PACC Admin and CDRRMO Super Admin.
- Hospital map view for public users.
- All mapping via OpenFreeMap + MapLibre (free, open-source, no API key).

### Responder Operations

- On-scene arrival confirmation and outcome logging.
- Detailed incident report form with pre-populated data.
- Draft/offline save with sync reminders.
- Duty status management visible to admins.

### Administration

- KPI dashboard (incidents today, responders, resolved, avg response time).
- Data analytics and visualization (pie charts, graphs).
- User management with status filtering (active, pending, suspended, deactivated).
- Account banning with reason tracking.
- Responder activity logs and status history.
- Report export to PDF.

### Notifications

- In-app notifications only — no push notifications or external notification services.
- Covers: report verifications, dispatch alerts, resolved incidents, pending registrations.

## Scope

### In Scope

- Android mobile app for Public Users and Ambulance Responders (Expo).
- Next.js web dashboard for PACC Admin and CDRRMO Super Admin.
- Supabase Auth with role-based access control.
- Account verification gate for mobile users (only CDRRMO Super Admin can verify).
- Incident reporting, triaging, and ambulance dispatch.
- Real-time GPS tracking and mapping (OpenFreeMap + MapLibre).
- Supabase PostgreSQL database with Drizzle ORM.
- Supabase Storage for file uploads (IDs, photos, reports).
- Supabase Realtime for live data synchronization.
- In-app notification system.
- OTP verification via textbee.dev.

### Out Of Scope

- iOS mobile app.
- Push notifications / external notification services.
- Automated emergency detection or predictive analytics.
- Fire, flood, police, or non-medical emergency response.
- Billing and subscription systems.
- Employee performance monitoring.

## Success Criteria

1. A public user can register, get verified, and submit an incident report with GPS location.
2. A CDRRMO Super Admin can verify pending registrations.
3. Unverified mobile users are fully blocked from app functionality.
4. A dispatcher can triage reports and dispatch the nearest ambulance.
5. A public user can track a dispatched ambulance in real time with ETA.
6. A responder can accept a dispatch, navigate, and submit an incident report.
7. The CDRRMO Super Admin can view KPI dashboards, manage users, and export reports.
8. All real-time sync works via Supabase Realtime without significant delay.
nt delay.
