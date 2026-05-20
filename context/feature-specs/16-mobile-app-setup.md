# Feature Spec 16: Mobile App Setup (Expo)

## Overview
Initialize and configure the **Expo (React Native)** mobile application for Android. This app serves as the primary interface for both **Public Users** (reporting incidents) and **Ambulance Responders** (accepting dispatches). The setup focuses on creating a robust foundation for authentication, real-time synchronization, and a shared UI system that adheres to the DisasTRACE design language.

## Current State (Post-Audit)
- **Framework**: Expo SDK 54.0.33 initialized in `mobile/`.
- **Core Dependencies**: `@supabase/supabase-js`, `expo-router`, `expo-secure-store`, `react-native-reanimated` are installed.
- **Missing Infrastructure**:
    - **NativeWind (Tailwind)**: Not yet configured for Expo SDK 54/React 19.
    - **Icons**: `lucide-react-native` is missing (preferred over default icons).
    - **Location**: `expo-location` for GPS tracking is missing.
    - **API Client**: `axios` or similar for REST consumption.
- **Routing**: Current `app/` structure is minimal (default template) and needs reorganization into `(auth)`, `(verification)`, and `(tabs)` groups.

## Requirements

### Project Initialization
- **Framework**: Expo (SDK 54.0.0) with **TypeScript** and **Expo Router**.
- **Platform**: Android only (as per `architecture-context.md`).

### Authentication (Supabase Auth)
- Integrate `@supabase/supabase-js` for identity management.
- Configure `SecureStore` for session persistence.
- Implement the sign-in and registration flows (Public User/Responder selection during sign-up).
- Ensure role-based metadata (JWT claims) is accessible to drive navigation logic.

### Verification Gate (Critical Invariant)
- Implement a global "Verification Guard" that checks the user's `verification_status` via the REST API.
- **Pending State**: If status is `pending`, users are redirected to a non-dismissible "Verification Pending" screen.
- **Rejected State**: If status is `rejected`, users see a "Registration Rejected" screen with the reason and an option to re-submit documents.
- **Approved State**: Only `approved` users can access the main bottom-tab navigation.

### Shared UI System (Mobile Design)
- **Styling**: Use `NativeWind` (Tailwind CSS for React Native) to ensure consistency with the web app's design tokens.
- **Theme**: Light Mode by default.
  - Background: `#F3F4F6`
  - Primary: `#1E3A8A` (Navy Blue)
  - Secondary: `#EF4444` (Red)
- **Components**:
  - Custom `Button`, `Input`, and `Card` components matching the web app's 12px/8px radius.
  - Vuesax Bold icon set integration (use `lucide-react-native` as fallback/standard).

### Navigation Structure (Expo Router)
- **Root**: `(auth)` group for sign-in/sign-up.
- **Root**: `(verification)` group for pending/rejected screens.
- **Root**: `(tabs)` group for the main application (only for verified users).
  - **Public User Tabs**: Home (Report), Map (Hospitals), Notifications, Profile.
  - **Responder Tabs**: Home (Duty Status/Active Dispatch), Logs, Notifications, Profile.

## Frontend Architecture

1. **Folder Structure**:
   - `app/`: Expo Router file-based routing.
   - `components/`: UI primitives and shared mobile components.
   - `hooks/`: Mobile-specific hooks (e.g., `useLocation`, `useRealtime`).
   - `services/`: API client (Axios/Fetch) and Supabase client.
   - `store/`: Local state management (Zustand or context).
   - `types/`: Shared types (mirrored or imported from backend).

2. **API Client**:
   - Centralized service for Next.js REST API calls.
   - Interceptor to attach Supabase JWT tokens to every request.

## Backend Architecture

1. **REST API Consumption**:
   - The mobile app is a consumer of the `app/api/` routes in the Next.js project.
   - Define a `MOBILE_API_URL` environment variable.

2. **Real-Time Integration (Supabase)**:
   - Initialize the Supabase client for mobile.
   - Set up subscriptions for:
     - `notifications`: For real-time in-app alerts.
     - `dispatches`: For responders to receive instant alerts.
     - `incidents`: For public users to track their reported cases.

3. **GPS Tracking**:
   - Implement background location tracking for responders using `expo-location`.
   - Stream coordinates to the `responder_locations` table via Supabase Realtime or a dedicated heartbeat API.

## Design Alignment Checklist
- [ ] Primary buttons use `#1E3A8A` with white text.
- [ ] Verification Pending screen matches the "Wait for Admin" design.
- [ ] Bottom Tab Bar uses Vuesax/Lucide icons.
- [ ] Fonts are configured to use `Inter`.
- [ ] Card components have 12px rounded corners and `shadow-sm`.
- [ ] All typography follows the `ui-context.md` guidelines for mobile scale.

## Implementation Steps

1. **Phase 1: Foundation Refinement**: Install missing dependencies (NativeWind, Supabase, Lucide, Location) and configure Tailwind.
2. **Phase 2: Auth & Verification**: Implement Supabase sign-in/up and the Verification Gate logic.
3. **Phase 3: Base Layout**: Create the Bottom Tab navigation and the core "Home" screens for both roles.
4. **Phase 4: API & Realtime**: Set up the API client and Supabase Realtime listeners.
5. **Phase 5: Refinement**: Apply styling refinements and ensure Android-specific optimizations (keyboard handling, safe areas).
