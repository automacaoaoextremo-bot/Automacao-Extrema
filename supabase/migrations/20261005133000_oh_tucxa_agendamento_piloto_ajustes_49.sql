-- Organização em Harmonia / TUCXA
-- Agendamento Piloto — Ajustes 49
-- Corrige a ordem ao trocar Entidade: cada agendamento recebe a próxima ordem
-- disponível após a maior ordem ativa da Entidade de destino na mesma data.

-- Corrige grupos ativos que já tenham ordem duplicada. A ordenação preserva
-- primeiro a ordem existente e, em caso de empate, a data de criação/id.
with duplicate_groups as (
  select organization_id, appointment_date, entity_id
  from public.oh_consulente_appointments
  where status in ('solicitado', 'confirmado', 'aprovado', 'presente', 'concluido')
    and coalesce(metadata->>'order', '') ~ '^[0-9]+$'
  group by organization_id, appointment_date, entity_id, (metadata->>'order')::integer
  having count(*) > 1
),
affected_groups as (
  select distinct organization_id, appointment_date, entity_id
  from duplicate_groups
),
ranked as (
  select
    a.id,
    row_number() over (
      partition by a.organization_id, a.appointment_date, a.entity_id
      order by
        case when coalesce(a.metadata->>'order', '') ~ '^[0-9]+$' then (a.metadata->>'order')::integer else 2147483647 end,
        a.created_at,
        a.id
    )::integer as new_order
  from public.oh_consulente_appointments a
  join affected_groups g
    on g.organization_id = a.organization_id
   and g.appointment_date = a.appointment_date
   and g.entity_id = a.entity_id
  where a.status in ('solicitado', 'confirmado', 'aprovado', 'presente', 'concluido')
)
update public.oh_consulente_appointments a
set metadata = coalesce(a.metadata, '{}'::jsonb) || jsonb_build_object(
      'order', r.new_order,
      'confirmed_order', r.new_order,
      'orderRepairedAt', now(),
      'orderRepairVersion', 'ajustes-49'
    ),
    updated_at = now()
from ranked r
where a.id = r.id;

-- Defesa adicional no banco: uma Entidade não pode ter duas ordens ativas
-- iguais na mesma data.
create unique index if not exists oh_consulente_appointments_active_entity_order_uidx
  on public.oh_consulente_appointments (
    organization_id,
    appointment_date,
    entity_id,
    ((metadata->>'order')::integer)
  )
  where status in ('solicitado', 'confirmado', 'aprovado', 'presente', 'concluido')
    and coalesce(metadata->>'order', '') ~ '^[0-9]+$';

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
  v_next_order integer;
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

  -- A ordem da Entidade de origem não acompanha o agendamento para o destino.
  -- O advisory lock acima torna este cálculo e as atualizações atômicos para
  -- organização + Entidade + data, inclusive em trocas simultâneas.
  select coalesce(max(
    case
      when coalesce(a.metadata->>'order', '') ~ '^[0-9]+$'
        then (a.metadata->>'order')::integer
      else 0
    end
  ), 0) + 1
    into v_next_order
  from public.oh_consulente_appointments a
  where a.organization_id = p_organization_id
    and a.entity_id = p_new_entity_id
    and a.appointment_date = v_date
    and a.status in ('solicitado', 'confirmado', 'aprovado', 'presente', 'concluido')
    and not (a.id = any(p_appointment_ids));

  -- Bloqueia e processa cada agendamento dentro da mesma transação da função.
  -- O RETURN NEXT usa explicitamente as variáveis de saída e evita o
  -- RETURNING ambíguo da implementação anterior.
  for v_row in
    select
      a.id,
      a.entity_id as old_entity_id,
      case
        when coalesce(a.metadata->>'order', '') ~ '^[0-9]+$'
          then (a.metadata->>'order')::integer
        else 2147483647
      end as old_order
    from public.oh_consulente_appointments a
    where a.organization_id = p_organization_id
      and a.id = any(p_appointment_ids)
    order by old_order, a.created_at, a.id
    for update
  loop
    update public.oh_consulente_appointments a
       set entity_id = p_new_entity_id,
           metadata = coalesce(a.metadata, '{}'::jsonb) || jsonb_build_object(
             'order', v_next_order,
             'confirmed_order', v_next_order,
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

    v_next_order := v_next_order + 1;
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
) is 'Troca individual/em massa de Entidade com capacidade, auditoria e recálculo atômico da ordem de agendamento no destino. Ajuste 49.';
