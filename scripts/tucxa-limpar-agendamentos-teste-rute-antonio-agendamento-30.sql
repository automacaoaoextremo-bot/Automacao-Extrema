-- TUCXA - Agendamento 30
-- Limpeza controlada dos dois agendamentos de TESTE confirmados no CSV enviado.
-- Rute Pacheco Mattano e Antonio Roberto Montagnini Pacheco - 06/10/2026.
-- Os históricos vinculados por appointment_id usam ON DELETE CASCADE/SET NULL.

begin;

-- 1) CONFERÊNCIA: estes são exatamente os UUIDs obtidos no CSV do Supabase.
select
  a.id,
  a.appointment_date,
  a.consulente_name,
  a.status,
  a.confirmation_status,
  a.arrival_status,
  a.arrival_order,
  e.name as entidade
from public.oh_consulente_appointments a
left join public.oh_spiritual_entities e on e.id = a.entity_id
join public.oh_organizations o on o.id = a.organization_id
where (o.slug = 'tucxa' or o.name ilike '%tucxa%')
  and a.id in (
    'bff15249-c164-444f-96cd-3218b611176f'::uuid,
    '5d42ddeb-ce87-4b34-bf5d-cd4499bf2f5e'::uuid
  )
order by a.appointment_date, a.consulente_name;

-- 2) EXCLUSÃO: limitada aos UUIDs acima E à organização Tucxa.
delete from public.oh_consulente_appointments a
using public.oh_organizations o
where a.organization_id = o.id
  and (o.slug = 'tucxa' or o.name ilike '%tucxa%')
  and a.id in (
    'bff15249-c164-444f-96cd-3218b611176f'::uuid,
    '5d42ddeb-ce87-4b34-bf5d-cd4499bf2f5e'::uuid
  )
returning a.id, a.appointment_date, a.consulente_name, a.status, a.arrival_status, a.arrival_order;

-- Se o RETURNING mostrar somente Rute e Antonio de 06/10/2026, confirme a transação:
commit;
