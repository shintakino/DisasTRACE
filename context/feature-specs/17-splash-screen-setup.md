# Feature Spec 17: Splash Screen & Role Selection (Mobile)

## Overview
Implement the initial entry sequence for the **DisasTRACE** mobile application. This feature replaces the default template landing page with a high-fidelity, animated splash screen sequence that transitions into a role selection screen. Users are explicitly asked to identify their role (**Resident** or **Responder**) to streamline their respective onboarding and authentication paths.

## Current State (Post-Audit)
- **Framework**: Expo SDK 54.0.33 initialized.
- **Assets**: 7 splash screen images found in `context/design-image/SplashScreens/`.
- **Missing Infrastructure**:
    - **Animation**: `moti` and `framer-motion` are not installed.
    - **Assets Location**: Images need to be moved to `mobile/assets/images/splash/`.
    - **Entry Point**: The default `app/_layout.tsx` exists, but the logic for the initial sequence in `app/index.tsx` is missing.

## Requirements

### Animated Splash Sequence
- **Visuals**: Use the 6-frame sequence from `mobile/assets/images/splash/`:
    - `splash_screen-1.png`
    - `splash_screen-2.png`
    - `splash_screen-3.png`
    - `splash_screen-4.png`
    - `splash_screen-5.png`
    - `splash_screen6.png` (Note: normalize naming to use hyphens if possible).
- **Behavior**: 
    - Smooth cross-fade or slide transitions between frames (approx. 800ms per frame).
    - Final frame holds for 1s before sliding up to reveal Role Selection.
- **Technology**: Use `moti` (powered by `react-native-reanimated`) for layout and opacity transitions.

### Role Selection Screen
- **Core Question**: "Are you a Resident or a Responder?"
- **Options**:
    1. **Resident**: Navigates to `(auth)/sign-in?role=public_user`.
    2. **Responder**: Navigates to `(auth)/sign-in?role=ambulance_responder`.
- **Design**:
    - Large, white rounded cards (12px radius) with Navy Blue (`#1E3A8A`) icons.
    - Background: Light Grey (`#F3F4F6`).

### Persistence & Logic
- **Storage**: Store the selection in `expo-secure-store` or a lightweight `Zustand` store.
- **Auto-Navigation**:
    - If Clerk `isSignedIn` is true, bypass this sequence and navigate to the respective home tab.
    - If `isSignedIn` is false, always show the splash sequence on fresh app launch.

## Implementation Steps

1. **Step 1: Assets**: Move and rename images to `mobile/assets/images/splash/`.
2. **Step 2: Dependencies**: Install `moti` and `framer-motion` (ensuring compatibility with React 19).
3. **Step 3: Entry Logic**: Create `app/index.tsx` as the root entry point.
4. **Step 4: Animation**: Build the `SplashScreenSequence` component using `MotiView` for the cross-fade effect.
5. **Step 5: Selection UI**: Build the `RoleSelection` view with the two primary role cards.

## Design Alignment Checklist
- [ ] Animations are fluid and match the "Welcome to DisasTRACE" vibe.
- [ ] Role cards are highly legible with clear distinction between Resident and Responder.
- [ ] Primary buttons use Navy Blue (`#1E3A8A`).
- [ ] Typography uses `Inter` with appropriate weights for headings.
- [ ] Safe areas are respected for all screen sizes (Android focus).
