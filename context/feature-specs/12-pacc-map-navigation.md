# Feature Spec 12: PACC Admin Map Navigation

## Overview
Implement a high-fidelity, real-time map-centric command center tailored for the **PACC Admin**. This view reuses the existing mapping components created for the CDRRMO Super Admin to ensure consistency and minimize duplication, while scoping data and permissions specifically to the PACC role.

## Requirements

### Shared Component Reusability
The PACC Admin Map will heavily leverage the existing components built for Feature 05. The goal is zero new component creation where possible.
- **`MapContainer.tsx`**: Used for rendering the MapLibre instance, incident pins, and responder locations.
- **`IncidentPanel.tsx`**: Used for the left sidebar showing summary cards, filter tabs, and the scrolling list of incidents.
- **`MapMarker.tsx`**: Used for rendering custom SVG map markers.

### UI Tweaks & Design Alignment
- Verify the tabs in `IncidentPanel.tsx` use the exact labels from the design: `ALL`, `NEW`, `ONGOING`, `COMPLETED`, `STANDBY` (updating existing abbreviations like "LIVE" or "DONE" if necessary to match the PACC Map.png).
- The visual styling (colors, layout, dark theme map) must remain identical to the Super Admin view and match the reference image.

### Data & State Management
- Utilize the existing `useMapData` hook.
- Data fetching must be aware of the user's role. The API endpoints should serve the relevant subset of incidents or the full set depending on PACC permissions.
- Maintain Zod schemas defined in `types/map.ts` (e.g., `MapIncidentSchema`, `ResponderStatusSchema`) strictly. Do not use `any` or `unknown` types.

## Backend Architecture

1. **REST API Endpoints (`app/api/map/`)**:
   - `GET /api/map/incidents`: Fetch active and recent incidents. Ensure the endpoint handles `pacc_admin` role checks.
   - `GET /api/map/responders`: Fetch locations for responders.
   - `GET /api/map/summary`: Fetch aggregated counts.

2. **Real-Time Synchronization**:
   - Supabase Realtime subscriptions must enforce Row Level Security (RLS) or channel filtering appropriate for the `pacc_admin` role.

## Design Alignment Checklist
- [ ] Map uses the dark midnight blue styling from the reference.
- [ ] Incident list cards show the origin-to-destination arrow flow.
- [ ] Existing `IncidentPanel.tsx` and `MapContainer.tsx` are successfully reused.
- [ ] All data is strictly typed using existing Zod schemas in `types/map.ts`.
