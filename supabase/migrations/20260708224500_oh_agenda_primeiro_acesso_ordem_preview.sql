-- Organização em Harmonia / Tucxa
-- Controle do card Agenda no Primeiro Acesso sem alterar código/deploy.

alter table if exists public.agv_events
  add column if not exists metadata jsonb default '{}'::jsonb;

update public.agv_events
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'firstAccessEnabled', false,
  'first_access_enabled', false,
  'showOnFirstAccess', false,
  'show_on_first_access', false
)
where
  lower(coalesce(title, '') || ' ' || coalesce(event_type, '') || ' ' || coalesce(group_slug, '')) like any (array[
    '%ferias%',
    '%férias%',
    '%recesso%',
    '%todos os filhos%',
    '%todos filhos%',
    '%cavalinhos e cambonos%',
    '%trabalho para todos%'
  ]);

update public.agv_events
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'firstAccessEnabled', true,
  'first_access_enabled', true,
  'showOnFirstAccess', true,
  'show_on_first_access', true,
  'firstAccessOrder', 10,
  'first_access_order', 10,
  'firstAccessSummary', 'Recorrência semanal • Segunda-feira • 18h às 22h • Abertura 18h30 • Porta fecha 19h20 e reabre 20h',
  'first_access_summary', 'Recorrência semanal • Segunda-feira • 18h às 22h • Abertura 18h30 • Porta fecha 19h20 e reabre 20h'
)
where lower(coalesce(title, '') || ' ' || coalesce(event_type, '') || ' ' || coalesce(group_slug, '')) like any (array['%segunda%']);

update public.agv_events
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'firstAccessEnabled', true,
  'first_access_enabled', true,
  'showOnFirstAccess', true,
  'show_on_first_access', true,
  'firstAccessOrder', 20,
  'first_access_order', 20,
  'firstAccessSummary', 'Recorrência semanal • Terça-feira • 18h às 22h • Abertura 18h30 • Porta fecha 19h20 e reabre 20h',
  'first_access_summary', 'Recorrência semanal • Terça-feira • 18h às 22h • Abertura 18h30 • Porta fecha 19h20 e reabre 20h'
)
where lower(coalesce(title, '') || ' ' || coalesce(event_type, '') || ' ' || coalesce(group_slug, '')) like any (array['%terca%', '%terça%']);

update public.agv_events
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'firstAccessEnabled', true,
  'first_access_enabled', true,
  'showOnFirstAccess', true,
  'show_on_first_access', true,
  'firstAccessOrder', 30,
  'first_access_order', 30,
  'firstAccessSummary', 'Conforme encaminhamento • Quarta-feira • 18h30 às 22h • Abertura 18h45 • Porta fecha 19h',
  'first_access_summary', 'Conforme encaminhamento • Quarta-feira • 18h30 às 22h • Abertura 18h45 • Porta fecha 19h'
)
where lower(coalesce(title, '') || ' ' || coalesce(event_type, '') || ' ' || coalesce(group_slug, '')) like any (array['%quarta%', '%transformacao%', '%transformação%']);

update public.agv_events
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'firstAccessEnabled', true,
  'first_access_enabled', true,
  'showOnFirstAccess', true,
  'show_on_first_access', true,
  'firstAccessOrder', 40,
  'first_access_order', 40,
  'firstAccessSummary', '1ª e 3ª quinta-feira do mês • 18h às 22h • Abertura 19h • Porta fecha 19h30 e reabre 20h',
  'first_access_summary', '1ª e 3ª quinta-feira do mês • 18h às 22h • Abertura 19h • Porta fecha 19h30 e reabre 20h'
)
where lower(coalesce(title, '') || ' ' || coalesce(event_type, '') || ' ' || coalesce(group_slug, '')) like any (array['%grupo 1%', '%grupo i%', '%grupo-1%']);

update public.agv_events
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'firstAccessEnabled', true,
  'first_access_enabled', true,
  'showOnFirstAccess', true,
  'show_on_first_access', true,
  'firstAccessOrder', 50,
  'first_access_order', 50,
  'firstAccessSummary', '2ª e 4ª quinta-feira do mês • 18h às 22h • Abertura 19h • Porta fecha 19h30 e reabre 20h',
  'first_access_summary', '2ª e 4ª quinta-feira do mês • 18h às 22h • Abertura 19h • Porta fecha 19h30 e reabre 20h'
)
where lower(coalesce(title, '') || ' ' || coalesce(event_type, '') || ' ' || coalesce(group_slug, '')) like any (array['%grupo 2%', '%grupo ii%', '%grupo-2%']);

update public.agv_events
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'firstAccessEnabled', true,
  'first_access_enabled', true,
  'showOnFirstAccess', true,
  'show_on_first_access', true,
  'firstAccessOrder', 60,
  'first_access_order', 60,
  'firstAccessSummary', 'A cada 15 dias • Domingos conforme datas confirmadas pelos coordenadores',
  'first_access_summary', 'A cada 15 dias • Domingos conforme datas confirmadas pelos coordenadores'
)
where lower(coalesce(title, '') || ' ' || coalesce(event_type, '') || ' ' || coalesce(group_slug, '')) like any (array['%grupo de estudos%']);

update public.agv_events
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'firstAccessEnabled', true,
  'first_access_enabled', true,
  'showOnFirstAccess', true,
  'show_on_first_access', true,
  'firstAccessOrder', 70,
  'first_access_order', 70,
  'firstAccessSummary', 'Evento pontual • Sábado, 11/07/2026 • 16h às 17h',
  'first_access_summary', 'Evento pontual • Sábado, 11/07/2026 • 16h às 17h'
)
where lower(coalesce(title, '') || ' ' || coalesce(event_type, '') || ' ' || coalesce(group_slug, '')) like any (array['%caminhada%']);

update public.agv_events
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'firstAccessEnabled', true,
  'first_access_enabled', true,
  'showOnFirstAccess', true,
  'show_on_first_access', true,
  'firstAccessOrder', 80,
  'first_access_order', 80,
  'firstAccessSummary', 'Recorrência mensal • Última sexta-feira do mês • 19h às 20h30',
  'first_access_summary', 'Recorrência mensal • Última sexta-feira do mês • 19h às 20h30'
)
where lower(coalesce(title, '') || ' ' || coalesce(event_type, '') || ' ' || coalesce(group_slug, '')) like any (array['%clube do livro mensal%']);
