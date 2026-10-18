-- TUCXA - Agendamento Piloto - Ajuste 72
-- Diagnóstico somente leitura.
-- Confere a nova configuração de ordem de exibição da Triagem.
--
-- Valores esperados:
--   booking      = Ordem de Agendamento (padrão/fallback)
--   alphabetical = Ordem Alfabética
--
-- A configuração é armazenada no JSON já existente de oh_module_settings,
-- portanto o Ajuste 72 não exige migration.

select
  organization_id,
  module_slug,
  coalesce(nullif(settings ->> 'pilotTriageDisplayOrder', ''), 'booking') as triage_display_order,
  settings ->> 'pilotServiceOrderMode' as service_order_mode_operacional,
  settings ->> 'pilotTriageEntityPaginationEnabled' as triage_entity_pagination_enabled,
  settings ->> 'pilotTriageCadernoPaginationEnabled' as triage_caderno_pagination_enabled,
  updated_at
from oh_module_settings
where module_slug = 'atendimento-em-harmonia'
order by updated_at desc nulls last;
