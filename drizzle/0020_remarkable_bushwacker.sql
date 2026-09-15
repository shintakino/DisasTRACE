ALTER TABLE "verification_requests" ADD COLUMN "rejection_reason" text;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.generate_database_notifications()
RETURNS trigger AS $$
declare
  target_resident_id varchar;
  target_nature text;
begin
  if TG_TABLE_NAME = 'verification_requests' then
    if TG_OP = 'INSERT' then
      insert into public.notifications (id, user_id, type, title, body, unread, created_at, metadata)
      select
        gen_random_uuid()::text,
        u.id,
        'new_incident',
        'New Incident Report',
        'A new ' || coalesce(new.nature, 'Emergency') || ' report (' || new.type || ') is pending triage.',
        true,
        now(),
        jsonb_build_object('requestId', new.id)
      from public.users u
      where u.role in ('pacc_admin', 'cdrrmo_super_admin');
    elsif TG_OP = 'UPDATE' then
      if new.status = 'VERIFIED' and (old.status is null or old.status <> 'VERIFIED') and new.resident_id is not null then
        insert into public.notifications (id, user_id, type, title, body, unread, created_at, metadata)
        values (
          gen_random_uuid()::text,
          new.resident_id,
          'incident_verified',
          'Report Verified',
          'Your request (' || coalesce(new.nature, 'Emergency') || ') has been verified. Dispatch initiated.',
          true,
          now(),
          jsonb_build_object('requestId', new.id)
        );
      elsif new.status = 'REJECTED'
        and (old.status is null or old.status <> 'REJECTED')
        and new.resident_id is not null
        and new.rejection_reason is not null then
        insert into public.notifications (id, user_id, type, title, body, unread, created_at, metadata)
        values (
          gen_random_uuid()::text,
          new.resident_id,
          'incident_rejected',
          'Report Rejected',
          'PACC rejected report ' || new.request_id || '. Reason: ' || new.rejection_reason,
          true,
          now(),
          jsonb_build_object(
            'requestId', new.id,
            'displayRequestId', new.request_id,
            'rejectionReason', new.rejection_reason
          )
        );
      end if;
    end if;
  elsif TG_TABLE_NAME = 'incidents' then
    select resident_id, nature into target_resident_id, target_nature
    from public.verification_requests
    where id = new.request_id;

    if TG_OP = 'INSERT' then
      if new.current_offer_responder_id is not null then
        insert into public.notifications (id, user_id, type, title, body, unread, created_at, metadata)
        values (
          gen_random_uuid()::text,
          new.current_offer_responder_id,
          'dispatch_alert',
          'New Dispatch Assignment',
          'You have been assigned to ' || coalesce(target_nature, 'Emergency') || ' at Baliwag. Respond immediately.',
          true,
          now(),
          jsonb_build_object('incidentId', new.id, 'requestId', new.request_id)
        );
      end if;

      if target_resident_id is not null then
        insert into public.notifications (id, user_id, type, title, body, unread, created_at, metadata)
        values (
          gen_random_uuid()::text,
          target_resident_id,
          'ambulance_dispatched',
          'Ambulance Dispatched',
          'Ambulance ' || coalesce(new.assigned_ambulance, 'Unit') || ' is on the way.',
          true,
          now(),
          jsonb_build_object('incidentId', new.id, 'requestId', new.request_id)
        );
      end if;
    elsif TG_OP = 'UPDATE' then
      if new.current_offer_responder_id is not null
        and (old.current_offer_responder_id is null or old.current_offer_responder_id <> new.current_offer_responder_id) then
        insert into public.notifications (id, user_id, type, title, body, unread, created_at, metadata)
        values (
          gen_random_uuid()::text,
          new.current_offer_responder_id,
          'dispatch_alert',
          'New Dispatch Assignment',
          'You have been assigned to ' || coalesce(target_nature, 'Emergency') || ' at Baliwag. Respond immediately.',
          true,
          now(),
          jsonb_build_object('incidentId', new.id, 'requestId', new.request_id)
        );
      end if;

      if new.status = 'EN_ROUTE' and old.status <> 'EN_ROUTE' and target_resident_id is not null then
        insert into public.notifications (id, user_id, type, title, body, unread, created_at, metadata)
        values (
          gen_random_uuid()::text,
          target_resident_id,
          'ambulance_dispatched',
          'Ambulance Dispatched',
          'Ambulance ' || coalesce(new.assigned_ambulance, 'Unit') || ' is heading your way.',
          true,
          now(),
          jsonb_build_object('incidentId', new.id, 'requestId', new.request_id)
        );
      end if;

      if new.status = 'ARRIVED' and old.status <> 'ARRIVED' and target_resident_id is not null then
        insert into public.notifications (id, user_id, type, title, body, unread, created_at, metadata)
        values (
          gen_random_uuid()::text,
          target_resident_id,
          'responder_arrived',
          'Ambulance Arrived',
          'Ambulance ' || coalesce(new.assigned_ambulance, 'Unit') || ' has arrived at your location.',
          true,
          now(),
          jsonb_build_object('incidentId', new.id, 'requestId', new.request_id)
        );
      end if;

      if new.status = 'RESOLVED' and old.status <> 'RESOLVED' and target_resident_id is not null then
        insert into public.notifications (id, user_id, type, title, body, unread, created_at, metadata)
        values (
          gen_random_uuid()::text,
          target_resident_id,
          'incident_resolved',
          'Incident Resolved',
          'Your incident has been successfully resolved. Thank you for your cooperation.',
          true,
          now(),
          jsonb_build_object('incidentId', new.id, 'requestId', new.request_id)
        );
      end if;
    end if;
  elsif TG_TABLE_NAME = 'users' then
    if TG_OP = 'INSERT' then
      if new.verification_status = 'PENDING' then
        insert into public.notifications (id, user_id, type, title, body, unread, created_at, metadata)
        select
          gen_random_uuid()::text,
          u.id,
          'registration_pending',
          'New Account Pending Verification',
          'A new ' || (case when new.role = 'ambulance_responder' then 'Responder' else 'Resident' end) || ' (' || new.full_name || ') is pending approval.',
          true,
          now(),
          jsonb_build_object('profileId', new.id)
        from public.users u
        where u.role = 'cdrrmo_super_admin';
      end if;
    elsif TG_OP = 'UPDATE' then
      if new.verification_status = 'APPROVED' and old.verification_status <> 'APPROVED' then
        insert into public.notifications (id, user_id, type, title, body, unread, created_at, metadata)
        values (
          gen_random_uuid()::text,
          new.id,
          'registration_approved',
          'Account Approved',
          'Your DisasTRACE account has been successfully approved! You now have full access to reporting.',
          true,
          now(),
          null
        );
      elsif new.verification_status = 'REJECTED' and old.verification_status <> 'REJECTED' then
        insert into public.notifications (id, user_id, type, title, body, unread, created_at, metadata)
        values (
          gen_random_uuid()::text,
          new.id,
          'registration_approved',
          'Account Registration Rejected',
          'Your account registration was rejected. Reason: ' || coalesce(new.rejection_reason, 'Not specified'),
          true,
          now(),
          null
        );
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;
