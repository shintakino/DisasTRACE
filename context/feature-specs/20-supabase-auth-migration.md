# Feature Spec 20: Supabase Auth Migration

## Overview
Migrate the entire authentication system from Clerk to **Supabase Auth**. This unified approach leverages Supabase as both the database and identity provider, simplifying the tech stack and enabling advanced features like Row Level Security (RLS) and high-performance Role-Based Access Control (RBAC) via JWT claims.

## Requirements

### 1. High-Performance RBAC (JWT Claims)
To maintain the performance of the Next.js Edge Middleware (`proxy.ts`), we will mirror Clerk's `publicMetadata` behavior by injecting user roles directly into the Supabase JWT.
- **Database Trigger**: Create a Postgres function and trigger that listens for inserts/updates on the `public.users` table.
- **JWT Injection**: The function will update the `auth.users` table's `raw_app_meta_data` field with the user's role.
- **Middleware Parsing**: The Next.js middleware will decode the Supabase JWT and extract the `role` claim to perform instant route protection.

### 2. Web Integration (Next.js)
- **Library**: Replace `@clerk/nextjs` with `@supabase/ssr`.
- **Session Management**: Use Server Actions and the `createClient` utility from `@supabase/ssr` for server-side session handling.
- **Auth Pages**: Re-implement the high-fidelity `/sign-in` page using Supabase Auth's `signInWithPassword`.
- **Middleware**: Update `proxy.ts` to use `@supabase/ssr`'s `updateSession` to refresh tokens and verify roles from the JWT.

### 3. Mobile Integration (Expo)
- **Library**: Replace `@clerk/expo` with `@supabase/supabase-js`.
- **Session Persistence**: Use `expo-secure-store` to persist Supabase session tokens.
- **Sign-Up Flow**: Update the 4-step wizard to use `supabase.auth.signUp()`.
- **ID Upload**: Ensure ID cards are uploaded to Supabase Storage *after* user creation but *before* verification.

### 4. Role Mapping
The roles remain identical to the previous architecture:
- `cdrrmo_super_admin`: Full system access (Dashboard, Map, Users, Roster, Audit).
- `pacc_admin`: Dispatch and verification focus.
- `ambulance_responder`: Mobile task management.
- `public_user`: Mobile incident reporting.

## Infrastructure Changes

### Database Functions
```sql
-- Function to sync role from public.users to auth.users
create or replace function public.handle_update_user_role()
returns trigger as $$
begin
  update auth.users
  set raw_app_meta_data = jsonb_set(
    coalesce(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(new.role)
  )
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to run after role update in public.users
create trigger on_user_role_update
  after update of role on public.users
  for each row execute procedure public.handle_update_user_role();
```

### Environment Variables
- **Remove**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, etc.
- **Ensure**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Seed Strategy
The `scripts/seed-supabase.ts` will use the `supabase.auth.admin` SDK to:
1. Create users directly in `auth.users` with `email_confirm: true`.
2. Insert corresponding profiles into `public.users`.
3. The trigger will automatically propagate the role back to the `auth` layer.

## Implementation Checklist
- [ ] Install `@supabase/ssr` and uninstall `@clerk/nextjs`.
- [ ] Implement `lib/supabase.ts` for browser, server, and middleware clients.
- [ ] Create Postgres trigger for RBAC sync.
- [ ] Update `proxy.ts` for Supabase session and role validation.
- [ ] Rebuild `/sign-in` page logic.
- [ ] Refactor Mobile `AuthContext` to use Supabase.
- [ ] Migrate `seed-clerk.ts` to `seed-supabase.ts`.
- [ ] Remove all Clerk code from the project.
