-- Organização em Harmonia / TUCXA
-- Agendamento Piloto — Ajustes 24
-- Corrige a execução da troca de Entidade evitando ambiguidades no RETURNING
-- da função criada no Ajuste 22. Mantém capacidade, auditoria e atomicidade.

create or replace function public.oh_tucxa_change_appointment_entity(
  p_organization_id uuid,
  p_appointment_ids uuid[],
  p_new_entity_id uuid,
  p_changed_by_person_id uuid,
  p_reason text,
  p_change_mode text default 'individual',
  p_attachment_path text default null,
  p_attachment_name text default null,
  p_attachment_type text default null
)
returns table (appointment_id uuid, previous_entity_id uuid, new_entity_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
  v_weekday text;
  v_occurrence integer;
  v_capacity integer;
  v_override_available boolean;
  v_override_capacity integer;
  v_existing integer;
  v_moving integer;
  v_row record;
begin
  if p_organization_id is null or p_new_entity_id is null
     or coalesce(array_length(p_appointment_ids, 1), 0) = 0 then
    raise exception using message = 'INVALID_APPOINTMENT_CONTEXT';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception using message = 'CHANGE_REASON_REQUIRED';
  end if;

  if coalesce(p_change_mode, '') not in ('individual', 'bulk') then
    raise exception using message = 'INVALID_CHANGE_MODE';
  end if;

  select min(a.appointment_date), count(*)::integer
    into v_date, v_moving
  from public.oh_consulente_appointments a
  where a.organization_id = p_organization_id
    and a.id = any(p_appointment_ids)
    and a.status <> 'cancelado';

  if v_moving <> array_length(p_appointment_ids, 1) then
    raise exception using message = 'APPOINTMENT_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.oh_consulente_appointments a
    where a.organization_id = p_organization_id
      and a.id = any(p_appointment_ids)
      and a.appointment_date <> v_date
  ) then
    raise exception using message = 'MULTIPLE_DATES_NOT_ALLOWED';
  end if;

  if exists (
    select 1
    from public.oh_consulente_appointments a
    where a.organization_id = p_organization_id
      and a.id = any(p_appointment_ids)
      and a.entity_id = p_new_entity_id
  ) then
    raise exception using message = 'SAME_ENTITY_NOT_ALLOWED';
  end if;

  v_weekday := case extract(isodow from v_date)
    when 1 then 'segunda'
    when 2 then 'terca'
    else ''
  end;
  v_occurrence := ((extract(day from v_date)::integer - 1) / 7) + 1;

  perform pg_advisory_xact_lock(
    hashtextextended(concat_ws(':', p_organization_id::text, p_new_entity_id::text, v_date::text), 0)
  );

  select greatest(1, coalesce(s.default_capacity, e.daily_capacity, 4))
    into v_capacity
  from public.oh_tucxa_pilot_entity_schedule s
  join public.oh_spiritual_entities e
    on e.id = s.entity_id
   and e.organization_id = s.organization_id
  where s.organization_id = p_organization_id
    and s.entity_id = p_new_entity_id
    and s.weekday = v_weekday
    and s.month_occurrence = v_occurrence
    and s.active = true
    and e.active = true
    and e.appointment_enabled = true
  limit 1;

  if v_capacity is null then
    raise exception using message = 'PILOT_ENTITY_NOT_SCHEDULED';
  end if;

  select o.available, o.capacity
    into v_override_available, v_override_capacity
  from public.oh_tucxa_pilot_entity_overrides o
  where o.organization_id = p_organization_id
    and o.entity_id = p_new_entity_id
    and v_date between o.starts_on and o.ends_on
  order by o.created_at desc
  limit 1;

  if found then
    if coalesce(v_override_available, true) is not true then
      raise exception using message = 'PILOT_ENTITY_SUSPENDED';
    end if;
    v_capacity := greatest(1, coalesce(v_override_capacity, v_capacity));
  end if;

  select count(*)::integer
    into v_existing
  from public.oh_consulente_appointments a
  where a.organization_id = p_organization_id
    and a.entity_id = p_new_entity_id
    and a.appointment_date = v_date
    and a.status in ('solicitado', 'confirmado', 'aprovado', 'presente', 'concluido')
    and not (a.id = any(p_appointment_ids));

  if v_existing + v_moving > v_capacity then
    raise exception using message = 'PILOT_NO_AVAILABILITY';
  end if;

  -- Bloqueia e processa cada agendamento dentro da mesma transação da função.
  -- O RETURN NEXT usa explicitamente as variáveis de saída e evita o
  -- RETURNING ambíguo da implementação anterior.
  for v_row in
    select a.id, a.entity_id as old_entity_id
    from public.oh_consulente_appointments a
    where a.organization_id = p_organization_id
      and a.id = any(p_appointment_ids)
    order by a.id
    for update
  loop
    update public.oh_consulente_appointments a
       set entity_id = p_new_entity_id,
           metadata = coalesce(a.metadata, '{}'::jsonb) || jsonb_build_object(
             'changedEntityAt', now(),
             'changedEntityByPersonId', p_changed_by_person_id,
             'changedEntityReason', trim(p_reason),
             'changedEntityMode', p_change_mode
           ),
           updated_at = now()
     where a.id = v_row.id
       and a.organization_id = p_organization_id;

    insert into public.oh_tucxa_appointment_entity_changes (
      organization_id,
      appointment_id,
      previous_entity_id,
      new_entity_id,
      reason,
      change_mode,
      changed_by_person_id,
      attachment_path,
      attachment_name,
      attachment_type
    ) values (
      p_organization_id,
      v_row.id,
      v_row.old_entity_id,
      p_new_entity_id,
      trim(p_reason),
      p_change_mode,
      p_changed_by_person_id,
      p_attachment_path,
      p_attachment_name,
      p_attachment_type
    );

    appointment_id := v_row.id;
    previous_entity_id := v_row.old_entity_id;
    new_entity_id := p_new_entity_id;
    return next;
  end loop;
end;
$$;

revoke all on function public.oh_tucxa_change_appointment_entity(
  uuid, uuid[], uuid, uuid, text, text, text, text, text
) from public;

grant execute on function public.oh_tucxa_change_appointment_entity(
  uuid, uuid[], uuid, uuid, text, text, text, text, text
) to service_role;

comment on function public.oh_tucxa_change_appointment_entity(
  uuid, uuid[], uuid, uuid, text, text, text, text, text
) is 'Troca individual/em massa de Entidade com validação de capacidade e auditoria. Ajuste 24 elimina ambiguidade do RETURNING da versão anterior.';
