-- Organização em Harmonia / TUCXA
-- Piloto de agendamentos — Ajustes 02 (24/09/2026)
--
-- Escopo funcional:
-- 1. implantação por etapas: primeiro Recepção, depois Consulentes, depois todos;
-- 2. autoagendamento do Consulente desabilitado durante a etapa inicial;
-- 3. mantém confirmação pública por link/SMS;
-- 4. não armazena senha temporária no banco/código.

with tucxa as (
  select id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by case when slug = 'tucxa' then 0 else 1 end, created_at asc
  limit 1
)
insert into public.oh_module_settings (organization_id, module_slug, enabled, settings)
select
  tucxa.id,
  'atendimento-em-harmonia',
  true,
  jsonb_build_object(
    'pilotPublicLandingEnabled', true,
    'pilotRolloutStage', 'reception',
    'pilotSelfServiceEnabled', false
  )
from tucxa
on conflict (organization_id, module_slug) do update set
  enabled = true,
  settings = coalesce(public.oh_module_settings.settings, '{}'::jsonb) || excluded.settings,
  updated_at = now();

-- Valores previstos para pilotRolloutStage:
-- reception  -> somente pessoas com função/perfil de Recepção entram pelo login do Agendamento;
-- consulente -> Recepção + Consulentes/Filhos de Fora;
-- all        -> libera também demais Filhos da Corrente/Cavalinhos conforme permissões existentes.
--
-- Quando o Tucxa decidir abrir autoagendamento ao Consulente, alterar também:
-- pilotSelfServiceEnabled = true
