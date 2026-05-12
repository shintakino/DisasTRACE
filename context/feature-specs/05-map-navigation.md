# Feature Spec 05: Map Navigation (CDRRMO Super Admin)

## Overview
Implement a high-fidelity, real-time map-centric command center for the **CDRRMO Super Admin**. This interface serves as the primary visual tool for tracking emergency incidents, monitoring responder locations, and managing active dispatches across Baliwag City.

## Requirements

### Incident Reports Panel (Left Sidebar)
A dedicated panel for listing and filtering emergency activities.
- **Summary Cards (Top)**: Four status-specific cards with counts:
    - **NEW**: `#E0F2FE` (Light Blue) - Unassigned or newly reported incidents.
    - **ONGOING**: `#FFEDD5` (Light Orange) - Incidents currently in progress.
    - **COMPLETED**: `#DCFCE7` (Light Green) - Incidents resolved within the current 24-hour window.
    - **STANDBY**: `#FEF9C3` (Light Yellow) - Active responders currently available for dispatch.
- **Filter Tabs**: A segmented control to filter the incident list by status: `ALL`, `NEW`, `ONGOING`, `COMPLETED`, `STANDBY`.
- **Incident List**: A scrollable vertical list of high-density cards.
    - **Card Metadata**: Vehicle ID (e.g., "AMB-001"), Case ID (e.g., "DR-2026-0047").
    - **Route Info**: Origin (e.g., "CDRRMO HQ") -> Destination (e.g., "Brgy. Sabang").
    - **Interactive**: Clicking a card highlights the corresponding marker on the map and vice versa.

### Interactive Map (Main Content)
A real-time geospatial visualization area.
- **Map Provider**: OpenFreeMap (tiles) with MapLibre GL JS (renderer).
- **Styling**: Custom dark/midnight blue theme to match the "Map.png" reference.
- **Live Tracking**:
    - **Ambulance Markers**: Dynamic pins representing responder locations.
        - **Colors**: Orange for active/dispatched, Yellow for standby/available.
        - **Labels**: Persistent tooltips or text labels (e.g., "AMB-001") next to the pin.
    - **Incident Markers**: Red pulse or distinct scene icon for current emergency locations.
- **Behaviors**:
    - **Fly-To**: Smooth camera transitions when selecting an incident from the list.
    - **Real-Time Updates**: Markers must move smoothly as GPS coordinates are received from the responder mobile apps via Supabase Realtime.

### Responsive Design
- The layout is optimized for high-resolution desktop monitors (Command Center).
- The Incident Panel can be toggled/collapsed to provide a full-screen map view if needed.

## Frontend Implementation

1. **Mapping Engine**:
   - Initialize `maplibre-gl` with OpenFreeMap style JSON.
   - Use `react-map-gl/maplibre` for a declarative React interface.

2. **Components**:
   - `MapContainer.tsx`: Main map logic, marker rendering, and camera controls.
   - `IncidentPanel.tsx`: Sidebar containing summary cards and the filtered incident list.
   - `MapMarker.tsx`: Custom SVG-based markers for ambulances and incident scenes.
   - `StatusFilter.tsx`: Tab-based filtering system.

3. **State Management**:
   - Use a custom hook (e.g., `useMapData`) to combine REST API initial fetch with Supabase Realtime event streaming.
   - Sync selection state between the list and the map markers.

## Backend Architecture

1. **Real-Time Synchronization**:
   - **Table Subscriptions**: 
     - `incidents`: For status updates and case metadata.
     - `responder_locations`: For live latitude/longitude streams.
     - `responder_status`: For real-time summary count updates.

2. **REST API Endpoints (`app/api/map/`)**:
   - `GET /api/map/incidents`: Fetch current active and recent incidents.
   - `GET /api/map/responders`: Fetch current locations and statuses of all on-duty responders.
   - `GET /api/map/summary`: Fetch the aggregated counts for the top cards.

3. **Security**:
   - Enforce `cdrrmo_super_admin` role checks on all map-related API routes.
   - Ensure real-time channel permissions are restricted to authorized admin roles.

## Design Alignment Checklist
- [ ] Map uses the dark midnight blue styling from the reference.
- [ ] Summary cards match the specific light pastel background colors.
- [ ] Ambulance markers include vehicle ID labels.
- [ ] Incident list cards show the origin-to-destination arrow flow.
- [ ] Filter tabs follow the "ALL/NEW/ONGOING/..." segmented style.
- [ ] Transitions (fly-to and marker movement) are smooth and non-blocking.
