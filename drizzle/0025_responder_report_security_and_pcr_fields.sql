ALTER TABLE "patient_care_reports" ADD COLUMN "pain_assessment" jsonb;--> statement-breakpoint
ALTER TABLE "patient_care_reports" ADD COLUMN "gcs_points" integer;--> statement-breakpoint

-- Report and clinical records are read through owner-scoped REST endpoints.
-- Retain the responder's small direct SELECT used by the offline form picker,
-- but do not allow authenticated clients to mutate these tables directly.
DROP POLICY IF EXISTS application_session_required ON public.reports;--> statement-breakpoint
DROP POLICY IF EXISTS responder_owner_or_admin_select ON public.reports;--> statement-breakpoint
CREATE POLICY responder_owner_or_admin_select ON public.reports
  FOR SELECT TO authenticated
  USING (
    public.has_valid_application_session()
    AND (
      responder_id = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.users AS actor
        WHERE actor.id = auth.uid()::text
          AND actor.role IN ('pacc_admin', 'cdrrmo_super_admin')
      )
    )
  );--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON TABLE public.reports FROM authenticated;--> statement-breakpoint

DROP POLICY IF EXISTS application_session_required ON public.patient_care_reports;--> statement-breakpoint
DROP POLICY IF EXISTS responder_owner_or_admin_select ON public.patient_care_reports;--> statement-breakpoint
CREATE POLICY responder_owner_or_admin_select ON public.patient_care_reports
  FOR SELECT TO authenticated
  USING (
    public.has_valid_application_session()
    AND (
      EXISTS (
        SELECT 1 FROM public.reports AS owned_report
        WHERE owned_report.incident_id = patient_care_reports.incident_id
          AND owned_report.responder_id = auth.uid()::text
      )
      OR EXISTS (
        SELECT 1 FROM public.users AS actor
        WHERE actor.id = auth.uid()::text
          AND actor.role IN ('pacc_admin', 'cdrrmo_super_admin')
      )
    )
  );--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON TABLE public.patient_care_reports FROM authenticated;--> statement-breakpoint

DROP POLICY IF EXISTS application_session_required ON public.driver_trip_tickets;--> statement-breakpoint
DROP POLICY IF EXISTS responder_owner_or_admin_select ON public.driver_trip_tickets;--> statement-breakpoint
CREATE POLICY responder_owner_or_admin_select ON public.driver_trip_tickets
  FOR SELECT TO authenticated
  USING (
    public.has_valid_application_session()
    AND (
      EXISTS (
        SELECT 1 FROM public.reports AS owned_report
        WHERE owned_report.incident_id = driver_trip_tickets.incident_id
          AND owned_report.responder_id = auth.uid()::text
      )
      OR EXISTS (
        SELECT 1 FROM public.users AS actor
        WHERE actor.id = auth.uid()::text
          AND actor.role IN ('pacc_admin', 'cdrrmo_super_admin')
      )
    )
  );--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON TABLE public.driver_trip_tickets FROM authenticated;
