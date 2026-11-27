-- TUCXA - AG31 (2026-11-26): corrigir permissao de duas Entidades no mesmo dia.
-- ADITIVA em relacao ao AG30. Nao edita migracoes anteriores nem altera reservas.
-- PRE-REQUISITOS: migracoes AG24, AG29 e AG30 ja aplicadas.
-- Regra: duas Entidades distintas, com ao menos uma autorizada; no maximo duas.
-- O nome fisico pilot_allows_same_day_booking e preservado para compatibilidade.
-- Esta migracao troca a implementacao da RPC e do gatilho num unico COMMIT.
BEGIN;

COMMENT ON COLUMN public.oh_spiritual_entities.pilot_allows_same_day_booking IS
  'AG31: permite combinar atendimento com esta Entidade e OUTRA Entidade diferente, na mesma data. Nunca repeticao na mesma Entidade; maximo dois atendimentos ativos.';

-- AG31: protecao transacional em TODOS os caminhos de escrita (inclusive UPDATE).
-- Regras por pessoa/data: 0 ou 1 reserva livre; 2 somente em Entidades
-- distintas e com pelo menos uma Entidade autorizada; 3 sempre proibidas.
CREATE OR REPLACE FUNCTION public.tucxa_ag24_prevent_duplicate_person_day()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_existing_count integer := 0;
  v_same_entity_count integer := 0;
  v_existing_authorized boolean := false;
  v_new_authorized boolean := false;
BEGIN
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF NEW.person_id IS NULL OR NEW.appointment_date IS NULL OR
     NEW.status NOT IN ('solicitado','confirmado','aprovado','presente','concluido') THEN RETURN NEW; END IF;
  -- Atualizar metadados/status ativo da PROPRIA reserva nao e uma segunda reserva.
  IF TG_OP='UPDATE' AND OLD.status IN ('solicitado','confirmado','aprovado','presente','concluido')
     AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id
     AND NEW.person_id IS NOT DISTINCT FROM OLD.person_id
     AND NEW.appointment_date IS NOT DISTINCT FROM OLD.appointment_date
     AND NEW.entity_id IS NOT DISTINCT FROM OLD.entity_id THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.oh_organizations o
     WHERE o.id=NEW.organization_id AND o.slug='tucxa') THEN RETURN NEW; END IF;

  -- Compartilhado com a RPC. Impede corrida entre duas inclusoes ou alteracoes.
  PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':','ag24',
    NEW.organization_id::text,NEW.person_id::text,NEW.appointment_date::text),0));

  SELECT count(*)::integer,
         count(*) FILTER (WHERE a.entity_id=NEW.entity_id)::integer,
         coalesce(bool_or(coalesce(e.pilot_allows_same_day_booking,false)),false)
    INTO v_existing_count,v_same_entity_count,v_existing_authorized
  FROM public.oh_consulente_appointments a
  LEFT JOIN public.oh_spiritual_entities e
    ON e.id=a.entity_id AND e.organization_id=a.organization_id
  WHERE a.organization_id=NEW.organization_id AND a.person_id=NEW.person_id
    AND a.appointment_date=NEW.appointment_date AND a.id IS DISTINCT FROM NEW.id
    AND a.status IN ('solicitado','confirmado','aprovado','presente','concluido');

  IF v_same_entity_count>0 THEN
    RAISE EXCEPTION USING MESSAGE='PILOT_DUPLICATE_SAME_ENTITY',ERRCODE='23505';
  END IF;
  IF v_existing_count>=2 THEN
    RAISE EXCEPTION USING MESSAGE='PILOT_MAX_TWO_PERSON_DATE',ERRCODE='23505';
  END IF;
  SELECT coalesce(e.pilot_allows_same_day_booking,false) INTO v_new_authorized
  FROM public.oh_spiritual_entities e
  WHERE e.organization_id=NEW.organization_id AND e.id=NEW.entity_id;
  IF v_existing_count>0 AND NOT (coalesce(v_new_authorized,false) OR v_existing_authorized) THEN
    RAISE EXCEPTION USING MESSAGE='PILOT_DUPLICATE_PERSON_DATE',ERRCODE='23505';
  END IF;
  RETURN NEW;
END;
$$;

-- Mantem o gatilho legado e seu nome (aplicado pelo AG30).
DROP TRIGGER IF EXISTS trg_tucxa_ag24_prevent_duplicate_person_day ON public.oh_consulente_appointments;
CREATE TRIGGER trg_tucxa_ag24_prevent_duplicate_person_day
  BEFORE INSERT OR UPDATE OF person_id,appointment_date,entity_id,status,organization_id
  ON public.oh_consulente_appointments FOR EACH ROW
  EXECUTE FUNCTION public.tucxa_ag24_prevent_duplicate_person_day();

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
  v_allows_same_day boolean := false;
  v_existing_count integer := 0;
  v_existing_authorized boolean := false;
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

  -- AG31: a flag permite combinar esta Entidade com OUTRA no mesmo dia.
  -- Nunca permite duas reservas na propria Entidade nem uma terceira reserva.
  -- A ordem das reservas nao influencia a permissao.
  select coalesce(e.pilot_allows_same_day_booking,false) into v_allows_same_day
  from public.oh_spiritual_entities e
  where e.organization_id=p_organization_id and e.id=p_entity_id;
  if p_person_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(
      concat_ws(':','ag24',p_organization_id::text,p_person_id::text,p_appointment_date::text),0));
    if exists (select 1 from public.oh_consulente_appointments a
       where a.organization_id=p_organization_id and a.person_id=p_person_id
       and a.appointment_date=p_appointment_date and a.entity_id=p_entity_id
       and a.status in ('solicitado','confirmado','aprovado','presente','concluido')) then
      raise exception using message='PILOT_DUPLICATE_SAME_ENTITY',errcode='23505';
    end if;
    select count(*), coalesce(bool_or(coalesce(e.pilot_allows_same_day_booking,false)),false)
      into v_existing_count, v_existing_authorized
    from public.oh_consulente_appointments a
    left join public.oh_spiritual_entities e
      on e.organization_id=a.organization_id and e.id=a.entity_id
    where a.organization_id=p_organization_id and a.person_id=p_person_id
      and a.appointment_date=p_appointment_date
      and a.status in ('solicitado','confirmado','aprovado','presente','concluido');
    if v_existing_count >= 2 then
      raise exception using message='PILOT_MAX_TWO_PERSON_DATE',errcode='23505';
    end if;
    if v_existing_count > 0 and not (v_allows_same_day or v_existing_authorized) then
      raise exception using message='PILOT_DUPLICATE_PERSON_DATE',errcode='23505';
    end if;
    -- Protecao de servidor tambem na RPC. Restricao de Cavalinho nao e
    -- removida pela autorizacao individual de Filho da Corrente.
    if exists (select 1 from public.oh_person_entity_links l
       where l.organization_id=p_organization_id and l.person_id=p_person_id and l.active=true) then
      raise exception using message='PILOT_ENTITY_PERSON_NOT_ALLOWED',errcode='23514';
    end if;
    if exists (select 1 from public.oh_memberships mm
        join public.oh_roles rr on rr.id=mm.role_id and rr.organization_id=mm.organization_id
       where mm.organization_id=p_organization_id and mm.person_id=p_person_id
         and mm.active=true and mm.status in ('ativo','active')
         and (rr.slug in ('filho-da-corrente','filho-corrente')
           or lower(mm.agenda_viva_profile::text) like '%filho-da-corrente%'))
        and not exists (select 1 from public.oh_tucxa_pilot_person_preferences pf
          where pf.organization_id=p_organization_id and pf.person_id=p_person_id
            and pf.allow_filho_corrente_booking=true) then
      raise exception using message='PILOT_FDC_NOT_ALLOWED',errcode='23514';
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
