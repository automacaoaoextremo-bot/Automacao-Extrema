-- Organização em Harmonia / TUCXA
-- Piloto de agendamentos — Ajuste 60 (09/10/2026)
--
-- Corrige a geração automática da ordem do botão "Chegou".
-- A ordem de chegada passa a ser exclusiva por:
--   ORGANIZAÇÃO + DATA + ENTIDADE
--
-- Assim, cada Entidade possui sua própria sequência 1, 2, 3... na mesma data.
-- A função manual do Caderno (oh_tucxa_pilot_set_arrival_order) já seguia
-- esta regra desde o Ajuste 52; este arquivo alinha o botão "Chegou" à mesma lógica.

begin;

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
  v_status text := lower(trim(coalesce(p_arrival_status, '')));
begin
  if v_status not in ('arrived','absent','pending') then
    raise exception using message = 'INVALID_ARRIVAL_STATUS';
  end if;

  select appointment_date, entity_id, arrival_status, arrival_order
    into v_date, v_entity_id, v_existing_status, v_existing_order
  from public.oh_consulente_appointments
  where id = p_appointment_id
    and organization_id = p_organization_id
  for update;

  if v_date is null then
    raise exception using message = 'APPOINTMENT_NOT_FOUND';
  end if;

  if v_status = 'arrived' then
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

revoke all on function public.oh_tucxa_pilot_mark_arrival(uuid, uuid, uuid, text) from public;
grant execute on function public.oh_tucxa_pilot_mark_arrival(uuid, uuid, uuid, text) to service_role;

-- Índice já criado no Ajuste 52; mantido idempotente para ambientes antigos.
create index if not exists idx_oh_consulente_appointments_arrival_entity
  on public.oh_consulente_appointments
    (organization_id, appointment_date, entity_id, arrival_status, arrival_order);

commit;
