# Resolved Issues Summary (CDRRMO & PACC Dashboards)

This document provides a summary of all testing feedback items resolved for the **CDRRMO (Super Admin)** and **PACC (Admin)** dashboards in the DisasTRACE platform, based on the testing feedback document [DisasTRACE_1st_Testing_Feedback_EN.md](file:///D:/dev/freelance/disas_trace/context/issue/DisasTRACE_1st_Testing_Feedback_EN.md).

---

## CDRRMO (Super Admin Dashboard)

### 📊 Dashboard
* **Incident Summary Capitalization:** Standardized options to `"Weekly"`, `"Monthly"`, and `"Yearly"` in the incident charts dropdown filters.
* **Pie Chart Text Blinking:** Disabled Recharts entry animation (`isAnimationActive={false}`) on the `Pie` component in `IncidentDistribution`, preventing percentage labels from flickering during update cycles.
* **Incident Trend Year Filter:** Integrated a dynamic year selector (supporting current year and 2 prior years) inside the `IncidentTrends` bar chart header, binding it to the backend database queries.
* **Interactive Lists (Recent Reports):** Wrapped list card items in the "Recent Incident Reports" table section with click listeners that trigger the full-fidelity [ReportDetailSheet](file:///D:/dev/freelance/disas_trace/components/reports/report-detail-sheet.tsx) modal.
* **Interactive Lists (Responders):** Bound responder profile cards to redirect dispatchers directly to the Status & Logs page (`/logs`) for detailed shift monitoring.

### 🗺️ Maps
* **Lighter Map Style:** Switched `MAP_STYLE` in the main map container to the light `liberty` OpenFreeMap vector tile design.
* **Paddings and Heights Constraints:** Resolved a CSS grid height leak in `map/page.tsx` by constraining container heights (`h-full`), making the left incident panel scrolling viewport function correctly. Fully restricted global page height by applying `h-screen overflow-hidden w-full` to the `SidebarProvider` layout component, eliminating the global browser window scrollbar on the right side of the screen and keeping scrollbars localized exclusively to the left-side incident reports panel.
* **Calendar Date Filter:** Integrated a Popover + Calendar picker component inside the `IncidentPanel` header, allowing dispatchers to isolate incidents on the map by date.
* **Layer Toggles (Hide/Unhide):** Created a floating glassmorphic layer control panel on the map to selectively hide or show pending emergency requests and verified reports.
* **Pin & List Card Sync:** Added a `useEffect` layout sync in `IncidentPanel` that calls `scrollIntoView()` on a report card when its respective map pin is clicked. Added a detailed view link inside the map popup.
* **Hospital Marker Contact Preview:** Passed contact and service fields (`address`, `phone`, `caters`) to the Map markers and designed a Google Maps-style popup details card on hover.

### 📝 Reports & Logs
* **Capitalization Standardization:** Standardized the Status Type filter to `"All Statuses"` across the logs header, report filters, and user accounts header.
* **Audit Log Role Formats:** Standardized the role options in `audit-header.tsx` to match system-defined names: `"Super Admin"`, `"PACC Admin"`, `"Responder"`, and `"Public User"`.
* **Signature Design in PDF Export:** Replaced the legacy `"SUPERINTENDENT / CHIEF"` text inside the PDF generation approval block in `lib/pdf-export.ts` with `"LDRRMO IV"`.
* **Audit Logs Filter Fix:** Resolved the inactive role filter bug inside the Security Audit Trail page ([page.tsx](file:///D:/dev/freelance/disas_trace/app/(dashboard)/audit/page.tsx)), appending `role` to the API fetch query params, and updated the backend GET `/api/audit` route controller ([route.ts](file:///D:/dev/freelance/disas_trace/app/api/audit/route.ts)) to read `role` parameters and filter log queries at the database layer using `eq(users.role, role)`.

### 👥 User Management & Profile
* **Account Standing Verification:** Replaced static mockup counters with a real-time Drizzle query that counts the resident's historical requests in the database.
* **Dialog Container Adjustments:** Increased the maximum width of the user account creation dialog in `user-action-dialogs.tsx` to `sm:max-w-[550px]` for enhanced layout spacing.
* **Deactivated Account Gates:** Configured Edge Middleware `proxy.ts` to intercept user logins. If an admin or responder account status is set to `'SUSPENDED'` or `'DEACTIVATED'`, access to the web dashboard and REST API endpoints is blocked, displaying a warning notice on `/unauthorized-platform`.
* **Profile Cleanup & Guidelines:**
  * Removed the profile avatar camera change triggers from the profile tabs.
  * Compressed white spacing around the profile tab container cards.
  * Embedded a read-only terms & conditions text editor tab detailing the platform's guidelines.
* **Table Pagination and Scrolling Fix:** Added height containment and overflow properties (`h-full w-full overflow-y-auto`) to the user list wrapper page, resolving an issue where the pagination toolbar and table details were clipped off-screen when records exceeded the viewport size.
* **Activated PDF Exporting:** Fully implemented the `"EXPORT PDF"` feature inside the User Management dashboard page ([page.tsx](file:///D:/dev/freelance/disas_trace/app/(dashboard)/users/page.tsx)), creating a dedicated `exportUsersListPDF` client-side generation handler in [pdf-export.ts](file:///D:/dev/freelance/disas_trace/lib/pdf-export.ts) to construct and download formatted, branded PDFs containing filtered user records, matching the layout signatures of the system.

### ❓ Support & FAQs
* **FAQ Order Guidelines:** Re-labeled the display order index input fields to `"Sort Order (Lower first)"` with detailed tooltip instructions.

---

## PACC (Admin Dashboard)

### 📊 Dashboard & Map Features
* All shared components—including **pie chart animation fixes**, **Recent Reports click triggers**, **Responders status redirects**, **map styles**, **visibility layer toggles**, **calendar popovers**, and **Google-Maps-style hospital popups**—were successfully unified and applied to the PACC layout automatically.

### ⚠️ Verification Triage
* **Queue Scrolling Viewport:** Fixed container height definitions in `verification/page.tsx` from `h-[calc(100vh-88px)]` to `h-full`, ensuring the list scrollbar fits and renders inside the main flex element.
* **OTP Phone Formats:** Modified the backend triage parser to sanitize alphanumeric entries and use regex extraction to map `"1 Person"`/`"2 Persons"` inputs securely to database enum ranges.
* **Rejection Exception Fix:** Rebuilt the `public.generate_database_notifications()` trigger function in Supabase to eliminate database transaction rollback crashes when triaging verification requests.

### 🔊 Emergency Sirens & Loops
* **Urgent Looping Alarms:** Integrated a persistent `useEffect` sound loop in `verification/page.tsx` using the Web Audio API. It continuously plays a dual-tone emergency siren or warning double-beep every 4.5 seconds if there are unhandled active alerts or manual dispatch requests in the dispatcher's queue, until they are acted upon or muted.
* **Sidebar Support Access:** Restored the `"Support & FAQs"` option inside the PACC navigation layout `PACC_NAV` in `lib/navigation.ts`, matching the CDRRMO Super Admin layout.

### 🤖 Auto-Dispatch Rules
* **Restricted Auto-Dispatch:** Modified the PATCH verification status and POST triage routes to only trigger automatic responder selection if the incident nature is `"EMERGENCY"`. 
* **Manual Dispatch Handover:** Non-emergencies and emergency incidents that fail to find a responder in range (1.2 km) are automatically assigned to a manual dispatch placeholder (`dispatchMethod = 'PACC_MANUAL'`), keeping them in the pending queue for dispatchers to route.
