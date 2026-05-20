# Mobile Sign-Up & Login Flow

## Overview
This specification outlines the implementation of the mobile authentication flow for the DisasTRACE Expo app. It covers both the **Login** screen and a **4-step Sign-Up Wizard** for Public Users (Residents) and Ambulance Responders. The implementation must strictly adhere to the provided Figma designs, the project's Zod-first typing rules, and the **Supabase Auth** architecture.

## 1. UI/UX Design Specifications
The visual design must faithfully replicate the provided reference images, while adhering strictly to Mobile UX Psychology.
- **Background Theme**: Solid Navy Blue (`#1E3A8A` based on `ui-context.md`).
- **Typography**: Inter (sans-serif). White text for headings, dark grey for inputs.
- **Inputs**: White background (`#FFFFFF`), rounded corners (12px), subtle borders.
- **Buttons & Touch Targets**:
  - Primary Action (Next/Register): Red (`#EF4444`) or Dark Navy. Must be placed in the **thumb zone** (bottom area).
  - Secondary Action (Gender selection): Outline or unselected state with white background.
  - **Touch Target Minimum**: Every interactable element (buttons, back arrows, toggles) MUST have a minimum touch target area of `48dp` to respect Fitts' Law.
- **Progress Indicator**: A horizontal progress bar at the top of the sign-up screens.
- **Icons**: Vuesax Bold icons for back navigation and input toggles (e.g., password visibility). Must include a 48dp hit slop or container wrapper.
- **Keyboard Handling**: Use `KeyboardAvoidingView` to ensure inputs are never blocked.

## 2. Screen & Navigation Flow

### 2.1 Login Screen
- **Logo**: DisasTRACE logo at the top.
- **Greeting**: "Log In / Hi! Welcome back, you've been missed."
- **Fields**:
  - `Email / Mobile`
  - `Password` (with visibility toggle)
- **Actions**: "Forgot password?", "Login" button (Navy Blue), and "Don't have an account? Sign Up".

### 2.2 Sign-Up Wizard (4 Steps)
A multi-step form with a back button (`<`) and step indicator (e.g., `1/4`).

**Step 1/4: Resident/Personal Information**
- `First Name` (Required)
- `Middle Name` (Optional)
- `Surname` (Required)
- `Suffix Name` (Optional)
- `Gender` (Required) - Male / Female toggle buttons.

**Step 2/4: Contact Details**
- `Email Address` (Required)
- `Mobile Number` (Required)
- `Province` (Required)
- `City / Municipality` (Required)
- `Barangay` (Required)
- `Street / House No.` (Required)

**Step 3/4: Verification & Role Identification**
- `Identification Card` (Required) - File upload area (JPEG/PNG, max 25MB). Uses Supabase Storage.
- `Identification Card Type` (Required) - Dropdown.
- `Identify your role` (Required) - Dropdown/Selector to explicitly categorize the registration as a Public User (Resident) or Ambulance Responder. This drives subsequent UI flows and permissions.

**Step 4/4: Password & Consent**
- `Create Password` (Required)
- `Confirm Password` (Required)
- `Terms and Condition & Privacy Policy` checkbox (Required).
- **Action**: "Register account" button.

**Success Modal**
- Overlaid on the screen.
- Icon: User with a checkmark.
- Title: "Account Created".
- Subtitle: "Your account has been successfully created! You may now log in..."
- Action: "Next" button (redirects to Login or Verification Pending screen).

## 3. Frontend Architecture (Expo)
Targeting **Expo SDK 54** with the New Architecture enabled.

### Performance & Memory Doctrine
- **Image Rendering**: The ID card upload preview MUST use `expo-image` for memory-efficient caching. Do not use the standard React Native `Image`.
- **Memoization**: Form components and wizard steps should use `React.memo` and `useCallback` to prevent unnecessary re-renders on the JS thread.

### Form Handling & Zod Validation
We must use `react-hook-form` paired with `@hookform/resolvers/zod`. **No `any` or `unknown` types are permitted.**

```typescript
import { z } from "zod";

// Step 1 Schema
export const PersonalInfoSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(2, "Surname is required"),
  suffix: z.string().optional(),
  gender: z.enum(["Male", "Female"], { required_error: "Gender is required" }),
});
export type PersonalInfoType = z.infer<typeof PersonalInfoSchema>;

// Step 2 Schema
export const ContactDetailsSchema = z.object({
  email: z.string().email("Invalid email address"),
  mobileNumber: z.string().regex(/^(09|\+639)\d{9}$/, "Invalid Philippine mobile number"),
  province: z.string().min(2, "Province is required"),
  city: z.string().min(2, "City/Municipality is required"),
  barangay: z.string().min(2, "Barangay is required"),
  street: z.string().min(2, "Street/House No. is required"),
});
export type ContactDetailsType = z.infer<typeof ContactDetailsSchema>;

// Step 3 Schema
export const VerificationSchema = z.object({
  idCardUri: z.string().min(1, "Identification card image is required"),
  idCardType: z.string().min(1, "ID type is required"),
  role: z.enum(["public_user", "ambulance_responder"], { required_error: "Role is required" }),
});
export type VerificationType = z.infer<typeof VerificationSchema>;

// Step 4 Schema
export const PasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
export type PasswordType = z.infer<typeof PasswordSchema>;

// Combined Sign Up Payload
export const SignUpPayloadSchema = PersonalInfoSchema
  .and(ContactDetailsSchema)
  .and(VerificationSchema)
  .and(PasswordSchema);
export type SignUpPayloadType = z.infer<typeof SignUpPayloadSchema>;

// Login Schema
export const LoginSchema = z.object({
  identifier: z.string().min(1, "Email or Mobile is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginType = z.infer<typeof LoginSchema>;
```

### State Management
Use a local state manager (e.g., `Zustand` or React Context) to hold the aggregated `SignUpPayloadType` across the 4 wizard screens to prevent data loss if the user navigates back and forth.

## 4. Backend & Authentication Integration

### Supabase Authentication
1. **Registration**: 
   - The Expo app uses `@supabase/supabase-js` to trigger `supabase.auth.signUp()`.
   - The user's role (`public_user` or `ambulance_responder`) must be assigned via the `public.users` table, which triggers a JWT claim update.
2. **OTP Verification (textbee.dev)**:
   - Phone verification must be integrated during or immediately after the registration flow, utilizing `textbee.dev` as per the architectural context.
3. **Login**: 
   - Uses `supabase.auth.signInWithPassword()` with either the email or verified phone number and password.

### Supabase Storage & Database Sync
1. **Image Upload**:
   - The ID Card image must be uploaded to Supabase Storage (`ids/{userId}/`).
   - This occurs *after* Supabase registration but *before* marking the account verification as complete.
2. **User Record Creation**:
   - A database trigger on `auth.users` (or a direct insertion in the sign-up flow) must ensure the corresponding user record is created in the `public.users` table.
   - The user's `verification_status` must default to `pending`.

## 5. Security, Performance & Invariants
- **Verification Gate**: Upon successful login, the mobile app must check the user's `verification_status` from the database. If `pending`, block access to the main app features and route to a "Pending Approval" holding screen.
- **Secure Storage**: Sensitive authentication tokens must be stored using `expo-secure-store`.
- **Offline Resilience**: The app should handle offline states gracefully with explicit feedback.
- **Type Safety**: All API requests payload and responses must be validated with Zod.
- **File Upload Limits**: Expo `ImagePicker` must compress the ID image, and validation should enforce the 25MB max size prior to Supabase upload.

## 6. Mandatory Mobile Checkpoint & Checklist
- [x] Scaffold Login Screen with Zod-validated `react-hook-form`.
- [x] Scaffold 4-step Sign-Up Wizard with `Zustand` state.
- [x] Implement Expo `ImagePicker` for ID upload.
- [x] Implement "Identify your role" UI selector securely tied to the registration payload.
- [x] Wire up Supabase `signUp` flow.
- [x] Wire up Supabase `signIn` flow.
- [x] Implement Supabase Storage upload for ID card.
- [x] Ensure user sync to `public.users` table with default `pending` status.
- [x] Build the "Account Created" success modal overlay.
- [x] Test form error states and validation messages.
- [x] Ensure pixel-perfect match with Figma references.
