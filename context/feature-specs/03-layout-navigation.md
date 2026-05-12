# Feature Spec 03: Layout & Navigation

## Overview
Implement a high-fidelity dashboard layout that adapts to user roles (CDRRMO Super Admin and PACC Admin), featuring a sophisticated mesh gradient sidebar and a clean, spacious white navigation bar.

## Requirements

### Shared Dashboard Layout
- Every page under `app/(dashboard)/` must use the shared layout.
- Layout must include:
    - **Sidebar (Left)**: Fixed sidebar with a dark blue mesh gradient background and glassmorphism effects.
    - **Top Bar (Header)**: White background (`h-[88px]`), containing current page title, notification center, and user profile.
    - **Main Content Area**: Light grey background (`#F3F4F6`) with `p-10` padding.

### Role-Based Navigation
Navigation items and branding adapt dynamically based on the user's role:

#### CDRRMO Super Admin
- **Org Label**: CDRRMO
- **Role Label**: Super Admin
- **Navigation Items**:
    1. **Dashboard**: `/dashboard`
    2. **Map**: `/map`
    3. **Status & Logs**: `/logs`
    4. **Reports**: `/reports`
    5. **User Management**: `/users`
    6. **Responder Roster**: `/roster`
    7. **Audit Logs**: `/audit`

#### PACC Admin
- **Org Label**: PACC
- **Role Label**: PACC Admin
- **Navigation Items**:
    1. **Dashboard**: `/dashboard`
    2. **Map**: `/map`
    3. **Status & Logs**: `/logs`
    4. **Users Approval**: `/users/approval`

### Sidebar Styling & Behavior
- **Background**: `bg-mesh-gradient` (animated navy/midnight blue) with `backdrop-blur-[3px]` and a subtle vertical white-to-transparent overlay.
- **Header**: Circular Baliwag CDRRMO Seal. When expanded, displays "DisasTRACE" branding and role-specific labels.
- **Active State**:
    - **Collapsed**: Pure white rounded background with navy icon.
    - **Expanded**: Subtle `white/15` background with white icon and bold label.
- **Behavior**: Narrow icon-only view by default (80px width), expandable to show full labels.

### Top Navigation Bar
- **Page Title**: `text-3xl font-bold`, color `#1E3A8A`. Dynamically updates based on the active route.
- **Sidebar Trigger**: Custom 3-line hamburger menu icon (`Menu`).
- **Actions**:
    - **Notifications**: Large bell icon (`size-7`) with a red badge.
    - **User Profile**: Displays user's full name, role (PACC Admin/Super Admin), and a customized Clerk `UserButton` (44px size, navy border).

### Responsive Design
- Sidebar collapses/hides on mobile, accessible via hamburger menu.
- Content area scales with padding adjustments.

## Implementation Details

1. **`lib/navigation.ts`**: Centralized configuration for `CDRRMO_NAV` and `PACC_NAV` with a `getNavItems(role)` helper.
2. **`components/app-sidebar.tsx`**: Dynamic sidebar using Clerk `useUser()` metadata to switch branding and menu items.
3. **`app/(dashboard)/layout.tsx`**: Client-side layout for dynamic title rendering and header profile management.
4. **`app/globals.css`**: Custom `bg-mesh-gradient` utility and `mesh-flow` keyframe animation.
