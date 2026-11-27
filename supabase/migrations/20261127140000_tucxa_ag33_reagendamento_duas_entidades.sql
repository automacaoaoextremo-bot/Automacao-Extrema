-- AG33: alinhar a RPC de reagendamento a politica AG31.
-- Aplicar primeiro em homologacao. Nao altera dados nem migracoes anteriores.
-- Preserva a definicao instalada (inclusive eventuais evolucoes), ACL e historico.
BEGIN;
DO $ag33$
DECLARE
  v_definition text;
  v_trigger text;
  v_old constant text := $old$  IF a.person_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.oh_consulente_appointments x
    WHERE x.organization_id=p_organization_id AND x.person_id=a.person_id
      AND x.appointment_date=p_target_date AND x.id<>p_appointment_id
      AND x.status IN ('solicitado','confirmado','aprovado','presente','concluido')
  ) THEN RAISE EXCEPTION USING MESSAGE='PILOT_DUPLICATE_PERSON_DATE'; END IF;$old$;
  v_new constant text := $new$  -- AG33: mesma politica AG31, excluindo o agendamento em movimento.
  IF a.person_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':','ag24',
      p_organization_id::text,a.person_id::text,p_target_date::text),0));
    IF EXISTS (
      SELECT 1 FROM public.oh_consulente_appointments x
      WHERE x.organization_id=p_organization_id AND x.person_id=a.person_id
        AND x.appointment_date=p_target_date AND x.id<>p_appointment_id
        AND x.entity_id=p_target_entity_id
        AND x.status IN ('solicitado','confirmado','aprovado','presente','concluido')
    ) THEN RAISE EXCEPTION USING MESSAGE='PILOT_DUPLICATE_SAME_ENTITY',ERRCODE='23505'; END IF;
    IF (
      SELECT count(*) FROM public.oh_consulente_appointments x
      WHERE x.organization_id=p_organization_id AND x.person_id=a.person_id
        AND x.appointment_date=p_target_date AND x.id<>p_appointment_id
        AND x.status IN ('solicitado','confirmado','aprovado','presente','concluido')
    )>=2 THEN RAISE EXCEPTION USING MESSAGE='PILOT_MAX_TWO_PERSON_DATE',ERRCODE='23505'; END IF;
    IF EXISTS (
      SELECT 1 FROM public.oh_consulente_appointments x
      WHERE x.organization_id=p_organization_id AND x.person_id=a.person_id
        AND x.appointment_date=p_target_date AND x.id<>p_appointment_id
        AND x.status IN ('solicitado','confirmado','aprovado','presente','concluido')
    ) AND NOT EXISTS (
      SELECT 1 FROM public.oh_spiritual_entities e
      WHERE e.organization_id=p_organization_id AND e.pilot_allows_same_day_booking IS TRUE
        AND (e.id=p_target_entity_id OR EXISTS (
          SELECT 1 FROM public.oh_consulente_appointments x
          WHERE x.organization_id=p_organization_id AND x.person_id=a.person_id
            AND x.appointment_date=p_target_date AND x.id<>p_appointment_id
            AND x.entity_id=e.id
            AND x.status IN ('solicitado','confirmado','aprovado','presente','concluido')
        ))
    ) THEN RAISE EXCEPTION USING MESSAGE='PILOT_DUPLICATE_PERSON_DATE',ERRCODE='23505'; END IF;
  END IF;$new$;
BEGIN
  SELECT pg_get_functiondef('public.tucxa_ag24_prevent_duplicate_person_day()'::regprocedure)
    INTO v_trigger;
  IF position('PILOT_MAX_TWO_PERSON_DATE' in v_trigger)=0
     OR position('v_existing_authorized' in v_trigger)=0
     OR NOT EXISTS (
       SELECT 1 FROM pg_trigger t
       WHERE t.tgrelid='public.oh_consulente_appointments'::regclass
         AND t.tgname='trg_tucxa_ag24_prevent_duplicate_person_day'
         AND t.tgfoid='public.tucxa_ag24_prevent_duplicate_person_day()'::regprocedure
         AND t.tgenabled IN ('O','A')
     ) THEN
    RAISE EXCEPTION 'AG33: gatilho AG31 nao confirmado; aplique AG31 primeiro';
  END IF;
  SELECT pg_get_functiondef('public.oh_tucxa_pilot_reschedule_appointment(uuid,uuid,uuid,uuid,date,text,timestamptz)'::regprocedure)
    INTO v_definition;
  IF position(v_new in v_definition)>0 THEN
    RAISE NOTICE 'AG33 ja aplicada';
    RETURN;
  END IF;
  IF position(v_old in v_definition)=0 OR
     length(v_definition)-length(replace(v_definition,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'AG33: definicao instalada diverge da esperada; revisar antes de alterar';
  END IF;
  EXECUTE replace(v_definition,v_old,v_new);
END;
$ag33$;
COMMIT;
