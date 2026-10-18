-- TUCXA - Ajuste 92 continuacao - testes controlados, com restauracao atomica.
-- Aplicar em Preview primeiro. Nao executar capturas ou restauracoes pelo SQL Editor.
BEGIN;
CREATE TABLE IF NOT EXISTS public.oh_tucxa_triage_test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  appointment_date date NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  restored_by uuid,
  restored_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','restored'))
);
CREATE TABLE IF NOT EXISTS public.oh_tucxa_triage_test_snapshots (
  session_id uuid NOT NULL REFERENCES public.oh_tucxa_triage_test_sessions(id),
  appointment_id uuid NOT NULL,
  original_state jsonb NOT NULL,
  PRIMARY KEY(session_id,appointment_id)
);
CREATE INDEX IF NOT EXISTS oh_tucxa_triage_test_active_idx
 ON public.oh_tucxa_triage_test_sessions(organization_id,appointment_date,status);
REVOKE ALL ON public.oh_tucxa_triage_test_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.oh_tucxa_triage_test_snapshots FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.oh_tucxa_triage_test_sessions TO service_role;
GRANT SELECT, INSERT ON public.oh_tucxa_triage_test_snapshots TO service_role;
ALTER TABLE public.oh_tucxa_triage_test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oh_tucxa_triage_test_snapshots ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.oh_tucxa_triage_test_begin(
 p_organization_id uuid, p_actor_person_id uuid, p_appointment_ids uuid[]
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_session uuid; v_day date; v_count int; v_id uuid; v_row public.oh_consulente_appointments%rowtype;
BEGIN
 IF p_actor_person_id IS NULL OR p_organization_id IS NULL OR
    p_appointment_ids IS NULL OR cardinality(p_appointment_ids) NOT BETWEEN 1 AND 3 OR
    (SELECT count(DISTINCT x) FROM unnest(p_appointment_ids) x) <> cardinality(p_appointment_ids)
 THEN RAISE EXCEPTION 'INVALID_TEST_SELECTION'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':triage-test',0));
 SELECT count(*), min(a.appointment_date) INTO v_count,v_day
 FROM public.oh_consulente_appointments a
 WHERE a.organization_id=p_organization_id AND a.id=ANY(p_appointment_ids)
 AND a.status IN ('solicitado','confirmado','aprovado','presente');
 IF v_count<>cardinality(p_appointment_ids) OR v_day IS NULL THEN
   RAISE EXCEPTION 'APPOINTMENT_MISSING_OR_INACTIVE'; END IF;
 IF EXISTS (SELECT 1 FROM public.oh_consulente_appointments a
            WHERE a.id=ANY(p_appointment_ids) AND a.organization_id=p_organization_id AND a.appointment_date<>v_day)
 THEN RAISE EXCEPTION 'MIXED_APPOINTMENT_DATES'; END IF;
 IF EXISTS (
   SELECT 1 FROM public.oh_tucxa_triage_test_snapshots s
   JOIN public.oh_tucxa_triage_test_sessions t ON t.id=s.session_id
   WHERE t.organization_id=p_organization_id AND t.status='active' AND s.appointment_id=ANY(p_appointment_ids)
 ) THEN RAISE EXCEPTION 'TEST_ALREADY_ACTIVE_FOR_APPOINTMENT'; END IF;
 INSERT INTO public.oh_tucxa_triage_test_sessions(organization_id,appointment_date,created_by)
 VALUES(p_organization_id,v_day,p_actor_person_id) RETURNING id INTO v_session;
 FOREACH v_id IN ARRAY p_appointment_ids LOOP
   SELECT * INTO STRICT v_row FROM public.oh_consulente_appointments a
   WHERE a.id=v_id AND a.organization_id=p_organization_id FOR UPDATE;
   INSERT INTO public.oh_tucxa_triage_test_snapshots(session_id,appointment_id,original_state)
   VALUES(v_session,v_id,to_jsonb(v_row));
 END LOOP;
 RETURN v_session;
END; $$;

CREATE OR REPLACE FUNCTION public.oh_tucxa_triage_test_restore(
 p_organization_id uuid, p_actor_person_id uuid, p_session_id uuid
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_session public.oh_tucxa_triage_test_sessions%rowtype; v_s record;
        v_row public.oh_consulente_appointments%rowtype; v_count int:=0;
        v_excluded text[]:=ARRAY['status','arrival_status','arrived_at','arrival_order',
         'arrival_registered_by_person_id','forwarded_at','forwarded_by_person_id','updated_at'];
BEGIN
 IF p_actor_person_id IS NULL OR p_organization_id IS NULL THEN RAISE EXCEPTION 'MISSING_ACTOR'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':triage-test',0));
 SELECT * INTO v_session FROM public.oh_tucxa_triage_test_sessions
 WHERE id=p_session_id AND organization_id=p_organization_id FOR UPDATE;
 IF NOT FOUND OR v_session.status<>'active' THEN RAISE EXCEPTION 'TEST_NOT_ACTIVE'; END IF;
 -- Nenhuma alteracao e feita ate todas as verificacoes serem aprovadas.
 FOR v_s IN SELECT appointment_id,original_state FROM public.oh_tucxa_triage_test_snapshots
            WHERE session_id=p_session_id ORDER BY appointment_id LOOP
   SELECT * INTO v_row FROM public.oh_consulente_appointments
   WHERE id=v_s.appointment_id AND organization_id=p_organization_id FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'APPOINTMENT_REMOVED_%',v_s.appointment_id; END IF;
   IF v_row.status='cancelado' THEN RAISE EXCEPTION 'APPOINTMENT_CANCELLED_%',v_s.appointment_id; END IF;
   IF (to_jsonb(v_row)-v_excluded) IS DISTINCT FROM (v_s.original_state-v_excluded)
   THEN RAISE EXCEPTION 'UNRELATED_CHANGES_DETECTED_%',v_s.appointment_id; END IF;
 END LOOP;
 FOR v_s IN SELECT appointment_id,original_state FROM public.oh_tucxa_triage_test_snapshots
            WHERE session_id=p_session_id ORDER BY appointment_id LOOP
   UPDATE public.oh_consulente_appointments a SET
    status=v_s.original_state->>'status',
    arrival_status=v_s.original_state->>'arrival_status',
    arrived_at=(v_s.original_state->>'arrived_at')::timestamptz,
    arrival_order=(v_s.original_state->>'arrival_order')::integer,
    arrival_registered_by_person_id=(v_s.original_state->>'arrival_registered_by_person_id')::uuid,
    forwarded_at=(v_s.original_state->>'forwarded_at')::timestamptz,
    forwarded_by_person_id=(v_s.original_state->>'forwarded_by_person_id')::uuid,
    updated_at=now()
   WHERE a.id=v_s.appointment_id AND a.organization_id=p_organization_id;
   v_count:=v_count+1;
 END LOOP;
 UPDATE public.oh_tucxa_triage_test_sessions SET status='restored',restored_at=now(),restored_by=p_actor_person_id
 WHERE id=p_session_id;
 RETURN v_count;
END; $$;

REVOKE ALL ON FUNCTION public.oh_tucxa_triage_test_begin(uuid,uuid,uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.oh_tucxa_triage_test_restore(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.oh_tucxa_triage_test_begin(uuid,uuid,uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.oh_tucxa_triage_test_restore(uuid,uuid,uuid) TO service_role;
COMMIT;
