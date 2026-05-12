# Feature 02: Authentication & RBAC (Web)

Wire Clerk into the Next.js app for the Admin Dashboard: provider, auth pages, redirects, route protection, and user menu.

## Scope (Web Focus)

For this phase, focus strictly on the **Web Application** (Admin Portal). 
- No sign-up page will be implemented for now. Accounts for PACC Admins and CDRRMO Super Admins are pre-provisioned.
- Rely on seeded test accounts via the Clerk Dashboard or a custom sync/seed script.

## Design

Follow the **DisasTRACE Light Mode** design system defined in `context/ui-context.md`.
Reference Figma design for Sign In: [Figma Sign In Page](https://www.figma.com/design/z01WyTDEVXIEsroOnjg60U/CAP101?node-id=1494-12156&t=TWShJ3U9sWxLwfCH-4)

Override Clerk appearance variables using the app’s existing CSS variables:
- **Layout**: Clean, authoritative, tailored specifically for government/admin use.
- **Component Styling**:
  - The Clerk form should seamlessly blend into the application layout, matching the Figma reference.
  - Override Clerk's default fonts: Use `Inter` for all labels, inputs, and headings.
  - Colors: Use standard white/gray backgrounds, with the primary "Navy Blue" (`#1E3A8A`) for the primary action buttons, avoiding any dark-mode remnants from previous boilerplates.
- **Strictly Avoid**: Gradients, oversized generic illustrations, or complex "SaaS" tropes.

## Implementation

1. **ClerkProvider**: Wrap the root layout with `ClerkProvider`, applying theme adjustments via the `appearance` prop to enforce the DisasTRACE design system.
2. **Sign-In Page**: Create the sign-in page at `/sign-in` using Clerk components. Do not implement a `/sign-up` route.
3. **Route Protection**: Use `proxy.ts` at the project root for routing and protection (as referenced in the architectural template), instead of `middleware.ts`.
   - Define public routes explicitly (e.g., `/sign-in`). 
   - Protect all other web routes (e.g., `/dashboard`, `/dispatch`, `/admin`) by default.
4. **Redirection**: Update the root route `/`:
   - Authenticated users redirect to `/dashboard`.
   - Unauthenticated users redirect to `/sign-in`.
5. **RBAC Metadata**: Configure Clerk to support custom `publicMetadata` containing the user's role (e.g., `role: 'public_user' | 'ambulance_responder' | 'pacc_admin' | 'cdrrmo_super_admin'`). While web currently focuses on admin roles, the architecture must support all four.
6. **User Menu**: Add Clerk’s built-in `UserButton` to the Dashboard `Sidebar` or `Header` for profile settings and logout. Keep Clerk’s default user menu intact, just style via `appearance`.
7. **Environment Variables**: Use standard Clerk environment variables (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).

## Seed / Test Accounts

Since there is no sign-up page for the web portal, you must create test accounts manually in the Clerk Dashboard or via the Clerk Backend API during the seeding process:
- `admin@disastrace.local` -> Role: `cdrrmo_super_admin`
- `pacc@disastrace.local` -> Role: `pacc_admin`
- `responder@disastrace.local` -> Role: `ambulance_responder` (Mobile focus, but seeded for testing)
- `user@disastrace.local` -> Role: `public_user` (Mobile focus, but seeded for testing)

## Dependencies

- `@clerk/nextjs`

## Check When Done
- `proxy.ts` is used for routing instead of `middleware.ts` at the root of the project.
- Unauthenticated users cannot reach `/dashboard` or other inner pages.
- Only the `/sign-in` page exists; no `/sign-up` flow is accessible.
- Auth pages accurately reflect the DisasTRACE aesthetic (Navy Blue, Inter font, clean layout based on Figma).
- `ClerkProvider` wraps the root layout successfully.
- `npm run build` passes with no TypeScript or linting errors.
