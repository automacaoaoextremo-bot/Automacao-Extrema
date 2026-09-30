-- Organização em Harmonia / TUCXA — Agendamento-29
-- 1) Sincroniza a Entidade padrão com o último agendamento conhecido quando ainda não há preferência.
-- 2) Lista Consulentes sem histórico para definição manual pela Recepção.
-- 3) Preserva default_entity_changed_at para que a troca pelo autoatendimento ocorra uma única vez.

with last_appointment as (
  select distinct on (a.organization_id, a.person_id)
    a.organization_id,
    a.person_id,
    a.entity_id
  from public.oh_consulente_appointments a
  where a.person_id is not null
    and a.entity_id is not null
    and coalesce(a.status, '') not in ('cancelled', 'canceled')
  order by a.organization_id, a.person_id, a.appointment_date desc, a.created_at desc
)
insert into public.oh_tucxa_pilot_person_preferences (
  organization_id, person_id, default_entity_id, created_at, updated_at
)
select organization_id, person_id, entity_id, now(), now()
from last_appointment
on conflict (organization_id, person_id) do update
set default_entity_id = coalesce(public.oh_tucxa_pilot_person_preferences.default_entity_id, excluded.default_entity_id),
    updated_at = case
      when public.oh_tucxa_pilot_person_preferences.default_entity_id is null then now()
      else public.oh_tucxa_pilot_person_preferences.updated_at
    end;

-- Conferência: pessoas ativas sem Entidade padrão e sem nenhum agendamento.
select
  p.id,
  p.full_name,
  p.whatsapp,
  p.email
from public.oh_people p
join public.oh_organizations o on o.id = p.organization_id
left join public.oh_tucxa_pilot_person_preferences pref
  on pref.organization_id = p.organization_id and pref.person_id = p.id
where p.active = true
  and (o.slug = 'tucxa' or o.name ilike '%tucxa%')
  and pref.default_entity_id is null
  and not exists (
    select 1 from public.oh_consulente_appointments a
    where a.organization_id = p.organization_id and a.person_id = p.id
  )
order by p.full_name;
