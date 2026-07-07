-- Organização em Harmonia — aprovações, acompanhamento público e eventos Tucxa 2026
-- Seguro para rodar mais de uma vez no Supabase SQL Editor.

alter table if exists public.oh_public_site_requests
  add column if not exists status_tracking_token text,
  add column if not exists person_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists idx_oh_public_site_requests_status_token
  on public.oh_public_site_requests (status_tracking_token)
  where status_tracking_token is not null;

create index if not exists idx_oh_public_site_requests_person
  on public.oh_public_site_requests (person_id, created_at desc);

create table if not exists public.oh_approval_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  scope text not null,
  label text not null,
  responsible_person_id uuid references public.oh_people(id) on delete set null,
  fallback_email text,
  fallback_whatsapp text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, scope)
);

create index if not exists idx_oh_approval_rules_scope
  on public.oh_approval_rules (organization_id, scope, active);

insert into public.oh_approval_rules (organization_id, scope, label, fallback_email, fallback_whatsapp)
select org.id, item.scope, item.label, 'automacao.ao.extremo@gmail.com', null
from public.oh_organizations org
cross join (values
  ('consulente-cadastro', 'Cadastro de Consulente / Filho de Fora'),
  ('filho-corrente-cadastro', 'Cadastro de Filho da Corrente'),
  ('agenda-evento', 'Eventos e atividades da Agenda Viva'),
  ('atendimento-agendamento', 'Atendimentos e encaminhamentos'),
  ('corrente-contribuicao', 'Contribuições e comprovantes')
) as item(scope, label)
where org.slug = 'tucxa' or org.name ilike '%tucxa%'
on conflict (organization_id, scope) do update set
  label = excluded.label,
  fallback_email = coalesce(public.oh_approval_rules.fallback_email, excluded.fallback_email),
  updated_at = now();

-- Garante módulos para Consulentes / Filhos de Fora.
update public.oh_memberships
set module_slugs = array['agenda-viva','atendimento-em-harmonia','corrente-em-dia'],
    updated_at = now()
where organization_id in (select id from public.oh_organizations where slug = 'tucxa' or name ilike '%tucxa%')
  and (
    agenda_viva_profile->>'publico' = 'consulente-filho-de-fora'
    or status = 'pendente_validacao'
  );

-- Tipos de eventos da Agenda Viva do Tucxa. Só executa se as tabelas da Agenda Viva existirem.
do $$
declare
  tucxa_id uuid;
begin
  if to_regclass('public.agv_event_types') is null or to_regclass('public.agv_events') is null then
    return;
  end if;

  select id into tucxa_id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by created_at desc
  limit 1;

  if tucxa_id is null then
    return;
  end if;

  insert into public.agv_event_types (organization_id, slug, name, description, requires_approval, active, sort_order)
  values
    (tucxa_id, 'grupo-segunda-feira', 'Grupo Segunda-feira', 'Atendimento aos Filhos de Fora às segundas-feiras.', true, true, 10),
    (tucxa_id, 'grupo-terca-feira', 'Grupo Terça-feira', 'Atendimento aos Filhos de Fora às terças-feiras.', true, true, 20),
    (tucxa_id, 'tratamento-espiritual-transformacao', 'Tratamento espiritual / Transformação', 'Trabalhos de Transformação às quartas, quando houver encaminhamento.', true, true, 30),
    (tucxa_id, 'quinta-grupo-1', 'Quinta - Grupo 1', 'Gira de desenvolvimento do Grupo 1.', true, true, 40),
    (tucxa_id, 'quinta-grupo-2', 'Quinta - Grupo 2', 'Gira de desenvolvimento do Grupo 2.', true, true, 50),
    (tucxa_id, 'grupo-estudos', 'Grupo de Estudos', 'Encontro presencial do Grupo de Estudos.', true, true, 60),
    (tucxa_id, 'clube-livro', 'Clube do Livro', 'Encontro online ou presencial do Clube do Livro.', true, true, 70),
    (tucxa_id, 'sementinha', 'Sementinha', 'Ações e eventos do Sementinha.', true, true, 80),
    (tucxa_id, 'evento-cultural', 'Evento cultural', 'Julho Cultural e demais eventos da casa.', true, true, 90),
    (tucxa_id, 'ferias-recesso', 'Férias / recesso', 'Períodos sem atendimento regular.', true, true, 100)
  on conflict do nothing;

  insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, metadata)
  values
    (tucxa_id, 'Mutirão de Limpeza', 'sementinha', 'aprovado', '2026-01-24 09:00:00-03', '2026-01-24 12:00:00-03', false, 'Tucxa', 'mutirao-limpeza', false, 'Mutirão de limpeza do calendário anual.', '{"source":"calendario-tucxa-2026","publicOption":true}'::jsonb),
    (tucxa_id, 'Trabalho para todos os Cavalinhos e Cambonos', 'grupo-segunda-feira', 'aprovado', '2026-01-29 18:00:00-03', '2026-01-29 22:00:00-03', false, 'Tucxa', 'trabalho-cavalinhos-cambonos', false, 'Atividade indicada no calendário anual do Tucxa.', '{"source":"calendario-tucxa-2026","publicOption":true}'::jsonb),
    (tucxa_id, 'Trabalho para todos os Cavalinhos e Cambonos', 'grupo-segunda-feira', 'aprovado', '2026-07-30 18:00:00-03', '2026-07-30 22:00:00-03', false, 'Tucxa', 'trabalho-cavalinhos-cambonos', false, 'Atividade indicada no calendário anual do Tucxa.', '{"source":"calendario-tucxa-2026","publicOption":true}'::jsonb),
    (tucxa_id, 'Bazar Sementinha', 'sementinha', 'aprovado', '2026-07-04 09:00:00-03', '2026-07-04 17:00:00-03', false, 'Tucxa', 'bazar-sementinha', false, 'Evento do calendário Julho Cultural.', '{"source":"calendario-julho-cultural-2026","publicOption":true,"imageEmoji":"👕"}'::jsonb),
    (tucxa_id, 'Caminhada TUCXA', 'evento-cultural', 'aprovado', '2026-07-11 08:00:00-03', '2026-07-11 11:00:00-03', false, 'A confirmar', 'caminhada-tucxa', false, 'Evento do calendário Julho Cultural.', '{"source":"calendario-julho-cultural-2026","publicOption":true,"imageEmoji":"🚶"}'::jsonb),
    (tucxa_id, 'Grupo de Estudos', 'grupo-estudos', 'aprovado', '2026-07-12 15:00:00-03', '2026-07-12 17:00:00-03', false, 'Tucxa', 'grupo-estudos', false, 'Grupo de Estudos presencial.', '{"source":"calendario-julho-cultural-2026","publicOption":true,"imageEmoji":"💡"}'::jsonb),
    (tucxa_id, 'Dia do Filme', 'evento-cultural', 'aprovado', '2026-07-16 19:00:00-03', '2026-07-16 21:00:00-03', false, 'Tucxa', 'dia-do-filme', false, 'Dia do Filme do Julho Cultural.', '{"source":"calendario-julho-cultural-2026","publicOption":true,"imageEmoji":"🎬"}'::jsonb),
    (tucxa_id, 'Mostra Cultural e Clube do Livro', 'clube-livro', 'aprovado', '2026-07-21 19:00:00-03', '2026-07-21 21:00:00-03', false, 'Tucxa', 'mostra-cultural-clube-livro', false, 'Mostra Cultural e Clube do Livro.', '{"source":"calendario-julho-cultural-2026","publicOption":true,"imageEmoji":"📚"}'::jsonb),
    (tucxa_id, 'Grupo de Estudos', 'grupo-estudos', 'aprovado', '2026-07-26 15:00:00-03', '2026-07-26 17:00:00-03', false, 'Tucxa', 'grupo-estudos', false, 'Grupo de Estudos presencial.', '{"source":"calendario-julho-cultural-2026","publicOption":true,"imageEmoji":"💡"}'::jsonb),
    (tucxa_id, 'Clube do Livro Extra', 'clube-livro', 'aprovado', '2026-07-31 19:00:00-03', '2026-07-31 21:00:00-03', false, 'Online', 'clube-livro-extra', false, 'Clube do Livro Extra online.', '{"source":"calendario-julho-cultural-2026","publicOption":true,"imageEmoji":"📖"}'::jsonb),
    (tucxa_id, 'Encerramento', 'evento-cultural', 'aprovado', '2026-12-20 18:00:00-03', '2026-12-20 22:00:00-03', false, 'Tucxa', 'encerramento-2026', false, 'Encerramento indicado no calendário anual.', '{"source":"calendario-tucxa-2026","publicOption":true}'::jsonb)
  on conflict do nothing;
end $$;
