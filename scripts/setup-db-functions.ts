import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const runSetup = async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  
  console.log('Setting up PL/pgSQL functions, Storage, and Notifications Triggers...');

  try {
    // 1. Create the distance function
    await sql`
      CREATE OR REPLACE FUNCTION public.find_available_responders_in_radius(
        incident_lat double precision,
        incident_lon double precision,
        radius_km double precision default 1.0
      )
      RETURNS TABLE (
        responder_id varchar,
        distance_km double precision
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          u.id as responder_id,
          (6371 * acos(
            cos(radians(incident_lat)) * cos(radians(u.latitude)) * 
            cos(radians(u.longitude) - radians(incident_lon)) + 
            sin(radians(incident_lat)) * sin(radians(u.latitude))
          )) as distance_km
        FROM public.users u
        WHERE u.role = 'ambulance_responder'
          AND u.status = 'ONLINE'
          AND (6371 * acos(
            cos(radians(incident_lat)) * cos(radians(u.latitude)) * 
            cos(radians(u.longitude) - radians(incident_lon)) + 
            sin(radians(incident_lat)) * sin(radians(u.latitude))
          )) <= radius_km
        ORDER BY distance_km ASC;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    console.log('✅ find_available_responders_in_radius function created.');    // 2. Storage Setup
    try {
      await sql`
        INSERT INTO storage.buckets (id, name, public) 
        VALUES ('incident-photos', 'incident-photos', true)
        ON CONFLICT (id) DO NOTHING;
      `;
      await sql`
        INSERT INTO storage.buckets (id, name, public) 
        VALUES ('avatars', 'avatars', true)
        ON CONFLICT (id) DO NOTHING;
      `;
      console.log('✅ Storage buckets (incident-photos, avatars) successfully verified.');
    } catch (storageErr) {
      console.warn('⚠️ Could not configure Supabase storage via SQL. This is expected if the storage schema is restricted.');
    }


    // 3. Create the Database Notification Trigger Function
    await sql`
      CREATE OR REPLACE FUNCTION public.generate_database_notifications()
      RETURNS trigger AS $$
      declare
        target_resident_id varchar;
        target_nature text;
        target_ambulance text;
      begin
        -- -------------------------------------------------------------
        -- CASE A: Triggered by public.verification_requests status update
        -- -------------------------------------------------------------
        if TG_TABLE_NAME = 'verification_requests' then
          if new.status = 'VERIFIED' and (old.status is null or old.status <> 'VERIFIED') then
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
          elsif new.status = 'REJECTED' and (old.status is null or old.status <> 'REJECTED') then
            insert into public.notifications (id, user_id, type, title, body, unread, created_at, metadata)
            values (
              gen_random_uuid()::text,
              new.resident_id,
              'incident_verified',
              'Report Rejected',
              'Your request (' || coalesce(new.nature, 'Emergency') || ') was rejected. Reason: ' || coalesce(new.rejection_reason, 'Not specified'),
              true,
              now(),
              jsonb_build_object('requestId', new.id)
            );
          end if;

        -- -------------------------------------------------------------
        -- CASE B: Triggered by public.incidents (Insert or Update)
        -- -------------------------------------------------------------
        elsif TG_TABLE_NAME = 'incidents' then
          -- Fetch residentId and nature from linked verification request
          select resident_id, nature into target_resident_id, target_nature
          from public.verification_requests
          where id = new.request_id;

          -- B1. INSERT: Initial Dispatch Offer
          if TG_OP = 'INSERT' then
            if new.current_offer_responder_id is not null then
              -- Alert Responder of dispatch offer
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
              -- Alert Resident of dispatch initiation
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

          -- B2. UPDATE: Offer cascading or status changes
          elsif TG_OP = 'UPDATE' then
            -- Check if current offer responder has changed (cascading)
            if new.current_offer_responder_id is not null and (old.current_offer_responder_id is null or old.current_offer_responder_id <> new.current_offer_responder_id) then
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

            -- Check for status changes
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

        -- -------------------------------------------------------------
        -- CASE C: Triggered by public.users verification updates
        -- -------------------------------------------------------------
        elsif TG_TABLE_NAME = 'users' then
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

        return new;
      end;
      $$ language plpgsql security definer;
    `;
    console.log('✅ generate_database_notifications trigger function created.');

    // 4. Create Triggers (executed individually to avoid multi-command statements error)
    console.log('Registering table triggers individually...');

    await sql`drop trigger if exists on_verification_request_notification on public.verification_requests;`;
    await sql`create trigger on_verification_request_notification
        after update of status on public.verification_requests
        for each row execute procedure public.generate_database_notifications();`;
    console.log('✅ Verification request trigger registered.');

    await sql`drop trigger if exists on_incident_notification on public.incidents;`;
    await sql`create trigger on_incident_notification
        after insert or update of status, current_offer_responder_id on public.incidents
        for each row execute procedure public.generate_database_notifications();`;
    console.log('✅ Incident status trigger registered.');

    await sql`drop trigger if exists on_user_verification_notification on public.users;`;
    await sql`create trigger on_user_verification_notification
        after update of verification_status on public.users
        for each row execute procedure public.generate_database_notifications();`;
    console.log('✅ User verification status trigger registered.');

    console.log('🎉 All notification triggers successfully bound to tables.');

  } catch (error) {
    console.error('Setup failed:', error);
  } finally {
    process.exit(0);
  }
};

runSetup();
