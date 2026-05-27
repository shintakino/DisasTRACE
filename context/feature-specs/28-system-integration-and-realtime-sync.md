# Feature Spec 28: System Integration and Real-Time Sync

## Overview
This specification defines the complete integration layer linking all four actors in the **DisasTRACE** ecosystem: **Resident** (Mobile App), **Ambulance Responder** (Mobile App), **PACC Admin / Dispatcher** (Web Dashboard), and **CDRRMO Super Admin** (Web Dashboard). It maps out the reactive real-time database schema changes, API routes contracts, Supabase Realtime channel architecture (L2 Broadcast vs L4 DB changes), automatic cascading dispatch workflow, offline responder sync queues, and database custom claim triggers.

---

## 1. Relational Database Schema Additions (Drizzle ORM)

To support live tracking, automated dispatch cascading, and duty tracking, we introduce modifications to `users.ts` and `incidents.ts`.

### 1.1 User Telemetry & Shift State (`db/schema/users.ts`)
```typescript
import { pgTable, text, varchar, timestamp, doublePrecision } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  // Existing Columns
  id: varchar('id', { length: 255 }).primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  role: text('role', { enum: ['public_user', 'ambulance_responder', 'pacc_admin', 'cdrrmo_super_admin'] }).notNull(),
  status: text('status', { enum: ['ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'PENDING'] }).default('PENDING').notNull(),
  verificationStatus: text('verification_status', { enum: ['PENDING', 'APPROVED', 'REJECTED'] }).default('PENDING').notNull(),
  rejectionReason: text('rejection_reason'),
  idType: text('id_type'),
  idImageUrl: text('id_image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),

  // Integration Additions
  dutyStatus: text('duty_status', { enum: ['OFF_DUTY', 'ON_DUTY', 'ACTIVE_DISPATCH'] }).default('OFF_DUTY').notNull(),
  lastLatitude: doublePrecision('last_latitude'),
  lastLongitude: doublePrecision('last_longitude'),
  lastLocationUpdatedAt: timestamp('last_location_updated_at', { withTimezone: true }),
});
```

### 1.2 Automated Dispatch Orchestration (`db/schema/incidents.ts`)
```typescript
import { pgTable, text, varchar, timestamp, integer, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';
import { verificationRequests } from './verification_requests';

export const incidents = pgTable('incidents', {
  id: varchar('id', { length: 255 }).primaryKey(),
  requestId: varchar('request_id', { length: 255 }).references(() => verificationRequests.id).notNull(),
  responderId: varchar('responder_id', { length: 255 }).references(() => users.id), // Nullable during auto-negotiation
  status: text('status', { enum: ['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'RESOLVED'] }).default('DISPATCHED').notNull(),
  assignedAmbulance: varchar('assigned_ambulance', { length: 50 }),
  etaMinutes: integer('eta_minutes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  
  // Cascading Offer State Columns
  currentOfferResponderId: varchar('current_offer_responder_id', { length: 255 }).references(() => users.id),
  skippedResponderIds: uuid('skipped_responder_ids').array().default([]),
  offerExpiresAt: timestamp('offer_expires_at', { withTimezone: true }),
  dispatchMethod: varchar('dispatch_method', { length: 20, enum: ['AUTO_1KM', 'PACC_MANUAL'] }),
  dispatchOfferDurationSeconds: integer('dispatch_offer_duration_seconds').default(30).notNull(), // Configurable timer
});
```

---

## 2. API Endpoint Contracts & Input Validation (Zod)

All entry points to the Next.js REST API layer enforce strict parsing and authorization checks.

### 2.1 Resident Incident Submission (`POST /api/verification-requests/submit`)
*   **Authorization**: Required (`role = 'public_user'`, `verificationStatus = 'APPROVED'`).
*   **Payload (Zod)**:
    ```typescript
    const SubmitRequestSchema = z.object({
      nature: z.enum(['EMERGENCY', 'NON-EMERGENCY']),
      type: z.enum(['Medical Emergency', 'Vehicular Collision', 'Fire Emergency', 'Structural Failure', 'Flood/Water', 'Unknown Cause']),
      peopleInvolved: z.enum(['None', '1-2 Persons', '3-5 Persons', '6+ Persons']),
      locationDescription: z.string().max(150).optional(),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      imageUrl: z.string().url(),
    });
    ```
*   **Database Effect**: Inserts a new pending `verificationRequests` row, triggering the PACC real-time alert.

### 2.2 PACC Admin Incident Triage (`POST /api/verification-requests/triage`)
*   **Authorization**: Required (`role = 'pacc_admin'` or `'cdrrmo_super_admin'`).
*   **Payload (Zod)**:
    ```typescript
    const TriageSchema = z.object({
      requestId: z.string().uuid(),
      action: z.enum(['VERIFY', 'REJECT']),
      nature: z.enum(['EMERGENCY', 'NON-EMERGENCY']).optional(),
      severity: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
      rejectionReason: z.string().max(250).optional(),
    });
    ```
*   **Database Effect**: 
    *   If `action = 'VERIFY'`: Updates request status to `VERIFIED`, inserts `incidents` row, and launches the Auto-Dispatch engine.
    *   If `action = 'REJECT'`: Updates request status to `REJECTED`. If nature is non-emergency, redirects log context to the specific Barangay.

### 2.3 Responder Duty Shift Toggle (`PATCH /api/users/duty-status`)
*   **Authorization**: Required (`role = 'ambulance_responder'`).
*   **Payload (Zod)**:
    ```typescript
    const DutyStatusSchema = z.object({
      dutyStatus: z.enum(['OFF_DUTY', 'ON_DUTY']),
    });
    ```
*   **Database Effect**: Updates the responder's database profile. Only `ON_DUTY` units are visible on admin maps and eligible for auto-dispatch offers.

### 2.4 Responder Dispatch Negotiation (`POST /api/incidents/respond`)
*   **Authorization**: Required (`role = 'ambulance_responder'`).
*   **Payload (Zod)**:
    ```typescript
    const RespondDispatchSchema = z.object({
      incidentId: z.string().uuid(),
      action: z.enum(['ACCEPT', 'REJECT']),
    });
    ```
*   **Database Effect**:
    *   `ACCEPT`: Sets `incident.responderId` to the responder's ID, advances status to `EN_ROUTE`, sets responder's `dutyStatus` to `ACTIVE_DISPATCH`.
    *   `REJECT`: Appends responder ID to `skippedResponderIds` in the incident, clears `currentOfferResponderId`, and triggers the next cascade in the auto-dispatch engine.

---

## 3. Supabase Realtime System Architecture

DisasTRACE handles reactive flows by segmenting database-event subscriptions from client-to-client WebSocket broadcasts.

### 3.1 PACC Incident Triage Queue Channel
*   **Channel Type**: DB Changes L4.
*   **Target**: `verification_requests` table.
*   **Filters**: `status = PENDING`.
*   **Client**: PACC Admin listens for real-time inserts, dynamically appending them to the visual queue card layout without page reload.

### 3.2 Responder Targeted Dispatch Channel
*   **Channel Type**: Broadcast L2.
*   **Identifier**: `dispatch-offer:${responderId}`.
*   **Trigger**: Initiated by Next.js Server when an active offer is assigned to a responder.
*   **Payload**:
    ```json
    {
      "event": "offer_received",
      "payload": {
        "incidentId": "8f828a2b-ef8a-4cb7-8e68-07d0d0f7a93b",
        "type": "Vehicular Collision",
        "severity": "High",
        "latitude": 14.9547,
        "longitude": 120.9012,
        "locationDescription": "In front of Sabang Barangay Hall",
        "expiresAt": "2026-05-26T18:15:15.000Z"
      }
    }
    ```

### 3.3 Active Incident Telemetry & State Channel
*   **Channel Type**: Broadcast L2.
*   **Identifier**: `incident-tracking:${incidentId}`.
*   **Emitters**: The active Responder mobile client emits telemetry at a **fixed 5-second interval** to ensure precise coordinates while keeping battery overhead low during short-lived responses (~10-15 minutes).
*   **Subscribers**: The reporting Resident app (rendering en-route ambulance and active ETA) and PACC/CDRRMO Web maps (updating markers in real-time).
*   **Payload Shape**:
    ```json
    {
      "event": "telemetry",
      "payload": {
        "latitude": 14.9568,
        "longitude": 120.9025,
        "heading": 45.2,
        "speedKph": 42.5,
        "etaMinutes": 6
      }
    }
    ```

---

## 4. Route Drawing & ETA Calculus (OSRM Integration)

To draw accurate en-route trajectories and calculate Estimated Time of Arrival (ETA):
*   **Routing API**: Uses the **OSRM (Open Source Routing Machine) Public API** (`http://router.project-osrm.org/route/v1/driving/`).
*   **Process**:
    1. The client (Resident / PACC Admin / CDRRMO Admin) makes a request with coordinates: `[ResponderLongitude,ResponderLatitude;ResidentLongitude,ResidentLatitude]`.
    2. OSRM returns the exact road-network polyline path (decoded using `@mapbox/polyline`) and travel duration in seconds.
    3. The polyline geometry is rendered on the MapLibre map, and duration is converted to minutes to display as the ETA on the Bottom Sheet.

---

## 5. State Machines

### 5.1 Auto-Dispatch Cascading & Manual Override Loop
1.  **Trigger**: Incident verified as `EMERGENCY`.
2.  **Selection**: PostGIS search finds the closest `ON_DUTY` responder within a 1.2km radius who is *not* in `skippedResponderIds`.
3.  **Offer**: Updates `incident.currentOfferResponderId = selectedResponderId` and sets `offerExpiresAt = NOW + dispatchOfferDurationSeconds`. Pushes WebSocket alert.
4.  **Timer Loop**: Next.js background scheduler checks active offers. If `offerExpiresAt < NOW` and status is still `DISPATCHED`:
    *   Treats as timeout.
    *   Appends `selectedResponderId` to `skippedResponderIds`.
    *   Clears `currentOfferResponderId`.
    *   Cascades back to **Step 2**.
5.  **Fallback (Option A + B Backup)**: If all eligible responders are found in range and decline/timeout:
    *   **Manual Override Alert (Primary)**: Pushes real-time `dispatch_escalation` webhook to the PACC dashboard, playing a loud **Auditory Chime** and sliding up a **Bottom Sheet Overlay** showing all active responders with a "Force Dispatch" button.
    *   **Recycle Queue (Backup)**: If no manual action is taken by the dispatcher within 120 seconds of the override alert, the incident status automatically reverts to `PENDING` (re-entering the general triage queue).

### 5.2 Mobile Client States
```
       +--------+            +-------------------+            +------------+
  ---> |  IDLE  | ---------> | DISPATCH_OFFERED  | ---------> |  EN_ROUTE  |
       +--------+            +-------------------+            +------------+
           ^                           |                            |
           |                           | (Timeout / Decline)        |
           |                           v                            v
           |                      +--------+                  +------------+
           +--------------------- |  IDLE  |                  |  ARRIVED   |
                                  +--------+                  +------------+
                                                                    |
                                                                    v
                                  +--------+                  +------------+
                                  |  IDLE  | <--------------- |  RESOLVED  |
                                  +--------+                  +------------+
```

---

## 6. Incident Cancellation & Resolution Policies

### 6.1 Resident Incident Cancellation
*   **Time Gate**: Residents can cancel their report **only within the first 60 seconds** after submission.
*   **Verification Gate (Strict Lock-In)**: Once PACC verifies the incident and dispatches the ambulance:
    *   The "Cancel Report" button is completely removed from the mobile interface.
    *   A primary **"Call PACC Command Center"** button is rendered, linking directly to the PACC hotline deep-link (`tel:${paccHotline}`). This prevents residents from canceling while responders are navigating active traffic.

### 6.2 Incident Resolution & Feedback Loop
*   **Trigger**: Responder arrives and logs scene outcome, moving incident status to `RESOLVED`.
*   **Resident View Transition**: The Resident's map screen instantly slides away, transitioning to an elegant full-screen **Feedback Card Modal**.
*   **UI Components**:
    *   Response metrics: Arrival time, total duration.
    *   Rating: Interactive **5-Star Rating System** for response speed and service quality.
    *   Input: Text input for optional notes/feedback.
    *   Action: "Submit Review" returns user to the main dashboard.

---

## 7. Offline Data Resiliency (Responder Reports)

When responders have zero network connectivity during scene report completion, data security is guaranteed through a local-first JSON queuing structure.

### 7.1 The Local Buffering Store
Using Zustand integrated with AsyncStorage:
```typescript
interface OfflineReportQueue {
  queue: Array<{
    localId: string;
    incidentId: string;
    description: string;
    scenePhotos: string[]; // Local file:// references
    participants: any[];
    timestamp: string;
  }>;
}
```

### 7.2 Dynamic Sync Protocol
1.  **Draft Preservation**: Responder saves or submits the report. If `@react-native-community/netinfo` returns `isConnected = false`:
    *   Serializes payload and appends to local queue.
    *   Notifies user: *"Report saved locally as draft. Will sync automatically once network restores."*
2.  **Queue Sync Parser**:
    *   Triggered on internet re-connection.
    *   For each queued report:
        1. Uploads local photos (`file://`) to the Supabase Storage bucket (`scenes/{incidentId}/`).
        2. Replaces local image refs with public bucket URLs.
        3. Submits payload to `POST /api/reports/submit`.
        4. On `201 OK`, purges the local AsyncStorage item.
        5. Fires success banner: *"Draft sync complete. Incident resolved."*

---

## 8. Registration & Verification Safety Gates

Strict role checks protect every node of the ecosystem, starting at the database level.

### 8.1 Database Sync Trigger (Public to Auth Users)
When the CDRRMO Super Admin approves a user, the metadata is pushed to the JWT session claims:
```sql
CREATE OR REPLACE FUNCTION public.handle_update_user_role_and_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Approve user moves status to ACTIVE
  IF NEW.verification_status = 'APPROVED' AND OLD.verification_status != 'APPROVED' THEN
    NEW.status := 'ACTIVE';
  END IF;

  -- Push updates to Supabase Auth metadata for JWT verification
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(NEW.role)
    ),
    '{status}',
    to_jsonb(NEW.status)
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 8.2 Mobile Router Gate (`_layout.tsx`)
The root navigator checks the user's `verificationStatus` on every mount and blocks routes accordingly:
*   `verificationStatus = 'PENDING'`: Automatically redirects all routes to `/(verification)/pending`.
*   `verificationStatus = 'REJECTED'`: Redirects to `/(verification)/rejected` (presenting the rejection reason and allowing re-registration).
*   `verificationStatus = 'APPROVED'`: Unlocks the tab layout (`/(tabs)`).
