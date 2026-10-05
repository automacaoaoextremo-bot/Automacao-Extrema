-- TUCXA / Agendamento Piloto - diagnóstico após Ajustes 50
-- Execute no SQL Editor do Supabase DEPOIS da migration 50.

-- 1. Não deve retornar nenhuma linha: ordens ativas duplicadas pelo entity_id real.
select
  a.organization_id,
  a.appointment_date,
  a.entity_id,
  e.name as entity_name,
  (a.metadata->>'order')::integer as appointment_order,
  count(*) as quantidade
from public.oh_consulente_appointments a
left join public.oh_spiritual_entities e on e.id = a.entity_id
where a.status in ('solicitado', 'confirmado', 'aprovado', 'presente', 'concluido')
  and coalesce(a.metadata->>'order', '') ~ '^[0-9]+$'
group by a.organization_id, a.appointment_date, a.entity_id, e.name, (a.metadata->>'order')::integer
having count(*) > 1
order by a.appointment_date, e.name, appointment_order;

-- 2. Detecta cadastros de Entidade com o mesmo nome na mesma organização.
-- Se houver duas linhas chamadas "Passes", por exemplo, envie o resultado antes
-- de excluir ou mesclar qualquer cadastro.
select
  e.organization_id,
  lower(trim(e.name)) as normalized_name,
  count(*) as quantidade,
  array_agg(e.id order by e.created_at, e.id) as entity_ids,
  array_agg(e.name order by e.created_at, e.id) as nomes
from public.oh_spiritual_entities e
where e.active = true
group by e.organization_id, lower(trim(e.name))
having count(*) > 1
order by normalized_name;

-- 3. Lista as ordens atuais para 05/10/2026 e 06/10/2026 para conferência visual.
select
  a.appointment_date,
  e.name as entidade,
  a.entity_id,
  a.consulente_name,
  a.status,
  a.confirmation_status,
  a.metadata->>'order' as ordem,
  a.metadata->>'confirmed_order' as ordem_confirmada,
  a.metadata->>'orderRepairVersion' as reparo
from public.oh_consulente_appointments a
left join public.oh_spiritual_entities e on e.id = a.entity_id
where a.appointment_date in ('2026-10-05', '2026-10-06')
  and a.status <> 'cancelado'
order by a.appointment_date, e.name, nullif(a.metadata->>'order','')::integer nulls last, a.created_at, a.id;
