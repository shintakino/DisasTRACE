# Feature Spec 15: Users Approval (CDRRMO Super Admin)

> [!IMPORTANT]
> **Organizational Redesign Update**: The manual user/responder registration approval workflow has been reallocated **strictly to the CDRRMO Super Admin** instead of the PACC Admin. The PACC Admin is restricted from accessing registration documents or the approval API to ensure separation of duty. This specification has been updated and integrated with **Feature Spec 21: CDRRMO ID Validation & Storage** to support private image buckets and secured API endpoints.

## Overview
Implement an account registration review interface for the **CDRRMO Super Admin**. This feature acts as the "Verification Gate" defined in the architecture, allowing the Super Admin to manually inspect and approve/reject incoming registration requests for both Ambulance Responders and Public Users based on their submitted Government IDs.

## Requirements

### Master-Detail Layout Design
The interface will utilize a two-column Master-Detail layout to optimize the review workflow, similar to the Incident Verification (Feature 14) structure.

#### 1. Pending Queue (Left Sidebar)
A dedicated panel for listing unverified accounts.
- **Summary Header**: Displays total "Pending Approvals" and "Reviewed Today".
- **Queue List**: Scrollable vertical list of user cards.
- **Card Metadata**: Full Name, Requested Role (e.g., `PUBLIC USER` or `AMBULANCE RESPONDER`).
- **Timestamp**: Time since registration (e.g., "2 hours ago").
- **Status Tag**: Always `PENDING` (Orange).
- **Interactive**: Clicking a card loads the applicant's full details into the main view.

#### 2. Applicant Review (Center/Right Area)
Displays the full context of the selected applicant.
- **Header Profile**: Applicant's Name, Email, and Phone Number.
- **Identity Verification (ID Review)**:
  - A large, prominent image viewer displaying the uploaded Government ID via temporary signed URLs.
  - Features a "Click to Enlarge" functionality for verifying small text/details.
  - Labeled with the ID Type (e.g., "Driver's License", "National ID").
- **Address & Details**: Full residential address for cross-referencing with the ID.
- **Action Bar (Sticky Bottom or Top)**:
  - **Reject**: Secondary/Gray button to dismiss the application. Must open a dialog prompting for a "Reason for Rejection" (e.g., Blurry ID, Name Mismatch).
  - **Approve**: Primary/Navy Blue button to grant access. Updates the user's status to `ACTIVE`.

## Frontend Implementation

1. **Schemas & Types (`types/approval.ts`)**:
   ```typescript
   import { z } from "zod";
   import { UserRoleSchema } from "./users"; // Reuse from Feature 09

   export const ApprovalStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
   export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

   export const IdentityDocumentSchema = z.object({
     type: z.string(), // e.g., "Passport"
     imageUrl: z.string().url(),
     uploadedAt: z.string(),
   });
   export type IdentityDocument = z.infer<typeof IdentityDocumentSchema>;

   export const ApplicantSchema = z.object({
     id: z.string(), // Supabase Auth ID (UUID)
     fullName: z.string(),
     email: z.string().email(),
     phone: z.string(),
     address: z.string(),
     roleRequested: UserRoleSchema,
     status: ApprovalStatusSchema,
     identityDocument: IdentityDocumentSchema,
     registeredAt: z.string(), // ISO timestamp
   });
   export type Applicant = z.infer<typeof ApplicantSchema>;
   ```

2. **Components**:
   - `ApprovalQueue.tsx`: Sidebar list of pending applicants.
   - `ApplicantDetails.tsx`: Main area showing personal info and the ID viewer (rendering private signed URLs).
   - `ApprovalActions.tsx`: Action buttons and the Rejection Dialog (with reason input).

## Backend Architecture

1. **REST API Endpoints (`app/api/users/approval/`)**:
   - `GET /api/users/approval`: Returns the list of users currently in `PENDING` status. Generates secure, short-lived signed URLs for IDs.
   - `PATCH /api/users/approval/[id]`: Updates the user's status.
     - If `APPROVED`: Update DB status to `ACTIVE` and update the user's role in the database (syncs to JWT) to grant app access.
     - If `REJECTED`: Update DB status to `REJECTED` and store the rejection reason.

2. **Security**:
   - Ensure the endpoints strictly enforce `cdrrmo_super_admin` role checks. PACC Admin attempts must return `403 Forbidden`.

## Aesthetic & Design Guidelines
- Use the `frontend-design` skill guidelines to ensure a high-fidelity execution.
- **Layout**: Clean, authoritative, and focused on legibility to prevent eye strain during bulk reviews.
- **Color Palette**: Utilize Navy Blue (`#1E3A8A`) for primary actions and Red (`#EF4444`) strictly for critical rejections. Use subtle grays for the queue background to differentiate it from the white review surface.
- **Typography**: Strictly use `Inter`. Employ bold weights for names and roles, and lighter, smaller caps for timestamps.

## Design Alignment Checklist
- [ ] Master-Detail layout is responsive and cleanly separated.
- [ ] Identity document viewer is large, clear, and supports enlargement.
- [ ] Approve button is Navy Blue; Reject button triggers a reason dialog.
- [ ] All data is strictly typed using Zod schemas.
- [ ] Component is visually distinct but cohesive with the DisasTRACE design system.
- [ ] Access is restricted strictly to the Super Admin (enforced in `proxy.ts` and API).
