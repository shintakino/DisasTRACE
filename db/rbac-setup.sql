-- RBAC Setup Script
-- Run this in the Supabase SQL Editor

-- 1. Create a function to handle role and status syncing
create or replace function public.handle_update_user_role_and_status()
returns trigger as $$
begin
  -- Only attempt sync if ID is a valid UUID format
  if new.id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    update auth.users
    set raw_app_meta_data = 
      jsonb_set(
        jsonb_set(
          coalesce(raw_app_meta_data, '{}'::jsonb),
          '{role}',
          to_jsonb(new.role)
        ),
        '{status}',
        to_jsonb(new.status)
      )
    where id = new.id::uuid;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- 2. Create the trigger for role and status sync
drop trigger if exists on_user_role_sync on public.users;
create trigger on_user_role_sync
  after insert or update of role, status on public.users
  for each row execute procedure public.handle_update_user_role_and_status();

-- 3. Create a function to handle automatic profile creation on signup
create or replace function public.handle_new_user_profile()
returns trigger as $$
declare
  user_role text;
begin
  -- Note: new.raw_user_meta_data is typed as jsonb in newer Supabase, but some envs treat it as text
  -- We cast to jsonb explicitly for robustness
  user_role := coalesce((new.raw_user_meta_data::jsonb)->>'role', 'public_user');

  insert into public.users (
    id, 
    full_name, 
    email, 
    role, 
    verification_status, 
    status, 
    phone,
    address,
    id_type,
    created_at, 
    updated_at,
    responder_type,
    barangay
  )
  values (
    new.id::text,
    coalesce(
      (new.raw_user_meta_data::jsonb)->>'full_name',
      (coalesce((new.raw_user_meta_data::jsonb)->>'first_name', '') || ' ' || coalesce((new.raw_user_meta_data::jsonb)->>'last_name', '')),
      'User'
    ),
    new.email,
    user_role,
    case 
      when user_role in ('public_user') then 'PENDING'
      else 'APPROVED'
    end,
    case 
      when user_role in ('public_user') then 'PENDING'
      else 'ACTIVE'
    end,
    (new.raw_user_meta_data::jsonb)->>'phone',
    (new.raw_user_meta_data::jsonb)->>'address',
    (new.raw_user_meta_data::jsonb)->>'id_type',
    now(),
    now(),
    (new.raw_user_meta_data::jsonb)->>'responder_type',
    (new.raw_user_meta_data::jsonb)->>'barangay'
  );
  return new;
end;
$$ language plpgsql security definer;

-- 4. Create the trigger for new user profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

-- 5. Initial sync for existing users
-- This ensures any users already in the public table get their roles synced to auth
do $$
declare
  r record;
begin
  for r in select id, role, status from public.users loop
    -- Only attempt sync if ID is a valid UUID format
    if r.id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
      update auth.users
      set raw_app_meta_data = 
        jsonb_set(
          jsonb_set(
            coalesce(raw_app_meta_data, '{}'::jsonb),
            '{role}',
            to_jsonb(r.role)
          ),
          '{status}',
          to_jsonb(r.status)
        )
      where id = r.id::uuid;
    end if;
  end loop;
end;
$$;
