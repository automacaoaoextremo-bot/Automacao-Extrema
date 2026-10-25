-- Agendamento TUCXA V2 / Ajuste 01 (etapa: datas extraordinárias).
-- Em banco isolado PRIMEIRO; aplica-se SOMENTE depois das migrations até Ajuste 93.
-- Reautoriza exclusivamente as duas funções; a service_role mantém acesso anterior.
BEGIN;

ALTER TABLE public.oh_spiritual_entities
 ADD COLUMN IF NOT EXISTS pilot_display_order integer NOT NULL DEFAULT 1000;
ALTER TABLE public.oh_tucxa_pilot_person_preferences
 ADD COLUMN IF NOT EXISTS reception_entity_order_mode text NOT NULL DEFAULT 'alphabetical';

create or replace function public.oh_tucxa_pilot_reserve_appointment(
  p_organization_id uuid,
  p_person_id uuid,
  p_entity_id uuid,
  p_appointment_date date,
  p_scheduled_by_person_id uuid,
  p_booking_channel text,
  p_consulente_name text,
  p_whatsapp text,
  p_email text,
  p_notes text,
  p_confirmation_token_hash text,
  p_confirmation_expires_at timestamptz,
  p_appointment_time text default '20:00'
)
returns table (
  appointment_id uuid,
  confirmed_order integer,
  confirmed_capacity integer,
  confirmed_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_weekday text;
  v_occurrence integer;
  v_capacity integer;
  v_available boolean := true;
  v_override_available boolean;
  v_override_capacity integer;
  v_booked integer := 0;
  v_order integer := 1;
  v_id uuid;
begin
  if p_organization_id is null or p_entity_id is null or p_appointment_date is null then
    raise exception using message = 'INVALID_APPOINTMENT_CONTEXT';
  end if;

  v_weekday := case extract(isodow from p_appointment_date)
    when 1 then 'segunda'
    when 2 then 'terca'
    else ''
  end;
  v_occurrence := ((extract(day from p_appointment_date)::integer - 1) / 7) + 1;

  if v_weekday = '' then
    raise exception using message = 'PILOT_DATE_NOT_ALLOWED';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      concat_ws(':', p_organization_id::text, p_entity_id::text, p_appointment_date::text),
      0
    )
  );

  select greatest(1, coalesce(schedule.default_capacity, entity.daily_capacity, 4))
    into v_capacity
  from public.oh_spiritual_entities entity
  left join public.oh_tucxa_pilot_entity_schedule schedule
    on schedule.organization_id=entity.organization_id and schedule.entity_id=entity.id
    and schedule.weekday=v_weekday and schedule.month_occurrence=v_occurrence and schedule.active=true
  where entity.organization_id=p_organization_id and entity.id=p_entity_id
    and entity.active=true and entity.appointment_enabled=true
    and (schedule.entity_id is not null or exists (
      select 1 from public.oh_tucxa_pilot_entity_overrides special
      where special.organization_id=p_organization_id and special.entity_id=p_entity_id
        and special.available=true and p_appointment_date between special.starts_on and special.ends_on))
  limit 1;

  if v_capacity is null then
    raise exception using message = 'PILOT_ENTITY_NOT_SCHEDULED';
  end if;

  select override.available, override.capacity
    into v_override_available, v_override_capacity
  from public.oh_tucxa_pilot_entity_overrides override
  where override.organization_id = p_organization_id
    and override.entity_id = p_entity_id
    and p_appointment_date between override.starts_on and override.ends_on
  order by override.created_at desc
  limit 1;

  if found then
    v_available := coalesce(v_override_available, true);
    v_capacity := greatest(1, coalesce(v_override_capacity, v_capacity));
  end if;

  if coalesce(v_available, true) is not true then
    raise exception using message = 'PILOT_ENTITY_SUSPENDED';
  end if;

  if p_person_id is not null and exists (
    select 1
    from public.oh_consulente_appointments appointment
    where appointment.organization_id = p_organization_id
      and appointment.person_id = p_person_id
      and appointment.appointment_date = p_appointment_date
      and appointment.status in ('solicitado','confirmado','aprovado','presente','concluido')
  ) then
    raise exception using message = 'PILOT_DUPLICATE_PERSON_DATE';
  end if;

  select count(*)::integer
    into v_booked
  from public.oh_consulente_appointments appointment
  where appointment.organization_id = p_organization_id
    and appointment.entity_id = p_entity_id
    and appointment.appointment_date = p_appointment_date
    and appointment.status in ('solicitado','confirmado','aprovado','presente','concluido');

  if v_booked >= greatest(1, v_capacity) then
    raise exception using message = 'PILOT_NO_AVAILABILITY';
  end if;

  select coalesce(max(
    case
      when coalesce(appointment.metadata->>'order', '') ~ '^[0-9]+$'
        then (appointment.metadata->>'order')::integer
      else 0
    end
  ), 0) + 1
    into v_order
  from public.oh_consulente_appointments appointment
  where appointment.organization_id = p_organization_id
    and appointment.entity_id = p_entity_id
    and appointment.appointment_date = p_appointment_date;

  insert into public.oh_consulente_appointments (
    organization_id, person_id, entity_id, scheduled_by_person_id,
    consulente_name, whatsapp, email, appointment_date, appointment_time,
    status, booking_channel, notes, confirmation_status,
    confirmation_token_hash, confirmation_expires_at, metadata
  ) values (
    p_organization_id, p_person_id, p_entity_id, p_scheduled_by_person_id,
    coalesce(nullif(trim(p_consulente_name), ''), 'Filho de Fora/Consulente'),
    nullif(trim(coalesce(p_whatsapp, '')), ''),
    nullif(trim(coalesce(p_email, '')), ''),
    p_appointment_date,
    coalesce(nullif(trim(p_appointment_time), ''), '20:00'),
    'solicitado',
    coalesce(nullif(trim(p_booking_channel), ''), 'piloto'),
    nullif(trim(coalesce(p_notes, '')), ''),
    'pending',
    nullif(trim(coalesce(p_confirmation_token_hash, '')), ''),
    p_confirmation_expires_at,
    jsonb_build_object(
      'pilot', true,
      'order', v_order,
      'confirmed_order', v_order,
      'pilot_month_occurrence', v_occurrence,
      'pilot_weekday', v_weekday
    )
  ) returning id into v_id;

  return query
  select v_id, v_order, greatest(1, v_capacity), 'solicitado'::text;
end;
$$;


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
  FROM public.oh_spiritual_entities e
  LEFT JOIN public.oh_tucxa_pilot_entity_schedule s
    ON s.organization_id=e.organization_id AND s.entity_id=e.id
    AND s.weekday=v_weekday AND s.month_occurrence=v_occurrence AND s.active
  WHERE e.organization_id=p_organization_id AND e.id=p_target_entity_id
    AND e.active AND e.appointment_enabled
    AND (s.entity_id IS NOT NULL OR EXISTS (
      SELECT 1 FROM public.oh_tucxa_pilot_entity_overrides special
      WHERE special.organization_id=p_organization_id AND special.entity_id=p_target_entity_id
        AND special.available=true AND p_target_date BETWEEN special.starts_on AND special.ends_on))
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

-- Protege uso apenas pelo backend com service role.
REVOKE ALL ON FUNCTION public.oh_tucxa_pilot_reserve_appointment(uuid,uuid,uuid,date,uuid,text,text,text,text,text,text,timestamptz,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.oh_tucxa_pilot_reserve_appointment(uuid,uuid,uuid,date,uuid,text,text,text,text,text,text,timestamptz,text) TO service_role;
REVOKE ALL ON FUNCTION public.oh_tucxa_pilot_reschedule_appointment(uuid,uuid,uuid,uuid,date,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.oh_tucxa_pilot_reschedule_appointment(uuid,uuid,uuid,uuid,date,text,timestamptz) TO service_role;
COMMIT;
