# Feature Spec 14: Verification (PACC Admin)

## Overview
Implement an incident verification and triage system for the **PACC Admin**. This interface is critical for reviewing incoming emergency reports submitted by Public Users via the mobile app. The PACC Admin can review the report details, resident information, and attached media to determine whether to `Accept` (escalating it to a live incident for dispatch) or `Reject` the report.

## Requirements

### Verification Queue (Left Sidebar)
A dedicated panel for listing and filtering incoming public reports.
- **Summary Cards (Top)**:
    - **PENDING**: `#E0F2FE` (Light Blue) - Unreviewed reports.
    - **VERIFIED**: `#DCFCE7` (Light Green) - Accepted and escalated reports.
    - **REJECTED**: `#FEE2E2` (Light Red) - Dismissed reports.
- **Queue List**: Scrollable vertical list of report cards.
    - **Card Metadata**: Request ID (e.g., `REQ-2026-0047`), Type (e.g., `Fire Emergency`).
    - **Location**: Specific address or barangay.
    - **Tag**: `EMERGENCY` (Blue) or `NON-EMERGENCY` (Gray).
    - **Interactive**: Clicking a card loads the full details into the main view.

### Incident Details (Center Area)
Displays the full context of the selected report.
- **Header**: Request ID, relative time received (e.g., "Received 2 seconds ago"), and current status.
- **Media**: Large image viewer for the photo uploaded by the user, labeled "USER SUBMITTED".
- **Incident Information**:
    - Nature of Call (Emergency / Non-Emergency)
    - Type of Emergency (e.g., Fire / Explosion)
    - People Involved (Number)
    - Location (Full address string)

### Resident Information & Actions (Right Area)
- **Action Buttons (Top)**:
    - **Reject**: Secondary/Gray button to dismiss the report.
    - **Accept**: Primary/Navy Blue button to approve and escalate the report to an active incident.
- **Resident Profile**:
    - **Avatar**: Initials in a navy circle.
    - **Contact Info**: Full Name, Phone Number, Address.
    - **Account Standing**: Number of prior reports, and a "Verified account" status indicator to help establish credibility.

## Frontend Implementation

1. **Schemas & Types (`types/verification.ts`)**:
   ```typescript
   import { z } from "zod";
   import { IncidentTypeSchema } from "./reports"; // Reuse existing enum

   export const VerificationStatusSchema = z.enum(["PENDING", "VERIFIED", "REJECTED"]);
   export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

   export const IncidentNatureSchema = z.enum(["EMERGENCY", "NON-EMERGENCY"]);
   export type IncidentNature = z.infer<typeof IncidentNatureSchema>;

   export const ResidentInfoSchema = z.object({
     id: z.string(),
     fullName: z.string(),
     phone: z.string(),
     address: z.string(),
     priorReports: z.number(),
     isVerified: z.boolean(),
   });
   export type ResidentInfo = z.infer<typeof ResidentInfoSchema>;

   export const VerificationRequestSchema = z.object({
     id: z.string(),
     requestId: z.string(), // e.g., REQ-2026-0047
     status: VerificationStatusSchema,
     nature: IncidentNatureSchema,
     type: IncidentTypeSchema,
     location: z.string(),
     peopleInvolved: z.number(),
     imageUrl: z.string().url().optional(),
     receivedAt: z.string(), // ISO timestamp
     resident: ResidentInfoSchema,
   });
   export type VerificationRequest = z.infer<typeof VerificationRequestSchema>;
   ```

2. **Components**:
   - `VerificationQueue.tsx`: Sidebar list with summary cards.
   - `VerificationDetails.tsx`: Main area showing the image and incident info.
   - `ResidentPanel.tsx`: Right sidebar showing resident info and Accept/Reject actions.

## Backend Architecture

1. **REST API Endpoints (`app/api/verification/`)**:
   - `GET /api/verification`: Returns the list of verification requests.
   - `PATCH /api/verification/[id]/status`: Updates the status to `VERIFIED` or `REJECTED`. If `VERIFIED`, the backend should automatically insert a new record into the `incidents` table for dispatching.

2. **Real-Time Synchronization**:
   - Use Supabase Realtime to subscribe to a `verification_requests` table so new public reports appear in the queue instantly without refreshing.

## Design Alignment Checklist
- [ ] Three summary cards match the Blue/Green/Red styling.
- [ ] Emergency tags match the blue/gray pill styling.
- [ ] Image viewer is large with rounded corners and a "USER SUBMITTED" badge.
- [ ] Accept button is Navy Blue (`#1E3A8A`), Reject button is light gray.
- [ ] All data is strictly typed using Zod schemas.
- [ ] Typography uses the `Inter` font family.
