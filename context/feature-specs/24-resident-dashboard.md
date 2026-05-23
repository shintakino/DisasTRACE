# Feature Spec 24: Resident-Side Dashboard

## Overview
Implement a high-fidelity, polished, and secure mobile dashboard strictly for the **Public User (Resident)** role within the DisasTRACE Expo app. The dashboard serves as the central hub for public incident reporting, designed to minimize cognitive load during high-stress emergencies. 

A critical safety invariant is that the system requires accurate device GPS coordination for emergency routing. Therefore, this dashboard incorporates a **device location permission gate**; if location access is not configured to "Always" (or at least granted with active GPS enabled), a custom bottom drawer slides up, restricting all dashboard interactivity until the settings are updated.

---

## 1. UI/UX Design Specifications
The interface must faithfully replicate the visual structure of the design assets located under `context/design-image/resident/dashboard/` and follow the brand tokens defined in [ui-context.md](file:///D:/dev/freelance/disas_trace/context/ui-context.md).

```
+-------------------------------------------------------------+
|  Your Location                                 [?]   [Bell] |
|  Baliwag City                                               |
|                                                             |
|  ( EG )  Eloisa Guibani                         [ ONLINE ]  |
|          Barangay Paitan                                    |
+-------------------------------------------------------------+
|                                                             |
|                     INCIDENT REPORTING                      |
|                                                             |
|                           /-----\                           |
|                          /       \                          |
|                         |  HELP   | <--- (Continuous Pulsing |
|                          \       /        Scale Animation)   |
|                           \-----/                           |
|                        TAP TO REPORT                        |
|                                                             |
|   Takes a live photo of the scene and files a report.       |
|                 Help reaches you faster.                    |
|                                                             |
|   +-----------------------------------------------------+   |
|   |             Help us improve our service             |   |
|   | Spotted an issue in your area? Contact us.          |   |
|   +-----------------------------------------------------+   |
+-------------------------------------------------------------+
|    [Home]          [Reports]         [Map]        [Profile] |
+-------------------------------------------------------------+
```

### 1.1 Header & Profile Banner (Top Section)
* **Background Area**: Map-textured dark navy blue backdrop (`#1E3A8A`) stretching across the upper third of the device screen.
* **Location Row (Top-Left)**:
  * Icon: Small white location pin (`Lucide.MapPin`, size 20).
  * Sub-label: `"Your Location"` (White, opacity 0.8, text-xs).
  * Main label: `"Baliwag City"` (Bold white, text-md).
* **Quick Actions (Top-Right)**:
  * Support Button: Chat bubble with a question mark inside (`Lucide.HelpCircle` or custom SVG, size 24, white). Respects the 48dp hit-slop target.
  * Notifications Button: Bell icon (`Lucide.Bell`, size 24, white) to open the notification list.
* **User Profile Card**:
  * **Avatar (Circle)**: Navy-filled circle with bold white user initials (e.g. `"EG"`). Outlined by a thin white circular border with a small white verified checkmark badge overlayed at the top-right corner of the circle.
  * **Details (Middle)**:
    * User Full Name: `"Eloisa Guibani"` (Bold white text, text-lg).
    * Barangay/Residence: `"Barangay Paitan"` (White, text-sm, subtle opacity).
  * **Status Badge (Right)**:
    * Content: `"ONLINE"` in bold uppercase.
    * Styling: Semi-transparent greyish-blue pill badge (`bg-white/20 px-3 py-1 rounded-full`), white text-xs.

### 1.2 Main Report Canvas (Center Section)
* **Canvas Backdrop**: A solid white card container overlapping the header with large rounded top corners (`border-t-3xl bg-white flex-1 p-6`).
* **Header text**: Centered subtitle `"INCIDENT REPORTING"` (Medium grey, tracking-wider, text-xs, uppercase).
* **Primary HELP Trigger**:
  * **Shape**: Perfect circle in the center of the canvas.
  * **Background**: Rich emergency red gradient (`bg-gradient-to-br from-red-600 to-red-500`).
  * **Primary Text**: `"HELP"` in extra-bold, high-impact white capital letters.
  * **Sub-text**: `"TAP TO REPORT"` in smaller thin white capital letters underneath the word HELP.
  * **Animation**: Continuous soft pulsing glow and scale micro-animation (see [Section 3](#3-pulsing-animation-mechanics)).
* **Instructional Label**:
  * Text: `"Takes a live photo of the scene and files a report. Help reaches you faster."`
  * Text styling: Multi-line centered light grey-blue text (`text-slate-500 text-sm leading-relaxed text-center px-4 mt-6`). Highlights `"live photo"` in bold Slate/Navy.
* **Service Improvement Banner**:
  * Card-like banner placed below the instruction.
  * Background: Emergency red patterned backdrop (`bg-red-700/90 rounded-2xl p-4 overflow-hidden relative`).
  * Typography:
    * Title: `"Help us improve our service"` (Bold white, text-md).
    * Description: `"Spotted an issue in your area? Contact us so we can fix it."` (White/slate opacity 0.9, text-xs).

### 1.3 App Navigation Tab Bar (Bottom Section)
* **Background**: Deep solid navy blue footer (`bg-blue-950/98 h-20 border-t border-blue-900 px-6 flex-row justify-between items-center`).
* **Interactives**: Four distinct navigation items (Home, Reports, Map, Profile).
  * Icon: High-fidelity line outline icons.
  * Labels: Centered labels below the icon (Regular white/slate text).
  * Active Indicator: The active tab (`Home`) has white-colored icons and text, while inactive tabs use muted grey-blue (`text-slate-400`).

---

## 2. Location Permission Gate Mechanics
To prevent users from reporting fake incident coordinates or bypassing tracking during active dispatches, the dashboard enforces device-level location checks.

```
       +------------------------------------+
       |          DASHBOARD MOUNT           |
       +------------------------------------+
                          |
                          v
         +----------------------------------+
         |     Check Device Location &      |
         |       Permission Status          |
         +----------------------------------+
            /                            \
           /                              \
(Granted & GPS Active)             (Denied or GPS Inactive)
         /                                  \
        v                                    v
+---------------+                   +-----------------------+
|  Interactive  |                   | Drawer Slides Up      |
|   Dashboard   |                   | All Screen Input      |
|    Enabled    |                   | Blocked Behind Backdrop|
+---------------+                   +-----------------------+
```

### 2.1 Trigger Invariants
The slide-up drawer must display instantly under either of these conditions:
1. **Device GPS is Off**: Location services are disabled globally at the operating system level.
2. **Permission Status is not Granted**: The application does not possess foreground permission (`Location.getForegroundPermissionsAsync()`) or background location access is rejected.

### 2.2 Slide-Up Drawer Design (`2.png`)
* **Overlay Backdrop**: Semitransparent dark overlay (`bg-black/60 absolute inset-0`) that blurs out the dashboard components underneath.
* **Drawer Panel**:
  * Background: Bright white card (`bg-white rounded-t-3xl p-8 absolute bottom-0 w-full min-h-[50%]`).
* **Content Flow**:
  * **Title**: `"Set Location to 'Always'"` (Extra-bold dark navy `#1E3A8A`, text-xl, text-center).
  * **Subtitle**: `"DisasTRACE only works correctly if it can 'always' access your location."` (Slate-grey text, text-sm, text-center, mt-2).
  * **Visual Steps**:
    1. Label: `"1. In Settings, select Location"` (Slate text, text-sm, mt-6).
       * Card: Rounded border rectangle (`border border-slate-200 rounded-2xl p-4 flex-row items-center justify-between bg-slate-50`).
       * Left Icon: Small blue location badge (`bg-blue-100 p-2 rounded-full` + navy pin).
       * Text: `"Location"` in medium Slate-grey.
       * Right Indicator: Chevron-right (`>`).
    2. Label: `"2. Then tap on Always"` (Slate text, text-sm, mt-4).
       * Card: Rounded border rectangle (`border border-slate-200 rounded-2xl p-4 flex-row items-center justify-between bg-slate-50`).
       * Text: `"Always"` in Slate-grey.
       * Right Indicator: Blue checkmark tick (`✓`).
* **Settings Link Action (Bottom)**:
  * Button: Solid dark blue button (`bg-blue-900 rounded-2xl p-4 w-full items-center active:bg-blue-800`).
  * Text: `"Go to Settings"` in bold white (text-base).
  * Trigger Action: Deep-links directly to the mobile device OS App Settings screen to allow the user to immediately toggles permissions (utilizing `Linking.openSettings()`).

---

## 3. Pulsing Animation Mechanics
The center `HELP` button must feature an inviting, continuous, and high-performance pulsing loop animation to draw immediate attention.

### 3.1 Visual Parameters
* **Base Scale**: `1.0`
* **Peak Pulse Scale**: `1.15`
* **Loop Period**: `1800ms` total duration (900ms scale-up, 900ms scale-down).
* **Easing**: Smooth sinusiodal easing (`Easing.inOut(Easing.ease)`).
* **Secondary Layer (Glow Ring)**:
  * Behind the primary red button, a secondary red ring (`opacity: 0.3`) scales from `1.0` to `1.4` and fades out to `0.0` concurrently.

### 3.2 Performance Constraints
* To maintain 60 FPS, the animation **must utilize the native thread**. It must use `react-native-reanimated` with `useAnimatedStyle` to avoid bridging latency on the JavaScript main thread.

---

## 4. Frontend Mobile Implementation Guidelines (Expo)

### 4.1 Recommended File Structure
* **Dashboard Tab Route**: [mobile/app/(tabs)/index.tsx](file:///D:/dev/freelance/disas_trace/mobile/app/%28tabs%29/index.tsx)
* **Location Permission Hook**: `mobile/hooks/use-location-permission.ts` (Handles global permission subscription and active checks).
* **Location Drawer Component**: `mobile/components/dashboard/LocationPermissionDrawer.tsx`

### 4.2 Permission Checker Logic (using `expo-location`)
```typescript
import * as Location from 'expo-location';
import { AppState, Linking } from 'react-native';

// Standard hook pattern inside the dashboard component:
const checkPermissions = async () => {
  // 1. Check if location services are enabled globally on the device
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    setIsLocationGateActive(true);
    return;
  }

  // 2. Check foreground permission status
  const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    setIsLocationGateActive(true);
    return;
  }

  // 3. Optional: Check background permission status for active reporting tracking
  const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    // If not "Always", request or trigger gate
    setIsLocationGateActive(true);
    return;
  }

  setIsLocationGateActive(false);
};
```
* **App Focus Trigger**: Re-evaluate `checkPermissions()` when the user returns to the application from device settings. Use React Native's `AppState` listener (`change` event) to seamlessly hide the drawer if the settings were corrected.

### 4.3 Animation Implementation (`react-native-reanimated`)
```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

// Pulse loop setup on mounting
const scale = useSharedValue(1);

useEffect(() => {
  scale.value = withRepeat(
    withSequence(
      withTiming(1.12, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.ease) })
    ),
    -1, // Loop indefinitely
    true // Reverse direction automatically
  );
}, []);

const animatedButtonStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));
```

---

## 5. Backend Integration & API Rules
* **User Endpoint Verification**:
  * Every render of the dashboard relies on verified database profile info retrieved via the backend API.
  * Target Endpoint: `GET /api/users/me`
  * Role Check: Ensure the user's Supabase JWT claim matches `public_user` (or `ambulance_responder` for their corresponding layout in [progress-tracker.md](file:///D:/dev/freelance/disas_trace/context/progress-tracker.md)).
* **Real-time Status Synchronizer**:
  * Enable socket connection through Supabase Realtime client inside the Expo client application.
  * Channel: `public:users` filter on current logged-in `user.id`.
  * Interaction: If the admin changes the user status (e.g. locks their profile, deactivates, or flags false reporting), the app will instantly redirect them out of the `(tabs)` flow back to the splash/verification gates as mandated in [AGENTS.md](file:///D:/dev/freelance/disas_trace/AGENTS.md).

---

## 6. Design Alignment & Acceptance Criteria

- [ ] **Exact Theme Colors**: Header uses Navy Blue (`#1E3A8A`) and the primary HELP button features the rich emergency gradient `#DC2626` to `#EF4444`.
- [ ] **Pulsing Animation Performance**: The center `HELP` button pulses continuously and smoothly at 60 FPS without layout shifts, utilizing the native thread.
- [ ] **Strict Location Gate**: Opening the dashboard without system GPS active or location permission set to `"Always"` triggers the bottom sheet drawer immediately.
- [ ] **Background Overlay**: The dashboard area underneath the location drawer is fully obscured and completely blocks touch events.
- [ ] **Settings Integration**: Clicking the `"Go to Settings"` button deep-links directly into the platform app settings window.
- [ ] **Automatic Recovery**: Toggling the location permission in Settings and returning to the app immediately hides the drawer without requiring a manual restart.
- [ ] **Active Tabs State**: Active `Home` icon is highlighted in high contrast white; other tabs remain greyed out.
- [ ] **Visual Profile Integration**: Displays verified `EG` custom avatar, full name, barangay, and the exact grey-blue `"ONLINE"` pill badge.
