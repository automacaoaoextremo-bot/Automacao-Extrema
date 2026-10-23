-- TUCXA V2-03: prioridades exclusivas por organização, data e entidade.
-- Executar somente em homologação primeiro. Fazer backup antes de Production.
BEGIN;
ALTER TABLE public.oh_consulente_appointments ADD COLUMN IF NOT EXISTS priority_order integer;
-- Migração retrocompatível das marcações booleanas. Havendo mais de uma,
-- gera posições consecutivas determinísticas dentro de cada Entidade/data.
WITH legacy AS (
 SELECT id, ROW_NUMBER() OVER (PARTITION BY organization_id, appointment_date, entity_id ORDER BY created_at,id)::integer n
 FROM public.oh_consulente_appointments
 WHERE status <> 'cancelado' AND priority_order IS NULL AND metadata->>'priority_first_service' = 'true'
)
UPDATE public.oh_consulente_appointments a SET priority_order=legacy.n
FROM legacy WHERE a.id=legacy.id;
UPDATE public.oh_consulente_appointments SET arrival_order=NULL WHERE priority_order > 0 AND arrival_order IS NOT NULL;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='oh_tucxa_service_priority_valid') THEN
  ALTER TABLE public.oh_consulente_appointments ADD CONSTRAINT oh_tucxa_service_priority_valid
   CHECK (priority_order IS NULL OR priority_order BETWEEN 1 AND 999);
 END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_oh_tucxa_priority_unique
 ON public.oh_consulente_appointments (organization_id,appointment_date,entity_id,priority_order)
 WHERE priority_order IS NOT NULL AND status <> 'cancelado';
-- Guarda de integridade: priorizado nunca recebe ordem comum, inclusive por outras APIs.
CREATE OR REPLACE FUNCTION public.oh_tucxa_priority_arrival_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.priority_order IS NOT NULL AND NEW.priority_order > 0 THEN
    NEW.arrival_order := NULL;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_oh_tucxa_priority_arrival_guard ON public.oh_consulente_appointments;
CREATE TRIGGER trg_oh_tucxa_priority_arrival_guard
 BEFORE INSERT OR UPDATE ON public.oh_consulente_appointments
 FOR EACH ROW EXECUTE FUNCTION public.oh_tucxa_priority_arrival_guard();

-- Alteração numérica atômica: bloqueia o agendamento, verifica encerramento,
-- obtém lock por Entidade/data e impede posição repetida.
CREATE OR REPLACE FUNCTION public.oh_tucxa_pilot_set_service_priority(
 p_organization_id uuid, p_appointment_id uuid, p_actor_person_id uuid, p_priority integer
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_date date; v_entity uuid; v_status text; v_forwarded timestamptz;
BEGIN
 IF p_priority IS NULL OR p_priority < 0 OR p_priority > 999 OR p_actor_person_id IS NULL THEN
  RAISE EXCEPTION USING MESSAGE='INVALID_SERVICE_PRIORITY';
 END IF;
 SELECT appointment_date,entity_id,status,forwarded_at INTO v_date,v_entity,v_status,v_forwarded
 FROM public.oh_consulente_appointments
 WHERE organization_id=p_organization_id AND id=p_appointment_id FOR UPDATE;
 IF NOT FOUND OR v_status='cancelado' THEN RAISE EXCEPTION USING MESSAGE='APPOINTMENT_NOT_FOUND'; END IF;
 IF v_forwarded IS NOT NULL THEN RAISE EXCEPTION USING MESSAGE='PRIORITY_ALREADY_FORWARDED'; END IF;
 IF EXISTS (SELECT 1 FROM public.oh_tucxa_pilot_day_closures
   WHERE organization_id=p_organization_id AND appointment_date=v_date AND stage='forwarding') THEN
  RAISE EXCEPTION USING MESSAGE='FORWARDING_FINALIZED';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(concat_ws(':',p_organization_id::text,v_date::text,v_entity::text,'service_priority'),0));
 IF p_priority > 0 AND EXISTS (
  SELECT 1 FROM public.oh_consulente_appointments
  WHERE organization_id=p_organization_id AND appointment_date=v_date AND entity_id=v_entity
    AND priority_order=p_priority AND id<>p_appointment_id AND status<>'cancelado'
 ) THEN RAISE EXCEPTION USING MESSAGE='PRIORITY_IN_USE'; END IF;
 UPDATE public.oh_consulente_appointments SET
  priority_order=NULLIF(p_priority,0),
  metadata=jsonb_set(jsonb_set(COALESCE(metadata,'{}'::jsonb),'{priority_first_service}',to_jsonb(p_priority>0),true),
    '{priority_first_service_updated_by}',to_jsonb(p_actor_person_id::text),true),
  arrival_order=CASE WHEN p_priority>0 THEN NULL ELSE arrival_order END,
  updated_at=now()
 WHERE organization_id=p_organization_id AND id=p_appointment_id;
 RETURN p_priority;
END; $$;
REVOKE ALL ON FUNCTION public.oh_tucxa_pilot_set_service_priority(uuid,uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.oh_tucxa_pilot_set_service_priority(uuid,uuid,uuid,integer) TO service_role;

-- Recria RPCs mantendo assinatura, com isenção de ordem para prioritários.
create or replace function public.oh_tucxa_pilot_mark_arrival(
  p_organization_id uuid,
  p_appointment_id uuid,
  p_actor_person_id uuid,
  p_arrival_status text
)
returns table (
  appointment_id uuid,
  confirmed_arrival_status text,
  confirmed_arrival_order integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
  v_entity_id uuid;
  v_existing_status text;
  v_existing_order integer;
  v_order integer;
  v_priority integer;
  v_status text := lower(trim(coalesce(p_arrival_status, '')));
begin
  if v_status not in ('arrived','absent','pending') then
    raise exception using message = 'INVALID_ARRIVAL_STATUS';
  end if;

  select appointment_date, entity_id, arrival_status, arrival_order, priority_order
    into v_date, v_entity_id, v_existing_status, v_existing_order, v_priority
  from public.oh_consulente_appointments
  where id = p_appointment_id
    and organization_id = p_organization_id
  for update;

  if v_date is null then
    raise exception using message = 'APPOINTMENT_NOT_FOUND';
  end if;

  if v_status = 'arrived' and coalesce(v_priority,0) > 0 then
    v_order := null;  -- prioridade não ocupa posição na ordem comum
  elsif v_status = 'arrived' then
    if v_entity_id is null then
      raise exception using message = 'APPOINTMENT_ENTITY_NOT_FOUND';
    end if;

    -- Repetir "Chegou" no mesmo registro é idempotente: mantém a ordem já atribuída.
    if lower(trim(coalesce(v_existing_status, ''))) = 'arrived'
       and v_existing_order is not null
       and v_existing_order > 0 then
      v_order := v_existing_order;
    else
      -- Serializa somente a MESMA data/Entidade.
      perform pg_advisory_xact_lock(
        hashtextextended(
          concat_ws(':', p_organization_id::text, v_date::text, v_entity_id::text, 'arrival'),
          0
        )
      );

      select coalesce(max(arrival_order), 0) + 1
        into v_order
      from public.oh_consulente_appointments
      where organization_id = p_organization_id
        and appointment_date = v_date
        and entity_id = v_entity_id
        and arrival_status = 'arrived';
    end if;
  else
    v_order := null;
  end if;

  update public.oh_consulente_appointments
  set arrival_status = v_status,
      arrived_at = case when v_status = 'arrived' then coalesce(arrived_at, now()) else null end,
      arrival_order = v_order,
      arrival_registered_by_person_id = case when v_status = 'pending' then null else p_actor_person_id end,
      status = case
        when v_status = 'arrived' and status in ('solicitado','confirmado','aprovado','ausente') then 'presente'
        when v_status = 'absent' and status not in ('cancelado','concluido') then 'ausente'
        when v_status = 'pending' and status in ('presente','ausente') and confirmation_status = 'confirmed' then 'confirmado'
        when v_status = 'pending' and status in ('presente','ausente') then 'solicitado'
        else status
      end,
      updated_at = now()
  where id = p_appointment_id
    and organization_id = p_organization_id;

  return query
  select p_appointment_id, v_status, v_order;
end;
$$;

create or replace function public.oh_tucxa_pilot_set_arrival_order(
  p_organization_id uuid,
  p_appointment_id uuid,
  p_actor_person_id uuid,
  p_arrival_order integer
)
returns table (
  appointment_id uuid,
  confirmed_arrival_status text,
  confirmed_arrival_order integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
  v_entity_id uuid;
  v_priority integer;
begin
  if p_arrival_order is null or p_arrival_order < 1 then
    raise exception using message = 'INVALID_ARRIVAL_ORDER';
  end if;

  select appointment_date, entity_id, priority_order
    into v_date, v_entity_id, v_priority
  from public.oh_consulente_appointments
  where id = p_appointment_id
    and organization_id = p_organization_id
  for update;

  if coalesce(v_priority,0) > 0 then
    raise exception using message = 'PRIORITY_HAS_NO_COMMON_ARRIVAL_ORDER';
  end if;

  if v_date is null then
    raise exception using message = 'APPOINTMENT_NOT_FOUND';
  end if;

  if v_entity_id is null then
    raise exception using message = 'APPOINTMENT_ENTITY_NOT_FOUND';
  end if;

  -- Serializa apenas alterações da MESMA data/Entidade. Entidades distintas
  -- podem usar a mesma ordem de atendimento sem conflito.
  perform pg_advisory_xact_lock(
    hashtextextended(
      concat_ws(':', p_organization_id::text, v_date::text, v_entity_id::text, 'arrival'),
      0
    )
  );

  if exists (
    select 1
    from public.oh_consulente_appointments
    where organization_id = p_organization_id
      and appointment_date = v_date
      and entity_id = v_entity_id
      and arrival_status = 'arrived'
      and arrival_order = p_arrival_order
      and id <> p_appointment_id
  ) then
    raise exception using message = 'ARRIVAL_ORDER_IN_USE';
  end if;

  update public.oh_consulente_appointments
  set arrival_status = 'arrived',
      arrived_at = coalesce(arrived_at, now()),
      arrival_order = p_arrival_order,
      arrival_registered_by_person_id = p_actor_person_id,
      status = case
        when status in ('solicitado','confirmado','aprovado') then 'presente'
        else status
      end,
      updated_at = now()
  where id = p_appointment_id
    and organization_id = p_organization_id;

  return query
  select p_appointment_id, 'arrived'::text, p_arrival_order;
end;
$$;

REVOKE ALL ON FUNCTION public.oh_tucxa_pilot_mark_arrival(uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.oh_tucxa_pilot_mark_arrival(uuid,uuid,uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.oh_tucxa_pilot_set_arrival_order(uuid,uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.oh_tucxa_pilot_set_arrival_order(uuid,uuid,uuid,integer) TO service_role;
COMMIT;
