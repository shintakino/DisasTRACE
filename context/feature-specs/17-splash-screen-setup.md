# Feature Spec 17: Splash Screen & Role Selection (Mobile)

## Overview
Implement the initial entry sequence for the **DisasTRACE** mobile application. This feature replaces the default template landing page with a high-fidelity, animated splash screen sequence that transitions into a role selection screen. The design is a custom, modernized evolution of the original concepts, focusing on professional emergency response aesthetics.

## Design Concept: "The Pulse of Safety"
- **Theme**: Minimalist, high-contrast, and "alive" through subtle animations.
- **Color Palette**:
    - **Primary Background**: Deep Navy Blue (`#0F172A`) with a subtle radial gradient.
    - **Accent**: Emergency Red (`#EF4444`) for the medical cross and "TRACE" highlights.
    - **Neutral**: Pure White (`#FFFFFF`) for primary text and iconography.
- **Typography**: `Inter` (Sans-serif) for its clean, authoritative look.

## Requirements

### Animated Splash Sequence
### Animated Splash Sequence
- **Visuals**: A code-driven animation utilizing the official `DisasTRACELogo.png` along with vector elements to ensure a professional presentation.
    - **Initial State**: Empty background with a subtle, horizontal "pulse" line (ECG style) starting from the center.
    - **Phase 1**: The pulse line peaks and fades out.
    - **Phase 2**: The official `DisasTRACELogo.png` scales up smoothly from the center of the screen.
    - **Phase 3**: The logo settles into its final position with a soft glow effect.
    - **Phase 4**: A tagline "Emergency Response Coordination" fades in below the logo in a clean, modern sans-serif font.
- **Behavior**: 
    - Smooth cross-fade, slide, and scale transitions between states (approx. 600ms per phase).
    - Final state holds for 1.2s before a "slide up" transition reveals the Role Selection screen.
- **Technology**: Use `react-native-reanimated` (already bundled with Expo 54) directly for all animated values, springs, and timing transitions. **Do not use `moti` or `framer-motion`** — they cause Metro bundler `tslib` resolution failures. The native launch screen should use the static logo configured in `app.json` to seamlessly bridge into the React Native animation.

### Role Selection Screen
- **Core Question**: "Identify Your Role"
- **Options**:
    1. **Resident**: "I need assistance or want to report an incident." (Navigates to `(auth)/sign-in?role=public_user`)
    2. **Responder**: "I am part of the emergency response team." (Navigates to `(auth)/sign-in?role=ambulance_responder`)
- **Design**:
    - Background: Subtle Navy-to-Grey gradient (`#1E293B` to `#F3F4F6`).
    - Cards: Large, white rounded cards (16px radius) with soft drop shadows.
    - Icons: Modern, thin-line icons for "Home/Person" and "Ambulance/Badge".

## Implementation Steps

1. **Step 1: Asset Setup**: Ensure `DisasTRACELogo.png` is placed in `mobile/assets/images/`. Update `app.json` to use a splash screen configuration that matches the background of the logo (or a clean white background, `#FFFFFF`, to match the logo's aesthetic).
2. **Step 2: Dependencies**: `react-native-reanimated` is already included with Expo 54. No additional animation libraries are needed.
3. **Step 3: Entry Logic**: Update `mobile/app/index.tsx` to hide the native splash screen once React Native is ready, and immediately trigger the code-driven animation sequence.
4. **Step 4: Animation Engine**: Build the splash sequence using `react-native-reanimated` shared values, animated styles, and layout animations to orchestrate the phases (Pulse -> Logo Fade/Scale -> Tagline).
5. **Step 5: Role Selection UI**: Build the selection view with the modernized card design and navigation logic to handle the transition at the end of the sequence.

## Design Alignment Checklist
- [ ] Transitions feel "urgent yet calm" (professional timing).
- [ ] Red accent (`#EF4444`) is used sparingly but effectively for status and branding.
- [ ] Typography uses `Inter` with weight `700` for "Disas" and `400` for tagline.
- [ ] Icons are SVG-based for maximum clarity on high-DPI mobile screens.
- [ ] Safe areas (notch/dynamic island) are accounted for in the slide-up transition.
