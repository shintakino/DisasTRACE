# Feature 27: Responder Dispatch Flow

## Overview
This feature implements the Responder-side mobile application flow for receiving dispatches, tracking en route, and confirming arrival/outcome at the scene. It introduces role-based layout rendering for the `(tabs)` group so that Responders see a distinct Home screen (Map-based) and different tab navigation (Home, Reports, Forms, Profile) compared to Public Users.

## References
- `context/design-image/responder/1.png` - Responder Home (Map view, On Duty status, Active Dispatch Alert)
- `context/design-image/responder/2.png` - Dispatch Acceptance Sheet (Countdown, incident details, Accept Dispatch)
- `context/design-image/responder/3.png` - En Route View (Route drawn, ETA, speed, expandable incident report banner)
- `context/design-image/responder/4.png` - Expanded Incident Report (Incident details, photos)
- `context/design-image/responder/5.png` - Arrival Confirmation Dialog (Confirming arrival accessible)
- `context/design-image/responder/6.png` - On Scene View (Scene Time, Outcome Selection)
- `context/design-image/responder/7.png` - Outcome Selection (Transport to Hospital)
- `context/design-image/responder/8.png` - Outcome Selection (Patient Refused / Other)

## Core Requirements

### 1. Role-Based Navigation & Layout
- Update `app/(tabs)/_layout.tsx` to serve role-specific tabs:
  - **Resident**: Home, Reports, Map, Profile
  - **Responder**: Home, Reports, Forms, Profile
- The Responder's "Home" screen is fundamentally a full-screen Map view.

### 2. Responder Home (Map View)
- **Profile Header**: Floating pill showing Responder Name, Employee ID (mocked for now), and Duty Status badge (e.g., "ON DUTY" in Red/Pink pill).
- **Map Background**: Dark-themed MapLibre map centered on current location.
- **Location Badge**: Floating badge showing "Your Location: Baliwag City".
- **Top Icons**: Help and Notification icons.

### 3. Dispatch Alert & Acceptance
- When a dispatch is received (or simulated), a red banner appears on the Home screen ("New Report - Brgy. Sabang...").
- Tapping the banner opens a Bottom Sheet Modal.
- **Dispatch Sheet UI**:
  - Countdown progress bar (e.g., 5 seconds) at the top.
  - Incident type (e.g., Vehicular Collision) and distance.
  - 3 metric pills: Nature (EMERGENCY), People involved, ETA (~8 min).
  - Reporter info pill with profile initial and name.
  - "Accept Dispatch" primary red button.

### 4. En Route Tracking
- Upon accepting, the UI transitions to the tracking state.
- **Map View**: Draws a route line between responder and incident. Changes status badge to "DISPATCHED" (white pill).
- **En Route Sheet**:
  - Location address.
  - 3 metric pills: ETA, ELAPSED time (counting up), SPEED (mocked or from location services).
  - Red expandable accordion for "Incident Report" (Read before arrival).
  - Primary button: "Arrived at Scene" (Navy blue).

### 5. Arrival Confirmation & On Scene
- Tapping "Arrived at Scene" triggers an alert dialog: "Arrival Confirmation - Confirming arrival at [Location]. Is the incident location accessible from your current position?"
- **On Scene Sheet**:
  - Header badge changes to "ON SCENE" (white pill).
  - Red badge on sheet: "ARRIVED AT SCENE".
  - "Scene Time" counter starts counting up.
  - Radio list for "WHAT IS THE OUTCOME?":
    1. Handled on Scene
    2. Transport to Hospital
    3. Patient Refused / Other
  - Info box: "The form will be pre-filled from the resident's report..."
  - Primary button: "End Sharing" or dynamic based on selection (e.g. "Transport to Hospital").

## Technical Architecture
- **State Management**: Zustand store (`useResponderStore`) to manage dispatch state (`IDLE`, `DISPATCH_OFFERED`, `EN_ROUTE`, `ON_SCENE`).
- **UI Components**: Reusable Bottom Sheet (using `@gorhom/bottom-sheet`), custom radio buttons, expandable accordions (using `react-native-reanimated`).
- **Map**: Use `MapLibre` to render the dark map. Use GeoJSON lines to mock the route.
- **Animations**: Use `react-native-reanimated` for expanding the incident details and countdown progress bar.

## Out of Scope
- Actual live GPS tracking synchronization with the backend (this will be mocked using local state/timers for now until backend wiring is requested).
- Actual submission of the incident report form to the database (UI flow only).
