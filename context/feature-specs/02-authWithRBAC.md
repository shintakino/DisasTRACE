# Feature 02: Authentication & RBAC (Web)

Wire Supabase Auth into the Next.js app for the Admin Dashboard: session provider, custom sign-in page, redirects, route protection, and user menu.

## Scope (Web Focus)

For this phase, focus strictly on the **Web Application** (Admin Portal). 
- No sign-up page will be implemented for now. Accounts for PACC Admins and CDRRMO Super Admins are pre-provisioned.
- Rely on seeded test accounts created via the Supabase Admin API.

## Design

Follow the **DisasTRACE Light Mode** design system defined in `context/ui-context.md`.
Reference Figma design for Sign In: [Figma Sign In Page](https://www.figma.com/design/z01WyTDEVXIEsroOnjg60U/CAP101?node-id=1494-12156&t=TWShJ3U9sWxLwfCH-4)

The custom sign-in page should match the Figma reference exactly:
- **Layout**: Clean, authoritative, tailored specifically for government/admin use.
- **Component Styling**:
  - The login form should seamlessly blend into the application layout.
  - Fonts: Use `Inter` for all labels, inputs, and headings.
  - Colors: Use standard white/gray backgrounds, with the primary "Navy Blue" (`#1E3A8A`) for the primary action buttons.
- **Strictly Avoid**: Gradients, oversized generic illustrations, or complex "SaaS" tropes.

## Implementation

1. **Supabase Client**: Implement `@supabase/ssr` for server-side session management.
2. **Sign-In Page**: Create a high-fidelity sign-in page at `/sign-in` using `supabase.auth.signInWithPassword`. Do not implement a `/sign-up` route.
3. **Route Protection**: Use `proxy.ts` at the project root for routing and protection.
   - Define public routes explicitly (e.g., `/sign-in`). 
   - Protect all other web routes (e.g., `/dashboard`, `/dispatch`, `/admin`) by default.
4. **Redirection**: Update the root route `/`:
   - Authenticated users redirect to `/dashboard`.
   - Unauthenticated users redirect to `/sign-in`.
5. **RBAC via JWT Claims**: Configure a database trigger to sync user roles from the `public.users` table to `auth.users` (`raw_app_meta_data`). The middleware will parse this role from the JWT.
6. **User Menu**: Create a custom user menu in the Dashboard `Sidebar` or `Header` for profile information and logout.
7. **Environment Variables**: Use `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

## Seed / Test Accounts

Since there is no sign-up page for the web portal, you must create test accounts via the Supabase Admin API during the seeding process:
- `admin@disastrace.local` -> Role: `cdrrmo_super_admin`
- `pacc@disastrace.local` -> Role: `pacc_admin`
- `responder@disastrace.local` -> Role: `ambulance_responder` (Mobile focus, but seeded for testing)
- `user@disastrace.local` -> Role: `public_user` (Mobile focus, but seeded for testing)

## Dependencies

- `@supabase/ssr`
- `@supabase/supabase-js`

## Check When Done
- `proxy.ts` is used for routing instead of `middleware.ts`.
- Unauthenticated users cannot reach `/dashboard` or other inner pages.
- Only the `/sign-in` page exists; no `/sign-up` flow is accessible.
- Auth pages accurately reflect the DisasTRACE aesthetic (Navy Blue, Inter font, clean layout based on Figma).
- `npm run build` passes with no TypeScript or linting errors.
