-- Setup logging triggers for status_logs and audit_logs in DisasTRACE database

-- 1. Trigger function for public.incidents (Status Logs for Responders)
CREATE OR REPLACE FUNCTION public.handle_status_log_change()
RETURNS trigger AS $$
declare
  responder_name text;
begin
  -- Fetch the responder name
  select full_name into responder_name 
  from public.users 
  where id = new.responder_id;

  if TG_OP = 'UPDATE' then
    -- EN_ROUTE -> DISPATCHED status log
    if new.status = 'EN_ROUTE' and old.status <> 'EN_ROUTE' and new.responder_id is not null then
      insert into public.status_logs (id, user_id, status, action, description, created_at)
      values (
        gen_random_uuid()::text,
        new.responder_id,
        'DISPATCHED',
        'DISPATCHED',
        'Responder ' || coalesce(responder_name, 'Unit') || ' is en route to scene with ambulance ' || coalesce(new.assigned_ambulance, 'Unit'),
        now()
      );
    end if;

    -- ARRIVED -> ON-SCENE status log
    if new.status = 'ARRIVED' and old.status <> 'ARRIVED' and new.responder_id is not null then
      insert into public.status_logs (id, user_id, status, action, description, created_at)
      values (
        gen_random_uuid()::text,
        new.responder_id,
        'ON-SCENE',
        'ARRIVED',
        'Responder ' || coalesce(responder_name, 'Unit') || ' arrived on scene',
        now()
      );
    end if;

    -- RESOLVED -> STANDBY status log
    if new.status = 'RESOLVED' and old.status <> 'RESOLVED' and new.responder_id is not null then
      insert into public.status_logs (id, user_id, status, action, description, created_at)
      values (
        gen_random_uuid()::text,
        new.responder_id,
        'STANDBY',
        'COMPLETED',
        'Responder ' || coalesce(responder_name, 'Unit') || ' completed incident response',
        now()
      );
    end if;
  end if;

  return new;
end;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger function for public.users (Audit logs for Approvals/Suspensions/Bans & Status logs for Shifts)
CREATE OR REPLACE FUNCTION public.handle_user_status_log_change()
RETURNS trigger AS $$
declare
  performing_admin_id varchar;
begin
  -- Identify performing admin
  performing_admin_id := auth.uid()::text;
  if performing_admin_id is null or not exists (select 1 from public.users where id = performing_admin_id) then
    select id into performing_admin_id from public.users where role = 'cdrrmo_super_admin' order by created_at asc limit 1;
  end if;

  if TG_OP = 'UPDATE' then
    -- Account Approval
    if new.verification_status = 'APPROVED' and old.verification_status <> 'APPROVED' then
      insert into public.audit_logs (id, user_id, action, entity_type, entity_id, created_at)
      values (
        gen_random_uuid()::text,
        performing_admin_id,
        'Approved user registration: ' || new.full_name || ' (' || new.role || ')',
        'USER',
        new.id,
        now()
      );
    end if;

    -- Account Rejection
    if new.verification_status = 'REJECTED' and old.verification_status <> 'REJECTED' then
      insert into public.audit_logs (id, user_id, action, entity_type, entity_id, created_at)
      values (
        gen_random_uuid()::text,
        performing_admin_id,
        'Rejected user registration: ' || new.full_name || ' (' || new.role || ')',
        'USER',
        new.id,
        now()
      );
    end if;

    -- Account Suspension
    if new.status = 'SUSPENDED' and old.status <> 'SUSPENDED' then
      insert into public.audit_logs (id, user_id, action, entity_type, entity_id, created_at)
      values (
        gen_random_uuid()::text,
        performing_admin_id,
        'Suspended user account: ' || new.full_name || ' (' || new.role || ')',
        'USER',
        new.id,
        now()
      );
    end if;

    -- Account Deactivation
    if new.status = 'DEACTIVATED' and old.status <> 'DEACTIVATED' then
      insert into public.audit_logs (id, user_id, action, entity_type, entity_id, created_at)
      values (
        gen_random_uuid()::text,
        performing_admin_id,
        'Deactivated user account: ' || new.full_name || ' (' || new.role || ')',
        'USER',
        new.id,
        now()
      );
    end if;

    -- Account Reactivation
    if new.status = 'ACTIVE' and old.status = 'SUSPENDED' then
      insert into public.audit_logs (id, user_id, action, entity_type, entity_id, created_at)
      values (
        gen_random_uuid()::text,
        performing_admin_id,
        'Reactivated user account: ' || new.full_name || ' (' || new.role || ')',
        'USER',
        new.id,
        now()
      );
    end if;

    -- Responder duty status changes (went on/off duty)
    if new.role = 'ambulance_responder' then
      -- Shift started (Went on duty)
      if new.duty_status = 'ON_DUTY' and old.duty_status <> 'ON_DUTY' then
        insert into public.status_logs (id, user_id, status, action, description, created_at)
        values (
          gen_random_uuid()::text,
          new.id,
          'STANDBY',
          'STARTED',
          'Responder ' || new.full_name || ' started shift (went on duty)',
          now()
        );
      end if;

      -- Shift ended (Went off duty)
      if new.duty_status = 'OFF_DUTY' and old.duty_status <> 'OFF_DUTY' then
        insert into public.status_logs (id, user_id, status, action, description, created_at)
        values (
          gen_random_uuid()::text,
          new.id,
          'OFF_DUTY',
          'ENDED',
          'Responder ' || new.full_name || ' ended shift (went off duty)',
          now()
        );
      end if;
    end if;
  end if;

  return new;
end;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification audit events are written by the authenticated API routes in the
-- same transaction as each PACC action. Keep the legacy trigger removed: it
-- guessed an actor when auth.uid() was unavailable and could duplicate events.
drop trigger if exists on_request_triage_log on public.verification_requests;
drop function if exists public.handle_request_triage_log();

-- 4. Register triggers on tables
-- Incidents trigger
drop trigger if exists on_incident_status_log on public.incidents;
create trigger on_incident_status_log
    after update of status on public.incidents
    for each row execute procedure public.handle_status_log_change();

-- Users trigger
drop trigger if exists on_user_status_log_change on public.users;
create trigger on_user_status_log_change
    after update of verification_status, status, duty_status on public.users
    for each row execute procedure public.handle_user_status_log_change();

-- Verification requests intentionally have no generic audit trigger. Route-owned
-- events preserve the actual actor plus structured before/after details.
drop trigger if exists on_request_triage_log on public.verification_requests;
drop function if exists public.handle_request_triage_log();
