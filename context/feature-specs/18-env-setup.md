# Feature Spec 18: Infrastructure Setup & Environment Audit

## Overview
Perform a comprehensive audit of the project's environment variables and infrastructure dependencies. This feature involves setting up the definitive `.env.local` (Web) and `.env` (Mobile) files, installing missing core dependencies for database and real-time sync, and reconciling authentication keys to ensure seamless integration between the Next.js dashboard and the Expo mobile app.

## Requirements

### Environment Variable Audit & Setup
Identify and document all required environment variables based on the `architecture-context.md`.

#### 1. Web Application (`.env.local`)
- **Clerk Authentication**:
    - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: (Exists, but needs verification against mobile)
    - `CLERK_SECRET_KEY`: (Exists)
    - `NEXT_PUBLIC_CLERK_SIGN_IN_URL`: (Exists)
    - `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: (Exists)
- **Database (PostgreSQL)**:
    - `DATABASE_URL`: (Exists - Pooled connection for Supabase)
- **Supabase (Missing)**:
    - `NEXT_PUBLIC_SUPABASE_URL`: Required for client-side storage/realtime.
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Required for client-side storage/realtime.
    - `SUPABASE_SERVICE_ROLE_KEY`: Required for backend admin tasks (e.g., seeding, verification bypass).
- **SMS Gateway (textbee.dev) (Missing)**:
    - `TEXTBEE_API_KEY`: Required for OTP delivery.
    - `TEXTBEE_DEVICE_ID`: Required for OTP delivery via linked Android device.

#### 2. Mobile Application (`mobile/.env`)
- **Clerk Authentication**:
    - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`: **CRITICAL**: Reconcile with web key. Currently mismatched.
- **Supabase (Placeholders found)**:
    - `EXPO_PUBLIC_SUPABASE_URL`: Update with real project URL.
    - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Update with real anon key.
- **API Configuration**:
    - `EXPO_PUBLIC_MOBILE_API_URL`: (Set to `http://localhost:3000/api` - update for production/staging).

### Dependency Audit
Install missing core infrastructure dependencies in the root `package.json`.

#### 1. Database & ORM
- `drizzle-orm`: Type-safe ORM.
- `postgres`: PostgreSQL client for Node.js.
- `drizzle-kit`: (devDependency) For migrations and schema management.

#### 2. Supabase Client
- `@supabase/supabase-js`: Required for Realtime and Storage interactions in the web backend/frontend.

### Infrastructure Configuration (Missing Files)
- **`drizzle.config.ts`**: Root configuration for Drizzle migrations.
- **`db/index.ts`**: Database connection singleton.
- **`db/schema/`**: Directory for Drizzle schema definitions (Users, Incidents, Reports, etc.).
- **`lib/supabase.ts`**: Supabase client singleton for the Next.js app.

## Implementation Steps

1. **Step 1: Dependency Sync**: Install `drizzle-orm`, `postgres`, and `@supabase/supabase-js` in the root project. Add `drizzle-kit` to devDependencies.
2. **Step 2: Environment Reconciliation**: 
    - Verify and sync `CLERK_PUBLISHABLE_KEY` between web and mobile.
    - Populate all Supabase and Textbee keys in both `.env.local` and `mobile/.env`.
3. **Step 3: Database Foundation**:
    - Create `drizzle.config.ts`.
    - Initialize `db/index.ts` and the initial schema in `db/schema/`.
4. **Step 4: Supabase Foundation**:
    - Create `lib/supabase.ts` for the web app to interface with Storage and Realtime.
5. **Step 5: Progress Validation**: Update all API routes (e.g., `app/api/users/route.ts`) to import from `db` instead of using mock data.

## Design Alignment Checklist
- [ ] All environment variables follow the `NEXT_PUBLIC_` or `EXPO_PUBLIC_` prefixing conventions where appropriate.
- [ ] Database connection string in `DATABASE_URL` is verified and working.
- [ ] Dependencies are properly versioned to avoid conflicts with Next.js 16/React 19.
- [ ] Schema definitions in `db/schema/` accurately reflect the types defined in `types/`.
