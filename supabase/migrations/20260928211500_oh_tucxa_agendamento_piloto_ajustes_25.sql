-- Organização em Harmonia / TUCXA
-- Agendamento Piloto — Ajustes 25 (28/09/2026)
--
-- 1. mantém o cutoff padrão de confirmação às 16:00;
-- 2. desativa, por padrão, o cancelamento automático após o cutoff;
-- 3. as duas opções passam a ser editáveis pela Recepção no painel.
--
-- Não contém nomes, telefones ou senhas de pessoas.

with tucxa as (
  select id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by case when slug = 'tucxa' then 0 else 1 end, created_at asc
  limit 1
)
update public.oh_module_settings settings_row
set settings = coalesce(settings_row.settings, '{}'::jsonb)
  || jsonb_build_object(
    'pilotConfirmationCutoff',
      coalesce(nullif(settings_row.settings->>'pilotConfirmationCutoff', ''), '16:00'),
    'pilotAutoCancelExpiredConfirmations', false
  ),
  updated_at = now()
from tucxa
where settings_row.organization_id = tucxa.id
  and settings_row.module_slug = 'atendimento-em-harmonia';

comment on column public.oh_module_settings.settings is
  'Configurações dos módulos. No Atendimento em Harmonia, pilotConfirmationCutoff define o limite para confirmação; pilotAutoCancelExpiredConfirmations controla se pendências vencidas são canceladas automaticamente.';
