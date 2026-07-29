-- Organização em Harmonia / TUCXA
-- Funções autorizadas para quarta-feira, séries recorrentes e vínculos Cavalinho–Entidade.
-- Migration aditiva e idempotente.

alter table if exists public.oh_consulente_appointments
  add column if not exists recurrence_count integer not null default 1,
  add column if not exists series_id uuid,
  add column if not exists recurrence_sequence integer,
  add column if not exists recurrence_total integer,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text;

create index if not exists idx_oh_consulente_appointments_series_date
  on public.oh_consulente_appointments (
    organization_id,
    series_id,
    appointment_date,
    status
  )
  where series_id is not null;

create index if not exists idx_oh_person_entity_links_consultation_scope
  on public.oh_person_entity_links (
    organization_id,
    person_id,
    relationship_type,
    active,
    entity_id
  );

-- Garante que as configurações atuais tenham as novas chaves sem remover valores existentes.
with tucxa as (
  select id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by created_at asc
  limit 1
), reception_roles as (
  select
    role.organization_id,
    coalesce(jsonb_agg(role.id order by role.name), '[]'::jsonb) as role_ids
  from public.oh_roles role
  join tucxa on tucxa.id = role.organization_id
  where role.active = true
    and regexp_replace(
          lower(translate(coalesce(role.slug, '') || ' ' || coalesce(role.name, ''),
            'áàâãäéèêëíìîïóòôõöúùûüç',
            'aaaaaeeeeiiiiooooouuuuc')),
          '[^a-z0-9]+',
          '',
          'g'
        ) like '%recepc%'
  group by role.organization_id
)
insert into public.oh_module_settings (organization_id, module_slug, enabled, settings)
select
  tucxa.id,
  'agenda-viva',
  true,
  jsonb_build_object(
    'wednesdayBookingMode', 'functions',
    'wednesdayAuthorizedFunctionIds', coalesce(reception_roles.role_ids, '[]'::jsonb),
    'maxRecurringAppointmentsPerConsulente', 2,
    'autoCancelRecurringOnAbsence', true
  )
from tucxa
left join reception_roles on reception_roles.organization_id = tucxa.id
on conflict (organization_id, module_slug) do update set
  enabled = true,
  settings = coalesce(public.oh_module_settings.settings, '{}'::jsonb)
    || jsonb_build_object(
      'wednesdayBookingMode', 'functions',
      'wednesdayAuthorizedFunctionIds',
        case
          when jsonb_typeof(public.oh_module_settings.settings->'wednesdayAuthorizedFunctionIds') = 'array'
            then (
              select coalesce(jsonb_agg(distinct value), '[]'::jsonb)
              from jsonb_array_elements(
                coalesce(public.oh_module_settings.settings->'wednesdayAuthorizedFunctionIds', '[]'::jsonb)
                || coalesce(excluded.settings->'wednesdayAuthorizedFunctionIds', '[]'::jsonb)
              ) item(value)
            )
          else coalesce(excluded.settings->'wednesdayAuthorizedFunctionIds', '[]'::jsonb)
        end,
      'maxRecurringAppointmentsPerConsulente',
        greatest(
          1,
          case
            when coalesce(public.oh_module_settings.settings->>'maxRecurringAppointmentsPerConsulente', '') ~ '^[0-9]+$'
              then (public.oh_module_settings.settings->>'maxRecurringAppointmentsPerConsulente')::integer
            else 2
          end
        ),
      'autoCancelRecurringOnAbsence',
        case
          when public.oh_module_settings.settings ? 'autoCancelRecurringOnAbsence'
            then coalesce((public.oh_module_settings.settings->>'autoCancelRecurringOnAbsence')::boolean, true)
          else true
        end
    ),
  updated_at = now();

-- Mantém a mesma configuração também no módulo de atendimento quando ele já existe.
update public.oh_module_settings atendimento
set settings = coalesce(atendimento.settings, '{}'::jsonb)
    || jsonb_build_object(
      'wednesdayBookingMode', 'functions',
      'wednesdayAuthorizedFunctionIds',
        coalesce(
          (
            select agenda.settings->'wednesdayAuthorizedFunctionIds'
            from public.oh_module_settings agenda
            where agenda.organization_id = atendimento.organization_id
              and agenda.module_slug = 'agenda-viva'
            limit 1
          ),
          '[]'::jsonb
        ),
      'maxRecurringAppointmentsPerConsulente',
        greatest(
          1,
          case
            when coalesce(atendimento.settings->>'maxRecurringAppointmentsPerConsulente', '') ~ '^[0-9]+$'
              then (atendimento.settings->>'maxRecurringAppointmentsPerConsulente')::integer
            else 2
          end
        ),
      'autoCancelRecurringOnAbsence',
        case
          when atendimento.settings ? 'autoCancelRecurringOnAbsence'
            then coalesce((atendimento.settings->>'autoCancelRecurringOnAbsence')::boolean, true)
          else true
        end
    ),
    updated_at = now()
where atendimento.module_slug = 'atendimento-em-harmonia';

-- Cancela somente as ocorrências futuras da mesma série quando uma ausência é registrada
-- e a configuração da organização estiver ativa.
create or replace function public.oh_cancel_future_recurrence_on_absence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  should_cancel boolean := false;
begin
  if new.status is distinct from old.status
     and new.status = 'ausente'
     and new.series_id is not null then

    select coalesce(
      (
        select case
          when lower(coalesce(settings.settings->>'autoCancelRecurringOnAbsence', 'true')) in ('true', '1', 'yes', 'sim') then true
          else false
        end
        from public.oh_module_settings settings
        where settings.organization_id = new.organization_id
          and settings.module_slug in ('agenda-viva', 'atendimento-em-harmonia')
        order by case when settings.module_slug = 'agenda-viva' then 0 else 1 end
        limit 1
      ),
      true
    ) into should_cancel;

    if should_cancel then
      update public.oh_consulente_appointments future
      set status = 'cancelado',
          cancelled_at = coalesce(future.cancelled_at, now()),
          cancellation_reason = coalesce(
            nullif(future.cancellation_reason, ''),
            'Recorrência cancelada automaticamente após ausência'
          ),
          metadata = coalesce(future.metadata, '{}'::jsonb)
            || jsonb_build_object(
              'automatic_recurrence_cancellation', true,
              'absence_appointment_id', new.id,
              'cancelled_at', now()
            ),
          updated_at = now()
      where future.organization_id = new.organization_id
        and future.series_id = new.series_id
        and future.id <> new.id
        and future.appointment_date > new.appointment_date
        and future.status not in ('cancelado', 'cancelamento_solicitado', 'ausente', 'atendido', 'concluido');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_oh_cancel_future_recurrence_on_absence
  on public.oh_consulente_appointments;

create trigger trg_oh_cancel_future_recurrence_on_absence
after update of status on public.oh_consulente_appointments
for each row
execute function public.oh_cancel_future_recurrence_on_absence();
