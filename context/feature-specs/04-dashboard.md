# Feature Spec 04: Dashboard Page

## Overview
Implement a high-fidelity, real-time analytics dashboard strictly for the **CDRRMO Super Admin**. The dashboard provides a bird's-eye view of emergency operations, including key performance indicators (KPIs), incident trends, and personnel status. (Note: PACC Admins will have a different, role-specific dashboard view).

## Requirements

### KPI Cards (Top Row)
Four high-impact cards displaying real-time metrics with gradient backgrounds and glassmorphism effects.
- **Total Incidents Today**: 
  - **Background**: `bg-gradient-to-br from-blue-600 to-blue-400`
  - **Icon**: `Truck` (Lucide)
  - **Data**: Total count of incidents reported since 00:00.
- **Total Responders**:
  - **Background**: `bg-gradient-to-br from-red-600 to-red-400`
  - **Icon**: `Siren` (Lucide)
  - **Data**: Total number of active/on-duty responders.
- **Total Resolved Today**:
  - **Background**: `bg-gradient-to-br from-green-600 to-green-400`
  - **Icon**: `CheckCircle` (Lucide)
  - **Data**: Total count of incidents with "Resolved" status today.
- **Avg Response Time**:
  - **Background**: `bg-gradient-to-br from-orange-600 to-orange-400`
  - **Icon**: `Clock` (Lucide)
  - **Data**: Average time from report to arrival on scene (formatted as "Xm").

### Incident Summary (Middle Row)
A dual-chart visualization for analyzing incident trends.
- **Monthly Trend (Bar Chart)**:
  - **Type**: Stacked bar chart.
  - **X-Axis**: Months (Jan-Dec).
  - **Series**: Incident types (using the status colors defined in `ui-context.md`).
- **Distribution (Pie Chart)**:
  - **Categories**: Vehicular Collision, Medical Emergency, Structural Failure, Fire/Explosion, Flood/Water, Unknown Cause.
  - **Styling**: Legend on the left, interactive pie chart on the right.

### Recent Incident Reports (Bottom Left)
A scrollable list of recent emergency activities.
- **Card Content**:
  - **Badge**: Vehicle ID (e.g., "AMB-001").
  - **Title**: Incident Case ID (e.g., "DR-2026-0047").
  - **Location Row**: Origin (e.g., "CDRRMO HQ") -> Destination (e.g., "Brgy. Sabang").
- **Empty State**: Use the `Empty` component if no incidents are active.

### Responders (Bottom Right)
A horizontal scrolling area showing active personnel status.
- **Card Content**:
  - **Avatar**: Initials in a navy circle.
  - **Name**: Full name of the responder.
  - **Status Badge**: Current status (e.g., "DISPATCHED", "ON-SCENE", "AVAILABLE").
- **Interaction**: Clicking a responder card should navigate to their profile or location on the map (future phase).

## Frontend Implementation

1. **Dashboard Layout**:
   - Use a 12-column grid or standard Flexbox/Grid layouts.
   - KPI cards: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`.
   - Middle row: `grid-cols-1 lg:grid-cols-2`.
   - Bottom row: `grid-cols-1 lg:grid-cols-3` (2/3 for Reports, 1/3 for Responders).

2. **Components**:
   - **Shadcn Card**: Base for all dashboard elements.
   - **Recharts**: For Bar and Pie charts (via `@/components/ui/chart`).
   - **Lucide-React**: For all iconography.

3. **Styling**:
   - Background for all cards: `White`.
   - Border radius: `12px` (as per `ui-context.md`).
   - Shadows: `shadow-sm`.

## Backend Architecture

1. **Real-time Synchronization**:
   - Use Supabase Realtime to subscribe to `incidents` and `responder_status` tables.
   - The dashboard should update instantly when a new incident is reported or a responder's status changes.

2. **REST API Endpoints (`app/api/dashboard/`)**:
   - `GET /api/dashboard/kpis`: Returns counts for today's incidents, responders, resolved cases, and average response time.
   - `GET /api/dashboard/trends`: Returns monthly aggregated data for the bar chart.
   - `GET /api/dashboard/reports`: Returns the latest 5-10 incident reports.
   - `GET /api/dashboard/responders`: Returns a list of responders who are currently on-duty.

3. **Data Aggregation**:
   - All endpoints must enforce `cdrrmo_super_admin` role checks via Supabase JWT claims.
   - Use Drizzle ORM for all database queries.
   - Return consistent JSON shapes: `{ data, error, message }`.

4. **Database Views (Optional)**:
   - Create a SQL view for `monthly_incident_summary` to simplify trend queries.

## Design Alignment Checklist
- [ ] KPI cards use the exact gradients from the reference image.
- [ ] Bar chart uses the multi-colored stacked bars.
- [ ] Pie chart includes the percentage labels and legend.
- [ ] Incident report cards show the origin/destination flow.
- [ ] Responder cards include the avatar and status badge.
- [ ] All typography uses the `Inter` font family.
- [ ] Spacing and padding match the `p-10` and `gap-6` standard.
