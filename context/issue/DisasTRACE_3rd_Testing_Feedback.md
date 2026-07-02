# Required Fixes - Test Findings 3

# Super Admin / CDRRMO

## User Approval

### Issue

* User list does not support scrolling.

### Required Fix

* Implement a scrollable user list or pagination for large datasets.

---

## Maps → Incident Reports

### Issue

* Tapping the green indicator does not automatically scroll to the Responder-Submitted Reports section.
* Tapping the other indicator does not return to the User-Submitted Reports section.

### Required Fix

* Implement automatic scrolling behavior between:

  * User Submitted Reports
  * Responder Submitted Reports

---

## Reports Management

### Issues

* The **Responder Reports** title remains unchanged when switching to **User Reports**.
* The **View Report** modal uses a mobile-sized layout on desktop.

### Required Fixes

* Dynamically update report titles based on the selected report type.
* Redesign the View modal to use a responsive desktop layout.

---

## Responder Roster

### Issues

* The **CDRRMO HQ** text shrinks inside the Responder Type field.
* Modal designs are inconsistent throughout the platform.

### Required Fixes

* Maintain consistent typography regardless of text length.
* Standardize all modal layouts and headers using the **Add New Responder** modal as the design reference.

### Apply Standardized Modal Design To

* Maps → Report Details
* Responder Reports
* Reports Management
* User Management (Ban, Manage, Delete)
* Responder Roster (Manage, Delete)
* Support Messages

### Reference Image

* `context/issue/3rdTestImages/1.png`,
* `context/issue/3rdTestImages/2.png`,

---

# Admin / PACC

## Status & Activity Logs

### Issue

* Activity logs do not synchronize in real time.

### Required Fix

* Implement real-time synchronization using WebSockets or equivalent technology.

---

## Verification Module

### Issues

* Verification containers do not match dashboard colors.
* Dispatch alarm lacks urgency.
* Account standing information is inaccurate.

### Required Fixes

* Standardize dashboard and verification colors.
* Replace the current alarm with a more urgent emergency sound.
* Correct account standing calculations and status logic.

---

## Manual Dispatch

### Issues

* Online responders are displayed as offline during manual dispatch.
* User personal information is missing from report details.

### Required Fixes

* Synchronize responder online status across all modules.
* Display user information where appropriate within reports.

---

# Responder

## Request Accept / Report Request

### Issues

* Incident assignment does not properly prioritize nearby responders.
* If one responder rejects a request, nearby responders are not automatically considered.
* ETA calculations do not update after dispatch acceptance.
* Responders can decline dispatched requests.
* Trip Summary KM and Response Time values are inaccurate.

### Required Fixes

* Implement a proximity-based responder selection algorithm.
* Forward incidents to other nearby responders before escalating to manual PACC dispatch.
* Update ETA calculations in real time.
* Remove the **Decline** button.
* Only display **Accept Dispatch**.
* Correct KM and response time calculations in Trip Summary reports.

### Reference Images

* `context/issue/3rdTestImages/3.png`,
* `context/issue/3rdTestImages/4.png`,

---

## Home

### Issues

* No vibration or sound alerts for emergencies.
* Alerts do not function in the background.
* Ambulance locations do not update using live GPS data.

### Required Fixes

* Enable vibration and emergency notification sounds.
* Support background notifications.
* Implement continuous GPS synchronization.

### Example

* Ambulance displayed in **Tiaong** while the responder device is physically in **Paitan**.

### Reference Images

* `context/issue/3rdTestImages/12.png`,

---

## Announcements

### Issue

* Announcement notifications behave differently from dispatch notifications.

### Required Fix

* Match announcement notifications with dispatch notification behavior, including:

  * Pop-up display
  * Sound alerts
  * Vibration
  * Background handling

### Reference Images

* `context/issue/3rdTestImages/5.png`,

---

## Offline Behavior

### Issue

* Account names change while offline and revert when reconnecting.

### Required Fix

* Maintain locally cached profile information during offline operation.


### Reference Images

* `context/issue/3rdTestImages/6.png`,
---

## Responder Map

### Issue

* Notification and Re-center buttons overlap.

### Required Fix

* Reposition controls to avoid overlap.

### Reference Image

* `context/issue/3rdTestImages/7.png`,

---

# Public User

## Account Registration

### Issues

* Registration fields auto-fill unexpectedly while typing.
* Users cannot capture ID photos directly.
* Missing spacing after the **Create Account** button text.

### Required Fixes

* Investigate and remove unintended auto-fill behavior.
* Allow:

  * Uploading ID images
  * Real-time camera capture
* Correct button spacing and typography.

### Reference Images

* `context/issue/3rdTestImages/8.png`,
* `context/issue/3rdTestImages/9.png`,

---

## Report Request

### Issues

* Camera zoom functionality is unavailable.
* Trip Summary KM and Response Time values are inaccurate.

### Required Fixes

* Implement camera zoom controls.
* Correct distance and response time calculations.

### Reference Images

* `context/issue/3rdTestImages/10.png`,

---

## Awaiting Verification

### Issue

* Users can repeatedly submit reports by navigating backward.

### Required Fix

* Disable repeated submissions after the first successful submission.
* Lock the report until verification is completed.

---

## Announcement Notifications

### Issue

* Announcement notifications are inconsistent with responder dispatch notifications.

### Required Fix

* Use identical notification behavior across all platforms.

---

## ID Verification

### Issue

* Real-time camera capture is not supported.

### Required Fix

* Add live camera capture functionality during identity verification.


---

# Global Design Standards

## Modal Standardization

All system modals should adopt the same design language as:

**Reference Design**

* `add-new-responder-modal.png`

### Required Standardization Targets

* Maps → Report Details
* Reports Management
* Responder Reports
* User Management
* Responder Management
* Support Messages

---

# Priority Matrix

## Critical

1. Responder proximity dispatch algorithm
2. Real-time GPS updates
3. ETA calculation fixes
4. Account standing corrections
5. Manual dispatch status synchronization
6. Awaiting verification spam prevention

---

## High Priority

7. Modal standardization
8. Background notifications
9. Trip summary accuracy
10. User information visibility
11. Announcement notification improvements

---

## Medium Priority

12. Registration camera capture
13. Camera zoom support
14. Offline account handling
15. Responsive desktop modals

---

## Low Priority

16. Typography fixes
17. Button spacing improvements
18. UI overlap corrections
19. Color consistency updates
