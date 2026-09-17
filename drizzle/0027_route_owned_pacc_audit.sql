-- PACC audit events are written by authenticated route transactions. Remove
-- the legacy trigger that guessed the actor as the oldest PACC account and
-- could duplicate route-owned rejection/merge records.
DROP TRIGGER IF EXISTS on_request_triage_log ON public.verification_requests;
--> statement-breakpoint
DROP FUNCTION IF EXISTS public.handle_request_triage_log();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.fill_audit_actor_snapshot()
RETURNS trigger AS $$
BEGIN
  IF (new.actor_name IS NULL OR new.actor_role IS NULL) AND new.user_id IS NOT NULL THEN
    SELECT full_name, role
      INTO new.actor_name, new.actor_role
      FROM public.users
      WHERE id = new.user_id;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
--> statement-breakpoint
DROP TRIGGER IF EXISTS on_audit_actor_snapshot ON public.audit_logs;
--> statement-breakpoint
CREATE TRIGGER on_audit_actor_snapshot
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE PROCEDURE public.fill_audit_actor_snapshot();
