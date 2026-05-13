# Feature Spec 11: PACC Admin Dashboard

## Overview
Implement a high-fidelity, real-time command dashboard tailored for the **PACC Admin**. This view focuses on active emergency oversight, providing immediate visibility into key metrics, recent reports, and a comprehensive responder status grid.

## Requirements

### KPI Cards (Top Row)
Four high-impact cards displaying real-time metrics, identical in style and logic to the Super Admin dashboard.
- **Total Incidents Today**: Count of incidents reported since 00:00.
- **Total Responders**: Number of active/on-duty responders.
- **Total Resolved Today**: Count of incidents with "Resolved" status today.
- **Avg Response Time**: Average time from report to arrival.

### Incident Tracking (Middle Row)
- **Recent Incident Reports (Left)**: A scrollable list of recent emergency activities. Reuses the `RecentReports` component.
- **Incident Summary (Right)**: A pie chart visualization showing the distribution of incident types. Reuses the distribution part of the `IncidentSummary` component.

### Responders Grid (Bottom Row)
A full-width section providing detailed status for all active responders.
- **Header**: Contained within a Shadcn `Card` with a `bg-[#1E3A8A]` (Navy Blue) header labeled "Responders".
- **Grid Layout**: A responsive grid of responder cards.
- **Responder Card**:
    - **Avatar**: Circle with initials (e.g., `EG`).
    - **Name**: Responder's full name.
    - **Status Badge**: Current status (e.g., `DISPATCHED` = Blue, `STANDBY` = Green, `OFF DUTY` = Red).

## Frontend Implementation

1. **Dashboard Layout**:
   - KPI cards: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`.
   - Middle row: `grid-cols-1 lg:grid-cols-2`.
   - Bottom row: Full width (12 columns) for the Responders grid.

2. **Component Reuse**:
   - Reuse `@/components/dashboard/kpi-cards.tsx`.
   - Reuse `@/components/dashboard/recent-reports.tsx`.
   - Reuse/Adapt `@/components/dashboard/incident-charts.tsx` (Pie chart distribution only).
   - Adapt `@/components/dashboard/responder-status.tsx` for the full-width PACC grid view.

3. **State Management**:
   - Use the same real-time logic as the Super Admin dashboard, but scoped to PACC Admin permissions.

## Backend Architecture

1. **REST API Endpoints (`app/api/dashboard/`)**:
   - All existing dashboard endpoints support `pacc_admin` role checks.
   - `GET /api/dashboard/kpis`
   - `GET /api/dashboard/reports`
   - `GET /api/dashboard/responders` (ensure this returns all active responders for the grid).

## Design Alignment Checklist
- [ ] KPI cards use the exact gradients from the reference image.
- [ ] Middle row layout is a 50/50 split between Recent Reports and Pie Chart.
- [ ] Bottom row uses the Navy Blue card header style common in other PACC views.
- [ ] Responder cards in the grid match the specified avatar and badge styling.
- [ ] All typography uses the `Inter` font family.
- [ ] Spacing and padding match the `p-10` and `gap-6` standard.
