-- TUCXA AG29 - exclusivo para o piloto TUCXA. Homologar e fazer backup antes de Production.
-- Itens: dois atendimentos somente com complemento médico, exclusao REAL de vinculos,
-- e proxima ordem de chegada na Entidade de destino apos "Chegou".
BEGIN;

ALTER TABLE public.oh_spiritual_entities
  ADD COLUMN IF NOT EXISTS pilot_requires_companion_booking boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.oh_spiritual_entities.pilot_requires_companion_booking IS
 'AG29: atendimento complementar medico, exige outro agendamento regular ativo na mesma data.';

-- Somente as duas Entidades indicadas, sem habilitar indiscriminadamente a linha inteira.
-- Conferir o diagnostico antes de aplicar: os nomes devem corresponder a Dr. Alexandre e Dr. Augusto.
UPDATE public.oh_spiritual_entities e SET
  pilot_requires_companion_booking=true,
  pilot_allows_nondefault_booking=true
FROM public.oh_organizations o
WHERE e.organization_id=o.id AND o.slug='tucxa'
  AND (e.name ~* '^dr[.]? *alexandre' OR e.name ~* '^dr[.]? *augusto');

-- O controle de duplicidade AG24 é substituído preservando o lock por pessoa/data.
CREATE OR REPLACE FUNCTION public.tucxa_ag24_prevent_duplicate_person_day()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_is_medical boolean := false;
  v_regular_count integer := 0;
  v_medical_count integer := 0;
  v_old_medical boolean := false;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.person_id IS NOT NULL
     AND OLD.appointment_date IS NOT NULL
     AND OLD.status IN ('solicitado','confirmado','aprovado','presente','concluido') THEN
    -- Uma reserva regular não pode ser removida/movida se deixar sem base a médica.
    IF TG_OP='DELETE' OR (TG_OP='UPDATE' AND (
        NEW.person_id IS DISTINCT FROM OLD.person_id
        OR NEW.appointment_date IS DISTINCT FROM OLD.appointment_date
        OR (NEW.entity_id IS DISTINCT FROM OLD.entity_id AND EXISTS (
          SELECT 1 FROM public.oh_spiritual_entities e
          WHERE e.id=NEW.entity_id AND e.pilot_requires_companion_booking=true))
        OR NEW.status NOT IN ('solicitado','confirmado','aprovado','presente','concluido'))) THEN
      IF EXISTS (SELECT 1 FROM public.oh_organizations o WHERE o.id=OLD.organization_id AND o.slug='tucxa') THEN
        PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':','ag24',OLD.organization_id::text,OLD.person_id::text,OLD.appointment_date::text),0));
        SELECT coalesce(e.pilot_requires_companion_booking,false) INTO v_old_medical
        FROM public.oh_spiritual_entities e WHERE e.id=OLD.entity_id;
        IF NOT v_old_medical AND EXISTS (
          SELECT 1 FROM public.oh_consulente_appointments a
          JOIN public.oh_spiritual_entities e ON e.id=a.entity_id
          WHERE a.organization_id=OLD.organization_id AND a.person_id=OLD.person_id
            AND a.appointment_date=OLD.appointment_date AND a.id<>OLD.id
            AND a.status IN ('solicitado','confirmado','aprovado','presente','concluido')
            AND e.pilot_requires_companion_booking=true
        ) AND NOT EXISTS (
          SELECT 1 FROM public.oh_consulente_appointments a
          JOIN public.oh_spiritual_entities e ON e.id=a.entity_id
          WHERE a.organization_id=OLD.organization_id AND a.person_id=OLD.person_id
            AND a.appointment_date=OLD.appointment_date AND a.id<>OLD.id
            AND a.status IN ('solicitado','confirmado','aprovado','presente','concluido')
            AND e.pilot_requires_companion_booking=false
        ) THEN RAISE EXCEPTION USING MESSAGE='PILOT_MEDICAL_COMPANION_CANNOT_REMOVE',ERRCODE='23514'; END IF;
      END IF;
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF NEW.appointment_date IS NULL OR NEW.status NOT IN ('solicitado','confirmado','aprovado','presente','concluido') THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.oh_organizations o WHERE o.id=NEW.organization_id AND o.slug='tucxa') THEN RETURN NEW; END IF;
  IF NEW.person_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.oh_spiritual_entities e WHERE e.id=NEW.entity_id AND e.pilot_requires_companion_booking) THEN
      RAISE EXCEPTION USING MESSAGE='PILOT_MEDICAL_COMPANION_REQUIRED',ERRCODE='23514';
    END IF;
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':','ag24',NEW.organization_id::text,NEW.person_id::text,NEW.appointment_date::text),0));
  SELECT coalesce(e.pilot_requires_companion_booking,false) INTO v_is_medical
  FROM public.oh_spiritual_entities e WHERE e.organization_id=NEW.organization_id AND e.id=NEW.entity_id;
  IF v_is_medical AND NOT (
    (extract(isodow from NEW.appointment_date)=1 AND EXISTS (SELECT 1 FROM public.oh_spiritual_entities e WHERE e.id=NEW.entity_id AND e.name ~* '^dr[.]? *alexandre'))
    OR (extract(isodow from NEW.appointment_date)=2 AND EXISTS (SELECT 1 FROM public.oh_spiritual_entities e WHERE e.id=NEW.entity_id AND e.name ~* '^dr[.]? *augusto'))
  ) THEN RAISE EXCEPTION USING MESSAGE='PILOT_MEDICAL_WEEKDAY_INVALID',ERRCODE='23514'; END IF;
  SELECT count(*) FILTER (WHERE NOT coalesce(e.pilot_requires_companion_booking,false)),
         count(*) FILTER (WHERE coalesce(e.pilot_requires_companion_booking,false))
    INTO v_regular_count,v_medical_count
  FROM public.oh_consulente_appointments a
  JOIN public.oh_spiritual_entities e ON e.id=a.entity_id AND e.organization_id=a.organization_id
  WHERE a.organization_id=NEW.organization_id AND a.person_id=NEW.person_id
    AND a.appointment_date=NEW.appointment_date AND a.id IS DISTINCT FROM NEW.id
    AND a.status IN ('solicitado','confirmado','aprovado','presente','concluido');
  IF v_is_medical THEN
    IF v_regular_count<>1 THEN RAISE EXCEPTION USING MESSAGE='PILOT_MEDICAL_COMPANION_REQUIRED',ERRCODE='23514'; END IF;
    IF v_medical_count>0 THEN RAISE EXCEPTION USING MESSAGE='PILOT_DUPLICATE_PERSON_DATE',ERRCODE='23505'; END IF;
  ELSIF v_regular_count>0 OR (v_medical_count>0 AND NOT (
      TG_OP='UPDATE' AND OLD.person_id IS NOT DISTINCT FROM NEW.person_id
      AND OLD.appointment_date IS NOT DISTINCT FROM NEW.appointment_date
      AND NOT EXISTS (SELECT 1 FROM public.oh_spiritual_entities e
        WHERE e.id=OLD.entity_id AND e.pilot_requires_companion_booking=true)
      AND OLD.status IN ('solicitado','confirmado','aprovado','presente','concluido')
    )) THEN
    -- Alteração do próprio agendamento-base continua permitida mesmo com médico associado.
    -- Inserir uma segunda reserva não médica permanece proibido.
    RAISE EXCEPTION USING MESSAGE='PILOT_DUPLICATE_PERSON_DATE',ERRCODE='23505';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_tucxa_ag24_prevent_duplicate_person_day ON public.oh_consulente_appointments;
CREATE TRIGGER trg_tucxa_ag24_prevent_duplicate_person_day
 BEFORE INSERT OR UPDATE OF person_id,appointment_date,entity_id,status OR DELETE
 ON public.oh_consulente_appointments FOR EACH ROW
 EXECUTE FUNCTION public.tucxa_ag24_prevent_duplicate_person_day();

-- Ao trocar uma pessoa que já chegou: nova ordem do DESTINO, sem tocar na ordem
-- de chegada histórica da origem e sem sobrepor a prioridade de atendimento.
CREATE OR REPLACE FUNCTION public.tucxa_ag29_transfer_arrival_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_next integer;
BEGIN
  IF NEW.entity_id IS NOT DISTINCT FROM OLD.entity_id THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.oh_organizations o WHERE o.id=NEW.organization_id AND o.slug='tucxa') THEN RETURN NEW; END IF;
  IF coalesce(NEW.arrival_status,'')<>'arrived' THEN RETURN NEW; END IF;
  IF coalesce(NEW.priority_order,0)>0 THEN NEW.arrival_order:=NULL; RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':',NEW.organization_id::text,NEW.appointment_date::text,NEW.entity_id::text,'arrival'),0));
  SELECT coalesce(max(a.arrival_order),0)+1 INTO v_next
  FROM public.oh_consulente_appointments a
  WHERE a.organization_id=NEW.organization_id AND a.appointment_date=NEW.appointment_date
    AND a.entity_id=NEW.entity_id AND a.arrival_status='arrived' AND a.id<>NEW.id;
  NEW.metadata:=coalesce(NEW.metadata,'{}'::jsonb) || jsonb_build_object(
    'ag29PreviousArrivalOrder',OLD.arrival_order,'ag29ArrivalTransferredAt',now(),
    'ag29ArrivalEntityFrom',OLD.entity_id::text,'ag29ArrivalEntityTo',NEW.entity_id::text);
  NEW.arrival_order:=v_next;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_tucxa_ag29_transfer_arrival_order ON public.oh_consulente_appointments;
CREATE TRIGGER trg_tucxa_ag29_transfer_arrival_order
 BEFORE UPDATE OF entity_id ON public.oh_consulente_appointments
 FOR EACH ROW EXECUTE FUNCTION public.tucxa_ag29_transfer_arrival_order();

-- Remoção física e recíproca somente da associação, não de pessoas ou reservas.
CREATE OR REPLACE FUNCTION public.oh_tucxa_ag29_delete_relationship(
 p_organization_id uuid,p_owner_person_id uuid,p_relationship_id uuid
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_related uuid; v_deleted integer:=0; v_mirror integer:=0;
BEGIN
  SELECT related_person_id INTO v_related FROM public.oh_tucxa_consulente_relationships
  WHERE id=p_relationship_id AND organization_id=p_organization_id
    AND owner_person_id=p_owner_person_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF v_related IS NOT NULL THEN
    DELETE FROM public.oh_tucxa_consulente_relationships
    WHERE organization_id=p_organization_id AND owner_person_id=v_related
      AND related_person_id=p_owner_person_id;
    GET DIAGNOSTICS v_mirror=ROW_COUNT;
  END IF;
  DELETE FROM public.oh_tucxa_consulente_relationships
  WHERE id=p_relationship_id AND organization_id=p_organization_id AND owner_person_id=p_owner_person_id;
  GET DIAGNOSTICS v_deleted=ROW_COUNT;
  RETURN v_deleted+v_mirror;
END; $$;
REVOKE ALL ON FUNCTION public.oh_tucxa_ag29_delete_relationship(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.oh_tucxa_ag29_delete_relationship(uuid,uuid,uuid) TO service_role;

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
  v_is_medical boolean := false;
  v_has_regular boolean := false;
  v_has_medical boolean := false;
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

  -- AG29: somente um atendimento regular + um atendimento da linha médica.
  -- Lock de pessoa/data compartilhado com a proteção do gatilho.
  select coalesce(e.pilot_requires_companion_booking,false) into v_is_medical
  from public.oh_spiritual_entities e where e.organization_id=p_organization_id and e.id=p_entity_id;
  if v_is_medical and p_person_id is null then
    raise exception using message='PILOT_MEDICAL_COMPANION_REQUIRED';
  end if;
  if p_person_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(
      concat_ws(':','ag24',p_organization_id::text,p_person_id::text,p_appointment_date::text),0));
    if v_is_medical and (
      (extract(isodow from p_appointment_date)=1 and not exists (
        select 1 from public.oh_spiritual_entities e where e.id=p_entity_id and e.name ~* '^dr[.]? *alexandre'))
      or (extract(isodow from p_appointment_date)=2 and not exists (
        select 1 from public.oh_spiritual_entities e where e.id=p_entity_id and e.name ~* '^dr[.]? *augusto'))
      or extract(isodow from p_appointment_date) not in (1,2)
    ) then raise exception using message='PILOT_MEDICAL_WEEKDAY_INVALID'; end if;
    select exists (
      select 1 from public.oh_consulente_appointments a
      join public.oh_spiritual_entities e on e.id=a.entity_id and e.organization_id=a.organization_id
      where a.organization_id=p_organization_id and a.person_id=p_person_id
        and a.appointment_date=p_appointment_date
        and a.status in ('solicitado','confirmado','aprovado','presente','concluido')
        and not coalesce(e.pilot_requires_companion_booking,false)
    ), exists (
      select 1 from public.oh_consulente_appointments a
      join public.oh_spiritual_entities e on e.id=a.entity_id and e.organization_id=a.organization_id
      where a.organization_id=p_organization_id and a.person_id=p_person_id
        and a.appointment_date=p_appointment_date
        and a.status in ('solicitado','confirmado','aprovado','presente','concluido')
        and coalesce(e.pilot_requires_companion_booking,false)
    ) into v_has_regular,v_has_medical;
    if v_is_medical and not v_has_regular then
      raise exception using message='PILOT_MEDICAL_COMPANION_REQUIRED';
    elsif (v_is_medical and v_has_medical) or (not v_is_medical and v_has_regular) then
      raise exception using message='PILOT_DUPLICATE_PERSON_DATE';
    end if;
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

REVOKE ALL ON FUNCTION public.oh_tucxa_pilot_reserve_appointment(uuid,uuid,uuid,date,uuid,text,text,text,text,text,text,timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.oh_tucxa_pilot_reserve_appointment(uuid,uuid,uuid,date,uuid,text,text,text,text,text,text,timestamptz,text) TO service_role;
COMMIT;
