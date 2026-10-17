-- Ajuste 93: reagendamento transacional. Aplicar APOS migration finalizacao, somente em homologacao primeiro.
BEGIN;
-- Preserva as mensagens antigas antes de reabrir o aviso para a nova data.
CREATE TABLE IF NOT EXISTS public.oh_tucxa_pilot_reschedule_notification_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  appointment_id uuid NOT NULL,
  archived_by_person_id uuid NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  original_log jsonb NOT NULL
);
ALTER TABLE public.oh_tucxa_pilot_reschedule_notification_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.oh_tucxa_pilot_reschedule_notification_archive FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.oh_tucxa_pilot_reschedule_notification_archive TO service_role;

CREATE OR REPLACE FUNCTION public.oh_tucxa_pilot_reschedule_appointment(
  p_organization_id uuid,
  p_appointment_id uuid,
  p_actor_person_id uuid,
  p_target_entity_id uuid,
  p_target_date date,
  p_confirmation_token_hash text,
  p_confirmation_expires_at timestamptz
) RETURNS TABLE (appointment_id uuid, confirmed_order integer, confirmed_capacity integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a record;
  v_weekday text;
  v_occurrence integer;
  v_capacity integer;
  v_available boolean := true;
  v_override_available boolean;
  v_override_capacity integer;
  v_booked integer;
  v_order integer;
  v_new_metadata jsonb;
BEGIN
  IF p_organization_id IS NULL OR p_appointment_id IS NULL OR p_actor_person_id IS NULL
     OR p_target_entity_id IS NULL OR p_target_date IS NULL
     OR coalesce(length(trim(p_confirmation_token_hash)),0)=0 OR p_confirmation_expires_at IS NULL THEN
    RAISE EXCEPTION USING MESSAGE='INVALID_RESCHEDULE_REQUEST';
  END IF;
  IF p_target_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RAISE EXCEPTION USING MESSAGE='PAST_RESCHEDULE_DATE';
  END IF;
  SELECT id,organization_id,person_id,entity_id,appointment_date,status,metadata,
         arrival_status,arrival_order,forwarded_at
    INTO a
  FROM public.oh_consulente_appointments
  WHERE organization_id=p_organization_id AND id=p_appointment_id
  FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION USING MESSAGE='APPOINTMENT_NOT_FOUND'; END IF;
  IF a.status NOT IN ('solicitado','confirmado','aprovado')
     OR a.arrival_status='arrived' OR a.forwarded_at IS NOT NULL THEN
    RAISE EXCEPTION USING MESSAGE='RESCHEDULE_NOT_ALLOWED_AFTER_ARRIVAL';
  END IF;
  IF a.appointment_date=p_target_date AND a.entity_id=p_target_entity_id THEN
    RAISE EXCEPTION USING MESSAGE='RESCHEDULE_TARGET_UNCHANGED';
  END IF;
  IF EXISTS (SELECT 1 FROM public.oh_tucxa_pilot_day_closures
             WHERE organization_id=p_organization_id AND appointment_date=a.appointment_date AND stage='triage') THEN
    RAISE EXCEPTION USING MESSAGE='SOURCE_TRIAGE_FINALIZED';
  END IF;
  IF EXISTS (SELECT 1 FROM public.oh_tucxa_pilot_day_closures
             WHERE organization_id=p_organization_id AND appointment_date=p_target_date AND stage='triage') THEN
    RAISE EXCEPTION USING MESSAGE='TARGET_TRIAGE_FINALIZED';
  END IF;

  v_weekday := CASE EXTRACT(ISODOW FROM p_target_date) WHEN 1 THEN 'segunda' WHEN 2 THEN 'terca' ELSE '' END;
  v_occurrence := (EXTRACT(DAY FROM p_target_date)::integer - 1)/7 + 1;
  IF v_weekday='' OR v_occurrence>4 THEN
    RAISE EXCEPTION USING MESSAGE='PILOT_DATE_NOT_ALLOWED';
  END IF;
  -- Mesma chave advisory da RPC de reserva, impedindo ultrapassar a capacidade em corrida.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    concat_ws(':',p_organization_id::text,p_target_entity_id::text,p_target_date::text),0));
  SELECT GREATEST(1,COALESCE(s.default_capacity,e.daily_capacity,4)) INTO v_capacity
  FROM public.oh_tucxa_pilot_entity_schedule s
  JOIN public.oh_spiritual_entities e ON e.id=s.entity_id AND e.organization_id=s.organization_id
  WHERE s.organization_id=p_organization_id AND s.entity_id=p_target_entity_id
    AND s.weekday=v_weekday AND s.month_occurrence=v_occurrence
    AND s.active AND e.active AND e.appointment_enabled
  LIMIT 1;
  IF v_capacity IS NULL THEN RAISE EXCEPTION USING MESSAGE='PILOT_ENTITY_NOT_SCHEDULED'; END IF;
  SELECT ov.available,ov.capacity INTO v_override_available,v_override_capacity
  FROM public.oh_tucxa_pilot_entity_overrides ov
  WHERE ov.organization_id=p_organization_id AND ov.entity_id=p_target_entity_id
    AND p_target_date BETWEEN ov.starts_on AND ov.ends_on
  ORDER BY ov.created_at DESC LIMIT 1;
  IF FOUND THEN
    v_available:=COALESCE(v_override_available,true);
    v_capacity:=GREATEST(1,COALESCE(v_override_capacity,v_capacity));
  END IF;
  IF NOT v_available THEN RAISE EXCEPTION USING MESSAGE='PILOT_ENTITY_SUSPENDED'; END IF;
  IF a.person_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.oh_consulente_appointments x
    WHERE x.organization_id=p_organization_id AND x.person_id=a.person_id
      AND x.appointment_date=p_target_date AND x.id<>p_appointment_id
      AND x.status IN ('solicitado','confirmado','aprovado','presente','concluido')
  ) THEN RAISE EXCEPTION USING MESSAGE='PILOT_DUPLICATE_PERSON_DATE'; END IF;
  SELECT COUNT(*)::integer INTO v_booked FROM public.oh_consulente_appointments x
  WHERE x.organization_id=p_organization_id AND x.entity_id=p_target_entity_id
    AND x.appointment_date=p_target_date AND x.id<>p_appointment_id
    AND x.status IN ('solicitado','confirmado','aprovado','presente','concluido');
  IF v_booked>=v_capacity THEN RAISE EXCEPTION USING MESSAGE='PILOT_NO_AVAILABILITY'; END IF;
  SELECT COALESCE(MAX(CASE WHEN COALESCE(x.metadata->>'order','')~'^[0-9]+$'
       THEN (x.metadata->>'order')::integer ELSE 0 END),0)+1 INTO v_order
  FROM public.oh_consulente_appointments x
  WHERE x.organization_id=p_organization_id AND x.entity_id=p_target_entity_id
    AND x.appointment_date=p_target_date AND x.id<>p_appointment_id;

  v_new_metadata := jsonb_set(
    COALESCE(a.metadata,'{}'::jsonb),'{reschedule_history}',
    COALESCE(a.metadata->'reschedule_history','[]'::jsonb) ||
    jsonb_build_array(jsonb_build_object('from_date',a.appointment_date,'from_entity_id',a.entity_id,
      'to_date',p_target_date,'to_entity_id',p_target_entity_id,'actor_person_id',p_actor_person_id,'at',now())),
    true
  ) || jsonb_build_object('order',v_order,'confirmed_order',v_order,
                          'pilot_month_occurrence',v_occurrence,'pilot_weekday',v_weekday);
  UPDATE public.oh_consulente_appointments
  SET appointment_date=p_target_date,entity_id=p_target_entity_id,
      metadata=v_new_metadata,status='solicitado',confirmation_status='pending',
      confirmation_token_hash=p_confirmation_token_hash,
      confirmation_expires_at=p_confirmation_expires_at,
      confirmed_at=NULL,confirmation_sent_at=NULL,confirmation_channel=NULL,
      arrival_status='pending',arrival_order=NULL,arrived_at=NULL,
      arrival_registered_by_person_id=NULL,forwarded_at=NULL,forwarded_by_person_id=NULL,
      updated_at=now()
  WHERE id=p_appointment_id AND organization_id=p_organization_id;
  -- O cron usa (appointment_id,notification_type) para impedir lembretes duplicados.
  -- Arquivamos o lembrete anterior e liberamos a chave ativa para a NOVA data.
  INSERT INTO public.oh_tucxa_pilot_reschedule_notification_archive
    (organization_id,appointment_id,archived_by_person_id,original_log)
  SELECT p_organization_id,p_appointment_id,p_actor_person_id,to_jsonb(l)
  FROM public.oh_tucxa_pilot_notification_log l
  WHERE l.organization_id=p_organization_id AND l.appointment_id=p_appointment_id
    AND l.notification_type='day_reminder';
  DELETE FROM public.oh_tucxa_pilot_notification_log l
  WHERE l.organization_id=p_organization_id AND l.appointment_id=p_appointment_id
    AND l.notification_type='day_reminder';
  RETURN QUERY SELECT p_appointment_id,v_order,v_capacity;
END;
$$;
REVOKE ALL ON FUNCTION public.oh_tucxa_pilot_reschedule_appointment(uuid,uuid,uuid,uuid,date,text,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.oh_tucxa_pilot_reschedule_appointment(uuid,uuid,uuid,uuid,date,text,timestamptz) TO service_role;
COMMIT;
