# DisasTRACE – 2nd Testing Feedback

## Super Admin / CDRRMO Issues

### 1. User Approval

#### Issue
* User list lacks scrolling functionality.

#### Required Fix
* Add pagination or a scrollable user list container.

---

### 2. User Management

#### Issue
* Account deletion triggers an internal server error.

#### Required Fix
* Debug and resolve the backend deletion process.
* Ensure successful account removal and proper error handling.

---

### 3. Dashboard

#### Incident Request Verification
##### Issue
* CDRRMO can currently view Incident Request Verification.

##### Required Fix
* Restrict access to PACC only.
* Remove visibility for the CDRRMO role.

#### Recent Incident Reports
##### Issues
* Clicking a report opens a modal instead of navigating.
* Reports use hash IDs instead of readable identifiers.

##### Required Fix
* Redirect users to:
  ```
  Maps -> Incident Requests
  ```
* Replace hash IDs with:
  * Request Number
  * Date Submitted

#### Responders Widget
##### Issue
* Responder entries are clickable.

##### Required Fix
* Remove click interaction.

#### Incident Summary
##### Issue
* No Daily filter available.

##### Required Fix
* Add:
  * Daily
  * Weekly
  * Monthly
  * Yearly

---

### 4. Maps & Incident Reports

#### Issues
* Missing descriptive heading/remark above report status.
* Missing complete date and time information.
* User reports and responder reports are mixed together.
* "New" and "Standby" statuses should not appear.

#### Required Fixes
* Add descriptive labels such as:
  * Overall Incident Statistics
  * Incident Status Overview
* Display:
  * Date Submitted
  * Time Submitted
  * Last Updated
* Separate:
  * User Submitted Reports
  * Responder Submitted Reports
* Remove:
  * New
  * Standby

---

### 5. Announcements

#### Issues
* No Save as Draft feature.
* Header UI appears cut off.

#### Required Fixes
* Add Draft workflow.
* Fix responsive header rendering.

---

### 6. Reports Management

#### Issues
* User and responder reports are not separated.

#### Required Fixes
* Create separate report categories.

---

### 7. Responder Roster

#### Issues
* Unauthorized error during suspension.
* Unauthorized error during deletion.
* Add Responder modal uses a mobile-sized layout on desktop.

#### Required Fixes
* Fix role permissions and API authorization.
* Redesign modal for desktop responsiveness.

---

### 8. Audit Logs

#### Issue
* Inconsistent text alignment.

#### Required Fix
* Standardize alignment across all log pages.

---

### 9. System-Wide UI

#### Issues
* Excess whitespace in table containers.
* Inconsistent terminology and filter formatting.

#### Required Fixes
* Optimize table spacing.
* Standardize naming conventions and filters.

---

## Admin / PACC Issues

### 1. Status & Activity Logs

#### Issue
* Logs are not synchronized in real time.

#### Required Fix
* Implement real-time updates using:
  * WebSockets
  * Server-Sent Events (SSE)
  * Firebase Realtime Database
  * Supabase Realtime

---

### 2. Verification Module

#### Issues
* Container colors don't match dashboard theme.
* Dispatch alarm sound lacks urgency.
* Account standing information is inaccurate.

#### Required Fixes
* Align colors with the design system.
* Replace alarm with a more urgent emergency tone.
* Correct account standing logic and status calculations.

---

### 3. Dashboard

#### Recent Incident Reports
##### Issue
* Reports use hash IDs.

##### Required Fix
Display:
* Request Number
* Date Submitted

#### Incident Summary
##### Issue
* Missing Daily filter.

##### Required Fix
* Add Daily view option.

#### Responders Widget
##### Issue
* Responders are clickable.

##### Required Fix
* Disable click functionality.

---

## Responder Issues

### 1. Request Accept

#### Issues
* Ambulances are selected randomly instead of considering proximity from the test I tried two responder near each other the other gets the request but I allow it to be rejected and the other responder did not get the incident report the system should pass the incident to other close responder of proximity before allowing PACC to assign it manually if no one accepts it.
* ETA does not update correctly after accepting an emergency request.
* Responders can still decline dispatched emergency requests.

#### Required Fixes
* Select the nearest available ambulance based on kilometer radius.
* Recalculate and update ETA immediately after dispatch acceptance.
* Remove the **Decline** button from dispatched emergency requests.
* Only display the **Accept Dispatch** button.

---

### 2. Announcements

#### Issue
* No pop-up notification for new announcements.

#### Required Fix
* Implement real-time pop-up notifications for announcements.

---

### 3. Home

#### Issues
* No vibration or notification sound when receiving emergency alerts.
* Alerts do not trigger when the application is running in the background.
* FAQs section is not clickable.
* Dark/black map theme reduces visibility.

#### Required Fixes
* Trigger vibration and emergency notification sounds for incoming alerts.
* Ensure notifications continue to work even when the application is minimized or running in the background.
* Fix the FAQ navigation.
* Replace or improve the current map theme for better visibility use light theme just like in web.

---

### 4. Others

#### Issues
* Application randomly returns to the Home screen while in use.
* Registration only supports uploading an ID image.
* No real-time camera capture for ID verification.

#### Required Fixes
* Investigate and fix unexpected navigation back to the Home screen.
* Allow users to either:
  * Upload an ID image
  * Capture an ID photo using the device camera
* Support live camera capture for identity verification.

---

## Public User Issues

### 1. Profile

#### Issue
* Users can upload or change their profile photo.

#### Required Fix
* Restrict users from uploading or modifying their profile picture.

---

### 2. Home

#### Issues
* Online/status indicator colors are inconsistent.
* Verification/status indicator colors are inconsistent.

#### Required Fixes
* Standardize the online indicator color to **Green**.
* Standardize the verification/status indicator color to **Green**.

---

### 3. Map

#### Issues
* Responders and admins cannot tap a user's location pin to view user details.
* Public users are sometimes incorrectly displayed as responders.
* Current dark/black map theme reduces visibility.

#### Required Fixes
* Allow responders and administrators to tap a user's location pin to view user information.
* Correct the role mapping so public users are never displayed as responders.
* Replace or improve the current map theme for better readability.

---

### 4. Responding

#### Issue
* Ambulance name labels obstruct navigation during active response.

#### Required Fix
* Remove ambulance name labels from the map while responding to an incident to improve route visibility.

---

### 5. Others

#### Issue
* Contact Us module/page has not yet been implemented.

#### Required Fix
* Develop and integrate the Contact Us page into the application.

---

## Priority Roadmap

### Critical Priority (Fix Immediately)
1. User Management – Internal Server Error on Delete
2. Responder Roster – Unauthorized Errors
3. Verification Module – Account Standing Inaccuracy
4. Status & Activity Logs – Real-Time Synchronization
5. Nearest Ambulance Selection Algorithm
6. ETA Calculation Fix
7. Background Emergency Notifications
8. Random Home Screen Navigation Bug
9. Public User Incorrectly Displayed as Responder

### High Priority
10. Incident Request Verification Role Restriction
11. Incident Reports Separation (User vs Responder)
12. Reports Management Separation
13. Save as Draft Feature
14. Date/Time Visibility Improvements
15. Camera Capture for ID Verification
16. Incident Map UI Redesign
17. Remove Decline Button from Active Dispatch
18. Contact Us Module

### Medium Priority
19. Daily Filters
20. Report Naming Standardization
21. Dashboard Navigation Improvements
22. Desktop Modal Redesign
23. FAQ Navigation Fix
24. Pop-up Announcement Notifications
25. Profile Photo Restriction
26. User Location Information on Map

### Low Priority / UI Polish
27. Header Cut-Off Issue
28. Audit Log Alignment
29. Table Whitespace Cleanup
30. Theme and Color Consistency
31. Remove Clickable Responders
32. Green Status Indicators
33. Improved Map Theme
34. Remove Ambulance Labels During Response

---

## Summary

### Super Admin / CDRRMO
* Total Issues/Enhancements: **18**
* Modules Affected:
  * User Approval
  * User Management
  * Dashboard
  * Maps & Incident Reports
  * Announcements
  * Reports Management
  * Responder Roster
  * Audit Logs
  * Global UI Components

### Admin / PACC
* Total Issues/Enhancements: **8**
* Modules Affected:
  * Status & Activity Logs
  * Verification
  * Dashboard

### Responder
* Total Issues/Enhancements: **11**
* Modules Affected:
  * Request Accept
  * Announcements
  * Home
  * Others

### Public User
* Total Issues/Enhancements: **10**
* Modules Affected:
  * Profile
  * Home
  * Map
  * Responding
  * Others
