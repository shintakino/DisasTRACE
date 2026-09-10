-- Dispatch offer expiry must not depend on a responder's JavaScript timers,
-- because Android pauses those timers while an app is backgrounded or locked.
-- Supabase Cron calls the protected Next.js dispatch engine every five seconds.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_cron;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.invoke_dispatch_offer_expiry_scheduler()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  scheduler_url text;
  scheduler_secret text;
BEGIN
  SELECT decrypted_secret INTO scheduler_url
  FROM vault.decrypted_secrets
  WHERE name = 'dispatch_scheduler_url';

  SELECT decrypted_secret INTO scheduler_secret
  FROM vault.decrypted_secrets
  WHERE name = 'dispatch_scheduler_secret';

  IF scheduler_url IS NULL OR scheduler_secret IS NULL THEN
    RAISE WARNING 'Dispatch expiry scheduler is waiting for Supabase Vault secrets.';
    RETURN;
  END IF;

  PERFORM net.http_get(
    url := scheduler_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || scheduler_secret),
    timeout_milliseconds := 5000
  );
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.invoke_dispatch_offer_expiry_scheduler() FROM PUBLIC;
--> statement-breakpoint

DO $$
DECLARE
  existing_job record;
BEGIN
  FOR existing_job IN
    SELECT jobid FROM cron.job WHERE jobname = 'dispatch-offer-expiry'
  LOOP
    PERFORM cron.unschedule(existing_job.jobid);
  END LOOP;

  PERFORM cron.schedule(
    'dispatch-offer-expiry',
    '5 seconds',
    'SELECT public.invoke_dispatch_offer_expiry_scheduler();'
  );
END;
$$;
