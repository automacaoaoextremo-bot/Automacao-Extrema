-- AG34: atomic arrival for the same canonical person/date, using existing RPC for each entity.
BEGIN;
CREATE OR REPLACE FUNCTION public.oh_tucxa_pilot_mark_arrival_ag34(
 p_organization_id uuid,p_appointment_id uuid,p_actor_person_id uuid,p_arrival_status text
) RETURNS TABLE(appointment_id uuid,confirmed_arrival_status text,confirmed_arrival_order integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 v_person uuid; v_date date; v_row record; v_result record; v_found boolean:=false;
BEGIN
 IF p_arrival_status IS DISTINCT FROM 'arrived' THEN RAISE EXCEPTION 'INVALID_ARRIVAL_STATUS'; END IF;
 SELECT a.person_id,a.appointment_date INTO v_person,v_date FROM public.oh_consulente_appointments a
 WHERE a.organization_id=p_organization_id AND a.id=p_appointment_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'APPOINTMENT_NOT_FOUND'; END IF;
 IF v_person IS NOT NULL THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':','ag24',p_organization_id::text,v_person::text,v_date::text),0));
 END IF;
 -- Lock all candidates in a stable order. Any exception rolls back the entire call.
 FOR v_row IN SELECT a.id,a.status,a.arrival_status,a.forwarded_at FROM public.oh_consulente_appointments a
 WHERE a.organization_id=p_organization_id AND a.appointment_date=v_date
 AND (a.id=p_appointment_id OR (v_person IS NOT NULL AND a.person_id=v_person AND a.status IN ('solicitado','confirmado','aprovado','presente')))
 AND (a.id<>p_appointment_id OR a.person_id IS NOT DISTINCT FROM v_person)
 ORDER BY a.entity_id,a.id FOR UPDATE
 LOOP
  IF v_row.id=p_appointment_id THEN
   v_found:=true;
   IF v_row.status NOT IN ('solicitado','confirmado','aprovado','presente','ausente') OR v_row.forwarded_at IS NOT NULL THEN
    RAISE EXCEPTION 'AG34_ARRIVAL_NOT_ALLOWED';
   END IF;
  END IF;
  IF v_row.forwarded_at IS NOT NULL OR (v_row.id<>p_appointment_id AND v_row.arrival_status='arrived') THEN CONTINUE; END IF;
  SELECT * INTO v_result FROM public.oh_tucxa_pilot_mark_arrival(p_organization_id,v_row.id,p_actor_person_id,'arrived');
  IF v_row.id=p_appointment_id THEN
   appointment_id:=v_result.appointment_id; confirmed_arrival_status:=v_result.confirmed_arrival_status; confirmed_arrival_order:=v_result.confirmed_arrival_order;
  END IF;
 END LOOP;
 IF NOT v_found THEN RAISE EXCEPTION 'AG34_APPOINTMENT_CHANGED'; END IF;
 RETURN NEXT;
END; $$;
REVOKE ALL ON FUNCTION public.oh_tucxa_pilot_mark_arrival_ag34(uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.oh_tucxa_pilot_mark_arrival_ag34(uuid,uuid,uuid,text) TO service_role;
COMMIT;
