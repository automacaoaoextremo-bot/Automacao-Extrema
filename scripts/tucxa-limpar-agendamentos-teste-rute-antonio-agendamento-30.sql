-- TUCXA - Agendamento 30
-- Limpeza controlada de agendamentos de TESTE de Rute e Antonio.
-- Execute primeiro o bloco de conferência. Só depois execute o DELETE.
-- O registro de chegada fica na própria oh_consulente_appointments e os
-- históricos vinculados por appointment_id usam ON DELETE CASCADE/SET NULL.

begin;

-- 1) CONFERÊNCIA: veja exatamente o que será removido.
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
  and (
    a.consulente_name ilike 'Rute%'
    or a.consulente_name ilike 'Antonio%'
    or a.consulente_name ilike 'Antônio%'
  )
order by a.appointment_date desc, a.consulente_name;

-- IMPORTANTE:
-- Se a consulta acima mostrar registros que NÃO são os testes desejados,
-- faça ROLLBACK e refine por data/ID antes de prosseguir.

-- 2) EXCLUSÃO.
-- Para máxima segurança, substitua os UUIDs abaixo pelos IDs conferidos acima.
-- Exemplo:
-- delete from public.oh_consulente_appointments
-- where id in (
--   'UUID-DO-AGENDAMENTO-DA-RUTE'::uuid,
--   'UUID-DO-AGENDAMENTO-DO-ANTONIO'::uuid
-- );

-- Nenhum DELETE por nome é executado automaticamente neste script.

rollback;

-- Depois de substituir pelo DELETE por UUID e conferir novamente,
-- troque o ROLLBACK final por COMMIT.
