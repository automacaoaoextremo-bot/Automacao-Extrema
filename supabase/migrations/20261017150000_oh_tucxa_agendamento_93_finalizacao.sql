-- TUCXA Ajuste 93: encerramento definitivo por data e etapa.
-- Antes de aplicar: executar no Supabase de HOMOLOGACAO e fazer backup.
BEGIN;
CREATE TABLE IF NOT EXISTS public.oh_tucxa_pilot_day_closures (
  organization_id uuid NOT NULL,
  appointment_date date NOT NULL,
  stage text NOT NULL CHECK (stage IN ('triage', 'forwarding')),
  finalized_at timestamptz NOT NULL DEFAULT now(),
  finalized_by_person_id uuid NOT NULL,
  PRIMARY KEY (organization_id, appointment_date, stage)
);
ALTER TABLE public.oh_tucxa_pilot_day_closures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.oh_tucxa_pilot_day_closures FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.oh_tucxa_pilot_day_closures TO service_role;

CREATE OR REPLACE FUNCTION public.oh_tucxa_pilot_finalize_day_stage(
  p_organization_id uuid,
  p_appointment_date date,
  p_actor_person_id uuid,
  p_stage text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_organization_id IS NULL OR p_appointment_date IS NULL OR p_actor_person_id IS NULL
    OR p_stage IS NULL OR p_stage NOT IN ('triage','forwarding') THEN
    RAISE EXCEPTION USING MESSAGE='INVALID_FINALIZATION_REQUEST';
  END IF;

  -- Serializa finalizacao e edicoes no mesmo dia, em qualquer tela/rota.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    p_organization_id::text || ':' || p_appointment_date::text || ':stage-93', 0));

  IF p_stage = 'forwarding' AND NOT EXISTS (
    SELECT 1 FROM public.oh_tucxa_pilot_day_closures
    WHERE organization_id=p_organization_id AND appointment_date=p_appointment_date AND stage='triage'
  ) THEN
    RAISE EXCEPTION USING MESSAGE='FINISH_TRIAGE_FIRST';
  END IF;
  INSERT INTO public.oh_tucxa_pilot_day_closures
    (organization_id,appointment_date,stage,finalized_by_person_id)
  VALUES (p_organization_id,p_appointment_date,p_stage,p_actor_person_id);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION USING MESSAGE='STAGE_ALREADY_FINALIZED';
END;
$$;
REVOKE ALL ON FUNCTION public.oh_tucxa_pilot_finalize_day_stage(uuid,date,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.oh_tucxa_pilot_finalize_day_stage(uuid,date,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.oh_tucxa_pilot_prevent_finished_edits_93()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_triage_changed boolean;
  v_forwarding_changed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(
      NEW.organization_id::text || ':' || NEW.appointment_date::text || ':stage-93', 0));
    IF EXISTS (
      SELECT 1 FROM public.oh_tucxa_pilot_day_closures
      WHERE organization_id=NEW.organization_id AND appointment_date=NEW.appointment_date AND stage='triage'
    ) THEN
      RAISE EXCEPTION USING MESSAGE='TRIAGE_FINALIZED';
    END IF;
    RETURN NEW;
  END IF;
  v_triage_changed :=
       OLD.arrival_status IS DISTINCT FROM NEW.arrival_status
    OR OLD.arrival_order IS DISTINCT FROM NEW.arrival_order
    OR OLD.arrived_at IS DISTINCT FROM NEW.arrived_at
    OR OLD.arrival_registered_by_person_id IS DISTINCT FROM NEW.arrival_registered_by_person_id
    OR OLD.appointment_date IS DISTINCT FROM NEW.appointment_date
    OR OLD.entity_id IS DISTINCT FROM NEW.entity_id;
  v_forwarding_changed :=
       OLD.forwarded_at IS DISTINCT FROM NEW.forwarded_at
    OR OLD.forwarded_by_person_id IS DISTINCT FROM NEW.forwarded_by_person_id;
  IF NOT v_triage_changed AND NOT v_forwarding_changed THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    OLD.organization_id::text || ':' || OLD.appointment_date::text || ':stage-93', 0));

  IF OLD.appointment_date IS DISTINCT FROM NEW.appointment_date THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(
      NEW.organization_id::text || ':' || NEW.appointment_date::text || ':stage-93', 0));
  END IF;
  IF (OLD.appointment_date IS DISTINCT FROM NEW.appointment_date) AND EXISTS (
    SELECT 1 FROM public.oh_tucxa_pilot_day_closures
    WHERE organization_id=NEW.organization_id AND appointment_date=NEW.appointment_date AND stage='triage'
  ) THEN
    RAISE EXCEPTION USING MESSAGE='TARGET_TRIAGE_FINALIZED';
  END IF;
  IF v_triage_changed AND EXISTS (
    SELECT 1 FROM public.oh_tucxa_pilot_day_closures
    WHERE organization_id=OLD.organization_id AND appointment_date=OLD.appointment_date AND stage='triage'
  ) THEN
    RAISE EXCEPTION USING MESSAGE='TRIAGE_FINALIZED';
  END IF;
  IF v_forwarding_changed AND EXISTS (
    SELECT 1 FROM public.oh_tucxa_pilot_day_closures
    WHERE organization_id=OLD.organization_id AND appointment_date=OLD.appointment_date AND stage='forwarding'
  ) THEN
    RAISE EXCEPTION USING MESSAGE='FORWARDING_FINALIZED';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_oh_tucxa_pilot_finished_93 ON public.oh_consulente_appointments;
CREATE TRIGGER trg_oh_tucxa_pilot_finished_93
BEFORE INSERT OR UPDATE ON public.oh_consulente_appointments
FOR EACH ROW EXECUTE FUNCTION public.oh_tucxa_pilot_prevent_finished_edits_93();
COMMIT;
