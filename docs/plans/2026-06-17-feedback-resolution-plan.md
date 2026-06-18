# DisasTRACE 2nd Testing Feedback Resolution Plan

Based on the `DisasTRACE_2nd_Testing_Feedback.md` and our `ai-workflow-rules.md`, here is the incremental execution plan. We will tackle one unit at a time, ensuring it works end-to-end and updating the `progress-tracker.md` before moving to the next.

## Phase 1: Critical Priority (Backend, Auth & Real-Time)

### Unit 1.1: Backend Actions & Permissions Fixes
- **Target:** Fix internal server errors and unauthorized errors during user/responder deletion and suspension.
- **Tasks:**
  - Debug and resolve `DELETE /api/users/[id]` (or similar endpoint) triggering internal server error.
  - Fix role permissions and API authorization logic for suspending/deleting responders in the roster.
  - Fix account standing inaccuracy in the Verification Module.

### Unit 1.2: Real-Time Sync for Status & Activity Logs
- **Target:** Status & Activity Logs lack real-time synchronization.
- **Tasks:**
  - Implement Supabase Realtime channel subscriptions on the Status & Activity Logs pages.
  - Update `Activity Logs` table to listen for DB inserts/updates and refresh the UI automatically.

## Phase 2: High Priority (Separation & Workflows)

### Unit 2.1: Route Restriction & Reporting Separation
- **Target:** Restrict pages and separate user/responder reports.
- **Tasks:**
  - Restrict access to Incident Request Verification to PACC only (remove from CDRRMO role).
  - Modify Reports Management to visually and functionally separate User Reports and Responder Reports.
  - Apply similar separation in the Maps & Incident Reports sections.

### Unit 2.2: Draft Workflows & Date/Time Visibilities
- **Target:** Add announcement drafts and fix incident date/time display.
- **Tasks:**
  - Implement "Save as Draft" workflow for Announcements.
  - Update Maps & Incident Reports to add complete Date/Time visibility (Date Submitted, Time Submitted, Last Updated).
  - Add descriptive labels (Overall Incident Statistics, Incident Status Overview) and remove "New"/"Standby" statuses.

## Phase 3: Medium Priority (Dashboard Widgets & Modals)

### Unit 3.1: Dashboard Fixes & Filters
- **Target:** Resolve Dashboard issues across CDRRMO & PACC views.
- **Tasks:**
  - Modify Recent Incident Reports to redirect to `Maps -> Incident Requests` instead of opening a modal.
  - Replace hash IDs with readable identifiers (Request Number & Date Submitted).
  - Add "Daily", "Weekly", "Monthly", "Yearly" filters to the Incident Summary.
  - Disable click functionality on the Responders Widget.

### Unit 3.2: Modal & Layout Redesigns
- **Target:** Fix unresponsive or broken layouts.
- **Tasks:**
  - Redesign the "Add Responder" modal for desktop responsiveness.
  - Address missing scrolling functionality in the User Approval list (add pagination/scrollable container).

## Phase 4: Low Priority / UI Polish

### Unit 4.1: Theming & Audio
- **Target:** Fix design system mismatches and audio cues.
- **Tasks:**
  - Align Verification Module container colors with the dashboard theme.
  - Replace PACC Dispatch alarm sound with a more urgent emergency tone.

### Unit 4.2: Layout Cleanup
- **Target:** Clean up whitespace, alignment, and overflowing text.
- **Tasks:**
  - Fix Header UI cut-off in Announcements.
  - Standardize text alignment in Audit Logs.
  - Optimize table spacing and remove excess whitespace system-wide.
  - Standardize naming conventions and filters.

---
**Workflow Agreement:**
We will proceed with Phase 1, Unit 1.1 upon your approval. After completing each unit, I will update `context/progress-tracker.md` and present the results before proceeding to the next.
