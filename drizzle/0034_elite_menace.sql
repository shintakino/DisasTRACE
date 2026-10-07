-- The configured database has always written notification values in UTC. Keep
-- their represented instants when upgrading the legacy timezone-naive column.
ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "status_logs" ADD COLUMN "incident_id" varchar(255);--> statement-breakpoint
ALTER TABLE "status_logs" ADD CONSTRAINT "status_logs_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "status_logs_incident_action_created_idx" ON "status_logs" USING btree ("incident_id","action","created_at");--> statement-breakpoint

-- Historical status logs have no incident key and cannot be linked safely.
-- New incident transitions carry their authoritative incident identifier.
CREATE OR REPLACE FUNCTION public.handle_status_log_change()
RETURNS trigger AS $$
declare
  responder_name text;
begin
  select full_name into responder_name
  from public.users
  where id = new.responder_id;

  if TG_OP = 'UPDATE' then
    if new.status = 'EN_ROUTE' and old.status <> 'EN_ROUTE' and new.responder_id is not null then
      insert into public.status_logs (id, user_id, incident_id, status, action, description, created_at)
      values (
        gen_random_uuid()::text,
        new.responder_id,
        new.id,
        'DISPATCHED',
        'DISPATCHED',
        'Responder ' || coalesce(responder_name, 'Unit') || ' is en route to scene with ambulance ' || coalesce(new.assigned_ambulance, 'Unit'),
        now()
      );
    end if;

    if new.status = 'ARRIVED' and old.status <> 'ARRIVED' and new.responder_id is not null then
      insert into public.status_logs (id, user_id, incident_id, status, action, description, created_at)
      values (
        gen_random_uuid()::text,
        new.responder_id,
        new.id,
        'ON-SCENE',
        'ARRIVED',
        'Responder ' || coalesce(responder_name, 'Unit') || ' arrived on scene',
        now()
      );
    end if;

    if new.status = 'RESOLVED' and old.status <> 'RESOLVED' and new.responder_id is not null then
      insert into public.status_logs (id, user_id, incident_id, status, action, description, created_at)
      values (
        gen_random_uuid()::text,
        new.responder_id,
        new.id,
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
