# Feature Spec 25: Resident Help Flow & Incident Reporting

## Overview
This specification details the implementation of the end-to-end **Emergency Help Flow** for the **Public User (Resident)** role in the DisasTRACE Expo application. Tapping the primary pulsing **"HELP"** button on the home dashboard initiates a high-fidelity, low-cognitive-load multi-screen flow that allows residents to capture a live scene photo, describe the emergency using a structured "WH" form, submit it for dispatch verification, track the assigned ambulance in real time on a live map, and close the incident loop with a resolution summary and service feedback.

This flow is divided into four distinct visual phases, directly corresponding to **Images 4 through 15** in the `context/design-image/resident/dashboard` reference folder.

---

## 1. UI/UX Design Specifications & Mobile UX Psychology
During an active emergency, users experience high stress and elevated adrenaline, which severely degrades cognitive performance, visual acuity, and motor control. The interface must prioritize absolute simplicity, using bold visual metaphors, massive touch targets, and clear status updates.

*   **Color Tokens**:
    *   **Emergency Action / Pulsing**: `#EF4444` (Emergency Red) and `#DC2626` (Red Gradient backdrop).
    *   **Success / Verification**: `#22C55E` (Green) and `#DCFCE7` (Success green background pills).
    *   **Structure & Containers**: Solid white surface (`#FFFFFF`) with deep navy overlays (`bg-blue-950/40`) to highlight primary states.
    *   **Typography**: Inter (sans-serif). Labels use uppercase tracking (`tracking-wider`, `text-slate-400`, `text-[10px]`) for readability under strain.
*   **Touch Targets**: In accordance with Fitts' Law and Android/iOS Design Standards, all buttons, sliders, and form inputs must support a **minimum touch target area of 48dp** (using active hit-slops on smaller icon buttons).
*   **Interactive Viewports**: Use `KeyboardAvoidingView` with automatic layout padding so the device keyboard never obscures active input fields.

---

## 2. Step-by-Step Screen & Navigation Flow (Images 4-15)

### Phase 1: Viewfinder & Media Capture (Images 4-6)

```
[ Dashboard ] ---> [ Camera Permission (Img 4) ] ---> [ Viewfinder View (Img 5) ] ---> [ Photo Confirmation (Img 6) ]
```

*   **Image 4: Camera Permission Gate Drawer**
    *   **Behavior**: Tapping "HELP" on the dashboard checks camera authorization using `expo-camera`. If permission is not granted, a bottom drawer slides up seamlessly, mirroring the location permission drawer design.
    *   **UI Components**:
        *   Overlay Backdrop: Semi-transparent backdrop (`bg-black/60` with background blur).
        *   Title: `"Camera Access Required"` in bold navy (`#1E3A8A`, `text-lg`).
        *   Subtitle: `"DisasTRACE needs camera access to let you capture live photos of the incident, speeding up PACC verification and ambulance routing."` (`text-slate-500`, `text-sm`).
        *   Action Button: `"Grant Permission"` (solid Navy, `rounded-xl`, `p-4`).
*   **Image 5: High-Fidelity Custom Viewfinder Screen**
    *   **Behavior**: Opens a dedicated full-screen camera view (`expo-camera` or `react-native-vision-camera`).
    *   **UI Components**:
        *   **Viewfinder Canvas**: Full screen camera view.
        *   **Header Bar**:
            *   Left: Close button (`Lucide.X`, size 24, white, padded to `48dp` touch target) to immediately exit and return to Home.
            *   Right: Flash toggle button (`Lucide.Flashlight` or `Lucide.Zap`, size 24, white, cycling through `Off` / `On` / `Auto`).
        *   **Bottom Actions Panel**:
            *   Capture Trigger: A large double-circle button. Outer ring is a thin white circle (`w-20 h-20 border-4 border-white`). Inner button is a solid red circle (`w-14 h-14 bg-red-600 rounded-full active:bg-red-700`).
            *   Viewfinder Caption: `"Point camera at the emergency scene. Make sure it is clear and well-lit."` (`text-white text-center text-xs mt-4 drop-shadow-sm`).
*   **Image 6: Photo Preview & Confirmation Screen**
    *   **Behavior**: Instantly displays the captured image in full screen.
    *   **UI Components**:
        *   **Bottom Sheet Action Bar**: A horizontal row of buttons in the thumb-active zone:
            *   Left: `"RETAKE PHOTO"` button (`border border-white bg-white/20 px-6 py-4 rounded-xl text-white font-bold`). Tapping returns user to Image 5 view.
            *   Right: `"USE PHOTO"` button (`bg-red-600 px-8 py-4 rounded-xl text-white font-bold flex-1 active:bg-red-700`). Tapping moves user to Image 7 reporting form.
        *   **Image Processing**: In the background, compresses the photo to `< 5MB` to optimize upload latency on cellular networks.

---

### Phase 2: WH Reporting Form & Review (Images 7-8)

```
[ Photo Confirmed ] ---> [ WH Form: Step 1 (Img 7) ] ---> [ Report Review: Step 2 (Img 8) ]
```

*   **Image 7: Step 1/2 - Describe Incident Form**
    *   **Behavior**: A structured WH (What, Where, When, Who) form designed to gather key dispatch inputs without exhausting the user's attention.
    *   **UI Components**:
        *   **Wizard Progress Header**: Displays `"STEP 1 OF 2"` in light gray, alongside a small left arrow (`Lucide.ArrowLeft`, `48dp` target) to return to Photo Preview.
        *   **What Happened? (Select Type)**: A horizontal scrollable list of high-fidelity selector cards or a dropdown.
            *   *Options*: Medical Emergency, Vehicular Collision, Fire Emergency, Structural Failure, Flood/Water, Unknown Cause.
            *   *Styling*: Selected card is outlined in bold Navy Blue (`#1E3A8A`) with a light blue background, showing a high-contrast icon and label.
        *   **Who is Involved?**: Segmented control slider for selecting injured/affected count.
            *   *Segments*: `"None"`, `"1-2 Persons"`, `"3-5 Persons"`, `"6+ Persons"`.
        *   **Where is it? (Automatic GPS Tag & Landmarks)**:
            *   Background Action: The system silently attaches the active `latitude` and `longitude` captured by the device GPS.
            *   Mini Map Preview: A small `h-28` map preview card displaying the tagged coordinates.
            *   Landmark Text Input: A structured text field labeled `"Describe Location / Landmarks (Optional)"` (e.g., "In front of Barangay Hall, beside the store") with a character limit of 150.
        *   **Action Button**: `"REVIEW REPORT"` button at the bottom of the canvas. Disabled until the incident type is selected.
*   **Image 8: Step 2/2 - Review & Confirm Report**
    *   **Behavior**: A final review screen summarizing the incident report parameters side-by-side with a small thumbnail of the captured scene photo.
    *   **UI Components**:
        *   **Summary Card Grid**:
            *   *Type*: Red-colored text badge (e.g. `[ Vehicular Collision ]`).
            *   *Injured*: Text showing segment selected (e.g. `"3-5 Persons"`).
            *   *Location*: Address string with the user-typed landmark description.
            *   *Scene Photo*: `w-20 h-20` image preview card with rounded corners (`12px`).
        *   **Consent Checkbox**: A checkbox labeled `"I confirm that this is a real emergency. False reporting is subject to immediate account suspension and penalties under Baliwag CDRRMO regulations."`
        *   **Primary Submission Button**: A high-impact, pulsing emergency red button stretching across the bottom of the screen.
            *   *Label*: `"SUBMIT EMERGENCY REPORT"` (`bg-red-600 rounded-xl py-4 items-center`).
            *   *Micro-interaction*: Clicking the button triggers a brief Haptic feedback vibration (`Haptics.notificationAsync()`) and presents a native confirmation alert.

---

### Phase 3: Transmission & Queueing (Images 9-11)

```
[ Submit Pressed ] ---> [ Transmitting Status (Img 9) ] ---> [ Verification Pending (Img 10) ] ---> [ Accepted Alert (Img 11) ]
```

*   **Image 9: Submission Progress & Locating Dispatcher**
    *   **Behavior**: Full-screen modal overlay preventing all touch interactions during transmission.
    *   **UI Components**:
        *   Background: Dark navy overlay.
        *   Loader: A circular pulsing concentric radar vector animation, simulating a beacon emitting signals.
        *   Progress Label: `"Uploading incident media..."` transitioning to `"Transmitting coordinates to PACC Command Center..."` as file and payload submit successfully.
*   **Image 10: Verification Pending (Holding Screen)**
    *   **Behavior**: Once successfully saved on the server, the resident is placed in a persistent holding screen. The incident enters a `PENDING` verification status.
    *   **UI Components**:
        *   **Status Badge**: Centered, pulsing yellow-orange badge labeled `"AWAITING VERIFICATION"`.
        *   **Elapsed Timer**: An active clock counting up from `00:00` (e.g., `"Time Elapsed: 00:42"`).
        *   **Safety Instructions Card**:
            *   Title: `"What to do while waiting"` (Navy blue, bold).
            *   Instructions: A list of contextual safety steps based on the incident type (e.g. "Stay clear of hazards. Check if victims are breathing. Do not move severely injured victims unless absolutely necessary").
        *   **Cancel Report Button**: Located at the bottom of the screen.
            *   *Label*: `"CANCEL REPORT"`.
            *   *Condition*: Visible and active **only** during the first `60 seconds` after submission. Clicking prompt: `"Are you sure you want to cancel this report? This will alert the dispatcher."`
*   **Image 11: Real-time Incident Acceptance Alert**
    *   **Behavior**: When a PACC Admin reviews and clicks "Accept" on their web dashboard, a real-time event triggers this full-screen overlay on the resident's mobile device, accompanied by a double Haptic success pulse.
    *   **UI Components**:
        *   **Icon**: Large green checkmark inside a pulsing white circle.
        *   **Title**: `"EMERGENCY ACCEPTED"` (Success Green text, `text-2xl`, bold).
        *   **Message**: `"Baliwag CDRRMO has verified your report. Ambulance Unit 3 is being dispatched to your location immediately."`
        *   **Action Button**: `"TRACK AMBULANCE"` (Navy Blue, `rounded-xl`, `py-4`). Clicking transitions directly to Phase 4.

---

### Phase 4: Live Map Tracking & Incident Resolution (Images 12-15)

```
[ Accepted ] ---> [ Ambulance Tracking: En Route (Img 12-13) ] ---> [ Arrival Alert (Img 14) ] ---> [ Feedback Form (Img 15) ]
```

*   **Image 12: Active Dispatch Map View (Initial State)**
    *   **Behavior**: Loads a full-screen dynamic map displaying both the resident's fixed location (Red PIN icon) and the ambulance responder's starting depot location (Blue ambulance icon).
    *   **UI Components**:
        *   **Status Banner (Top)**: `"AMBULANCE ASSIGNED"` inside a blue pill badge (`bg-blue-600 px-4 py-1.5 rounded-full text-white text-xs font-bold`).
        *   **Interactive Map**: Renders live coordinates from the responder's device.
        *   **Bottom Sheet (Collapsed)**: Height `h-28`. Displays the ambulance unit identifier (e.g., `"Ambulance Unit 3"`) and an estimated time of arrival (e.g., `"ETA: 8 mins"`).
*   **Image 13: Live Tracking Map View (En Route)**
    *   **Behavior**: As the ambulance moves, its live GPS coordinates update on the map via WebSockets, and the ETA re-calculates dynamically.
    *   **UI Components**:
        *   **Status Banner (Top)**: Updates to `"AMBULANCE EN ROUTE - 1.2 km away"` (Pulsing Orange).
        *   **Bottom Drawer (Expanded)**: Accessible by sliding the sheet upwards.
            *   *Ambulance Details*: Large profile picture of the assigned responder (`Renzy Bastes`) and the ambulance vehicle plate number (`AAA-1234`).
            *   *Call Button*: A circular button (`Lucide.PhoneCall`, green background, `rounded-full`, `w-14 h-14` to ensure `48dp` hit zone). Launches the native device dialer deep-linking to `tel:${responderPhone}`.
            *   *Emergency Advice Panel*: Detailed first-aid tips customized to the reported emergency type (e.g. for burns, vehicular injuries).
*   **Image 14: Responder Arrived Screen**
    *   **Behavior**: Triggered in real time when the responder arrives at the scene and updates their status to `ARRIVED`. Displays a full-screen notification.
    *   **UI Components**:
        *   **Icon**: Pulsing blue ambulance alert shield.
        *   **Title**: `"RESPONDER ARRIVED"` (Navy blue, bold, `text-2xl`).
        *   **Message**: `"The ambulance has arrived at your scene. Look out for the vehicle with plate number [AAA-1234]."`
        *   **Footer**: `"Responders are now on site providing medical assistance."`
*   **Image 15: Incident Resolution & Service Feedback Screen**
    *   **Behavior**: Triggered when the responder logs the incident outcome as complete/resolved on their app. Allows the user to provide quick feedback on the response service.
    *   **UI Components**:
        *   **Summary Badge**: Success Green circle with a ribbon icon.
        *   **Headline**: `"Emergency Resolved"` (`text-xl`, bold navy).
        *   **Response Summary Details**:
            *   Report ID: `REQ-2026-0047`
            *   Dispatched Unit: `Ambulance Unit 3`
            *   Total Duration: `12 Minutes` (calculates `resolvedAt - submittedAt` in minutes).
        *   **Service Rating (Feedback)**:
            *   A 5-star interactive rating component (large clickable stars, minimum `48dp` spacing).
            *   Optional comment text box: `"Tell us how we did..."`.
        *   **Action Button**: `"RETURN TO HOME"` (Navy Blue, `rounded-xl`, `py-4`). Clicking resets state and redirects the resident back to the Home Dashboard (`mobile/app/(tabs)/index.tsx`).

---

## 3. Frontend Mobile Architecture & Technical Guidelines (Expo)

### 3.1 Directory Structure & File Paths
To keep the Expo codebase modular and organized, the following file allocation is enforced:

*   **Viewfinder & Camera Components**:
    *   Screen View: `mobile/app/help/camera.tsx` (Handles camera viewport and shutter capture).
    *   Preview Page: `mobile/app/help/preview.tsx` (Handles retake vs. use action).
*   **Reporting Form Pages**:
    *   Wizard Flow: `mobile/app/help/form.tsx` (Controls Step 1 form inputs and Step 2 summary review).
    *   Transmission Modal: `mobile/components/help/TransmissionLoader.tsx`
*   **Holding & Real-Time Tracking Pages**:
    *   Verification Queue: `mobile/app/help/pending.tsx` (Holding screen with countdown and elapsed timers).
    *   Live Map Tracking: `mobile/app/help/tracking.tsx` (MapLibre tracking interface with route path routing).
    *   Feedback Form: `mobile/app/help/resolution.tsx` (Close loop feedback form).

### 3.2 Dynamic Geolocation Tagging (using `expo-location`)
The mobile application must capture device-level location details dynamically when the "HELP" button is pressed.

```typescript
import * as Location from 'expo-location';

export async function captureEmergencyCoordinates() {
  // Check global location services again to maintain invariants
  const hasServices = await Location.hasServicesEnabledAsync();
  if (!hasServices) {
    throw new Error("GPS Services are disabled globally.");
  }

  // Request high-accuracy foreground coordinates
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.BestForNavigation,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    timestamp: location.timestamp,
  };
}
```

### 3.3 State Management & Data Schema (Zustand & Zod)
To preserve incident report parameters across the multi-step navigation stack, a lightweight Zustand store `mobile/store/use-emergency-report-store.ts` must manage the payload.

```typescript
import { z } from 'zod';
import { create } from 'zustand';

// Strictly typed report validation schema
export const EmergencyReportSchema = z.object({
  id: z.string().optional(), // Server-generated Request ID
  photoUri: z.string().min(1, "Live photo is required"),
  incidentType: z.enum([
    "Medical Emergency",
    "Vehicular Collision",
    "Fire Emergency",
    "Structural Failure",
    "Flood/Water",
    "Unknown Cause"
  ], { required_error: "Please select the type of emergency" }),
  peopleInvolved: z.enum(["None", "1-2 Persons", "3-5 Persons", "6+ Persons"], {
    required_error: "Please specify number of participants"
  }),
  landmarks: z.string().max(150, "Description must not exceed 150 characters").optional(),
  latitude: z.number(),
  longitude: z.number(),
});

export type EmergencyReportType = z.infer<typeof EmergencyReportSchema>;

interface EmergencyReportStore {
  report: Partial<EmergencyReportType>;
  setPhotoUri: (uri: string) => void;
  setDetails: (details: Partial<Omit<EmergencyReportType, 'photoUri'>>) => void;
  resetReport: () => void;
}

export const useEmergencyReportStore = create<EmergencyReportStore>((set) => ({
  report: {},
  setPhotoUri: (uri) => set((state) => ({ report: { ...state.report, photoUri: uri } })),
  setDetails: (details) => set((state) => ({ report: { ...state.report, ...details } })),
  resetReport: () => set({ report: {} }),
}));
```

---

## 4. Backend & Database Integration (Supabase)

### 4.1 Tables & Schema Updates
To support the reporting flow, the `verification_requests` and `incidents` PostgreSQL tables must contain the following fields:

#### `verification_requests` Table:
*   `id`: `uuid` (Primary Key, matches Supabase default UUID generation).
*   `request_id`: `varchar(20)` (e.g., `REQ-2026-0047` auto-generated via database trigger sequence).
*   `resident_id`: `uuid` (Foreign Key referencing `public.users.id`).
*   `status`: `verification_status` (Enum: `PENDING`, `VERIFIED`, `REJECTED`, defaults to `PENDING`).
*   `nature`: `incident_nature` (Enum: `EMERGENCY`, `NON-EMERGENCY`, defaults to `EMERGENCY`).
*   `type`: `incident_type` (Enum mapping the Zod options).
*   `location_description`: `text` (Stores the landmark input string).
*   `latitude`: `double precision` (Captured GPS coordinate).
*   `longitude`: `double precision` (Captured GPS coordinate).
*   `image_url`: `text` (URL referencing the uploaded image in the Supabase Storage bucket).
*   `created_at`: `timestamp with time zone` (Defaults to `now()`).

##### `incidents` Table (Live dispatched incidents):
*   `id`: `uuid` (Primary Key).
*   `request_id`: `uuid` (Foreign Key referencing `verification_requests.id`).
*   `responder_id`: `uuid` (Foreign Key referencing `public.users.id` / `ambulance_responders`, nullable during active negotiation).
*   `status`: `incident_status` (Enum: `DISPATCHED`, `EN_ROUTE`, `ARRIVED`, `RESOLVED`, defaults to `DISPATCHED`).
*   `assigned_ambulance`: `varchar(50)` (Name of ambulance unit).
*   `eta_minutes`: `integer` (Estimated arrival duration).
*   `resolved_at`: `timestamp with time zone` (Timestamp when incident resolves).
*   **Cascading Offer State Columns (Auto-Dispatch Engine)**:
    *   `current_offer_responder_id`: `uuid` (Foreign key to `public.users.id`, tracks which responder has the active popup).
    *   `skipped_responder_ids`: `uuid[]` (Array of responder UUIDs who rejected or timed out for this incident).
    *   `offer_expires_at`: `timestamp with time zone` (Timestamp when the 5-second offer window expires).
    *   `dispatch_method`: `varchar(20)` (Enum: `AUTO_1KM`, `PACC_MANUAL`).

### 4.2 Storage Bucket Configuration
Create a public-read, private-write bucket in Supabase Storage named `incident-photos`.
*   **Upload Path**: `/incident-photos/resident_${resident_id}/${requestId}.jpg`
*   **RLS Policy**:
    *   Allow `INSERT` if `auth.uid() = resident_id`.
    *   Allow `SELECT` for authenticated users (`role` in `cdrrmo_super_admin`, `pacc_admin`, `ambulance_responder`, or owner resident).

### 4.3 Automated 1km Radius Cascading Dispatch Engine
To guarantee near-instant response while keeping the PACC Dispatcher's workload low, DisasTRACE implements a **proximity-geofenced auto-dispatch engine** with a 5-second countdown timer, cascading between available responders.

```
       [ Incident Created & Verified ]
                      |
                      v
     [ Scan ONLINE & Available Responders ]
             [ within 1km Radius ]
                      |
             /-----------------\
     (Responders Found)    (No Responders)
            /                   \
           v                     v
   [ Sort by Proximity ]    [ ESCALATE TO PACC ]
           |                [ Manual Dispatch ]
           v
  [ Offer to Closest: ]
  [ Offer expires in 5s ]
           |
           +-----------------------+
           |                       |
       (Accepts)           (Rejects or Timout in 5s)
           |                       |
           v                       v
     [ DISPATCHED ]      [ Add to skipped_responder_ids ]
   [ Track on Map ]                |
                                   v
                        [ Scan Next Closest ]
                        [ Responder within 1km ]
                                   |
                          /-----------------\
                  (Next Found)        (No More Responders)
                         /                   \
                        v                     v
                [ Repeat 5s Offer ]     [ ESCALATE TO PACC ]
                                        [ Manual Dispatch ]
```

#### 4.3.1 Proximity Calculation & Candidate Queue (Haversine SQL Function)
When an incident is created/verified, the database runs a function to identify eligible candidates sorted by distance:

```sql
create or replace function public.find_available_responders_in_radius(
  incident_lat double precision,
  incident_lon double precision,
  radius_km double precision default 1.0
)
returns table (
  responder_id uuid,
  distance_km double precision
) as $$
begin
  return query
  select 
    u.id as responder_id,
    (6371 * acos(
      cos(radians(incident_lat)) * cos(radians(u.latitude)) * 
      cos(radians(u.longitude) - radians(incident_lon)) + 
      sin(radians(incident_lat)) * sin(radians(u.latitude))
    )) as distance_km
  from public.users u
  where u.role = 'ambulance_responder'
    and u.status = 'ONLINE'
    and u.is_available = true
    and (6371 * acos(
      cos(radians(incident_lat)) * cos(radians(u.latitude)) * 
      cos(radians(u.longitude) - radians(incident_lon)) + 
      sin(radians(incident_lat)) * sin(radians(u.latitude))
    )) <= radius_km
  order by distance_km asc;
end;
$$ language plpgsql security definer;
```

#### 4.3.2 5-Second Offer Lifecycle Rules
1.  **Offer Target**: The engine sets `current_offer_responder_id` to the closest responder, changes `dispatch_method` to `'AUTO_1KM'`, and calculates `offer_expires_at = now() + interval '5 seconds'`.
2.  **Notification popup**: The targeted responder receives a real-time WebSocket alert carrying the coordinate, distance, and critical WH details.
3.  **Active Countdown**: The mobile application displays a full-screen high-priority dialog with a counting-down timer: `"URGENT INCOMING DISPATCH - Accept in 5... 4... 3..."`.
4.  **Acceptance**: If the responder taps **"ACCEPT"** within 5 seconds, the incident `status` updates to `'DISPATCHED'`, `responder_id` is locked to their UUID, `current_offer_responder_id` resets to `NULL`, and their `is_available` flag toggles to `false`.
5.  **Rejection/Timeout Cascade**:
    *   If the responder actively rejects the popup OR if the database detects `now() > offer_expires_at` without acceptance (evaluated via a Supabase Edge Function cron job or database background task checking active offers every second):
    *   The engine automatically adds that responder to `skipped_responder_ids`.
    *   It re-runs the geofence check, fetches the next closest candidate not present in `skipped_responder_ids`, and sets the next `5-second` offer.
    *   If no other candidates exist in the 1km radius, the offer columns are cleared, `dispatch_method` changes to `'PACC_MANUAL'`, and the report is escalated immediately to the **PACC Verification Page Queue** for manual routing.

### 4.4 Real-Time WebSocket Channel Sync
The mobile application must subscribe to Supabase Realtime changes inside the tracking view to handle transitions instantly.

```typescript
import { supabase } from '../../lib/supabase';

// Subscribe to verification request updates
const verificationChannel = supabase
  .channel('public:verification_requests')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'verification_requests',
      filter: `id=eq.${reportId}`,
    },
    (payload) => {
      const updatedStatus = payload.new.status;
      if (updatedStatus === 'VERIFIED') {
        // Report accepted - transition user to Live Tracking Screen
        navigateToTrackingScreen(payload.new.id);
      } else if (updatedStatus === 'REJECTED') {
        // Report rejected by dispatcher - redirect to Home with alert
        handleReportRejection();
      }
    }
  )
  .subscribe();

// Subscribe to active incident updates (ambulance positioning)
const incidentChannel = supabase
  .channel('public:incidents')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'incidents',
      filter: `request_id=eq.${reportId}`,
    },
    (payload) => {
      const incidentData = payload.new;
      // 1. Update live Map coordinates
      updateAmbulancePosition(incidentData.latitude, incidentData.longitude);
      // 2. Monitor status transitions
      if (incidentData.status === 'ARRIVED') {
        navigateToArrivalAlert();
      } else if (incidentData.status === 'RESOLVED') {
        navigateToResolutionFeedback();
      }
    }
  )
  .subscribe();
```

---

## 5. Safety Invariants & Security Constraints
1.  **Strict Verification Check**: A resident cannot initiate a new emergency report if they currently have an unresolved `PENDING`, `DISPATCHED`, or `EN_ROUTE` incident active. The application must run a pre-flight query `GET /api/incidents/active` upon mount; if active, route the user directly back to their current active tracking screen (`Image 13`).
2.  **Strict False Reporting Controls**:
    *   If a resident's report is flagged as `REJECTED` by a PACC Admin with the reason set to `"False Report"`, a database trigger increments `public.users.false_report_count`.
    *   If `false_report_count >= 3`, the user account standing is automatically flagged as `SUSPENDED`. Upon the next socket event, the mobile app immediately kicks the user out of the dashboard flow, displaying a locked account gate as described in [AGENTS.md](file:///D:/dev/freelance/disas_trace/AGENTS.md).
3.  **Accidental Trigger Safe-Valve**:
    *   The `CANCEL REPORT` button (Image 10) must strictly execute a `DELETE` or `PATCH /api/verification/cancel` REST call, but only when the elapsed duration is **less than 60 seconds**. This prevents users from canceling dispatches once an ambulance is already moving.

---

## 6. Implementation Checklist & Verification Criteria

- [ ] **Camera Permission Gate**: Camera module correctly prompts drawer if permission is missing, with a background backdrop blur blocking all interaction.
- [ ] **High-Fidelity Viewfinder**: Full-screen camera viewfinder displays dynamic flash controls and exit actions.
- [ ] **Image Compress & Preview**: Viewfinder successfully captures a photo, displays the result in high resolution, compresses it to `< 5MB`, and triggers smooth retake actions.
- [ ] **Dynamic GPS Geo-Tagging**: Accurate coordinates are captured via `expo-location` on reporting start and correctly mapped onto the Step 1 form review map preview.
- [ ] **WH Details Validation**: Zod-validated Step 1 form captures emergency type, patient count segment, and landmarks description.
- [ ] **Report Review Confirmation**: Step 2 screen displays a clear summary card grid, verification checklist details, and a legal checkbox that activates the pulsing submission button.
- [ ] **Transmission Loader**: concentring pulsing radar loader overlays the screen cleanly during file upload and REST submission.
- [ ] **Holding Screen & Elapsed Clock**: Pending screen triggers a real-time counting elapsed timer, cancels requests within 60s, and renders contextual emergency instructions.
- [ ] **Accepted Event Handler**: Real-time Supabase subscription triggers the `"EMERGENCY ACCEPTED"` success modal instantly when status transitions.
- [ ] **Live Map Tracking**: Renders dynamic map markers for both user and responder, tracing polyline paths.
- [ ] **Dynamic bottom sheet**: Bottom sheet displays responder avatar profile card, ambulance plate numbers, and telephone deep-linking buttons.
- [ ] **Arrival State Transition**: WebSocket updates seamlessly trigger the full-screen arrived screen when responder sets status to `ARRIVED`.
- [ ] **Resolved Feedback Flow**: Resolution page displays total elapsed response duration, records five-star reviews, and routes the user back to the dashboard.
