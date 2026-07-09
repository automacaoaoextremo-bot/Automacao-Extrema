-- Organização em Harmonia — Agenda Viva 2026
-- Correções de horários locais, Primeiro Acesso e cadastro dos eventos Sementinha/Feijoada/Festa Junina/Bingo.
-- Seguro para rodar mais de uma vez no Supabase SQL Editor.

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

  -- Tipos adicionais usados pelo calendário completo.
  insert into public.agv_event_types (organization_id, slug, name, description, requires_approval, active, sort_order)
  select tucxa_id, item.slug, item.name, item.description, false, true, item.sort_order
  from (values
    ('acao-comunidade', 'Ação em comunidade', 'Ações comunitárias do Sementinha e do Tucxa.', 110),
    ('bazar', 'Bazar', 'Bazares completos do Sementinha.', 120),
    ('bazar-simples', 'Bazar simples', 'Bazares simples ou ações menores do Sementinha.', 130),
    ('bingo', 'Bingo', 'Bingos e sorteios beneficentes.', 140),
    ('feijoada', 'Feijoada', 'Eventos de feijoada beneficente.', 150),
    ('festa-junina', 'Festa Junina', 'Festa Junina, Arraiá e eventos com bingo.', 160)
  ) as item(slug, name, description, sort_order)
  where not exists (
    select 1 from public.agv_event_types existing
    where existing.organization_id = tucxa_id and existing.slug = item.slug
  );

  -- Corrige horários locais de eventos conhecidos que foram digitados em datetime-local.
  update public.agv_events
  set starts_at = '2026-01-01 00:00:00-03',
      ends_at = '2026-01-28 23:59:00-03',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'localStart', '2026-01-01T00:00',
        'local_start', '2026-01-01T00:00',
        'localEnd', '2026-01-28T23:59',
        'local_end', '2026-01-28T23:59',
        'dateLabel', '01/01/2026 até 28/01/2026',
        'timeLabel', '00h00 às 23h59',
        'firstAccessEnabled', false,
        'first_access_enabled', false,
        'showOnFirstAccess', false,
        'show_on_first_access', false
      ),
      updated_at = now()
  where organization_id = tucxa_id
    and lower(coalesce(title, '')) like '%férias 2026%janeiro%';

  update public.agv_events
  set title = 'Filhos da Corrente 2026 - Grupo 2',
      starts_at = '2026-02-12 18:00:00-03',
      ends_at = '2026-12-10 22:00:00-03',
      recurrence_rule = 'FREQ=MONTHLY;BYDAY=TH;BYSETPOS=2,4',
      status = case when status in ('rascunho', 'pendente_aprovacao', 'reprovado', 'ajuste_solicitado') then 'aprovado' else status end,
      event_type = coalesce(nullif(event_type, ''), 'quinta-grupo-2'),
      group_slug = 'quinta-grupo-2',
      location = coalesce(nullif(location, ''), 'TUCXA'),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'localStart', '2026-02-12T18:00',
        'local_start', '2026-02-12T18:00',
        'localEnd', '2026-12-10T22:00',
        'local_end', '2026-12-10T22:00',
        'firstAccessEnabled', true,
        'first_access_enabled', true,
        'showOnFirstAccess', true,
        'show_on_first_access', true,
        'firstAccessOrder', 7,
        'first_access_order', 7,
        'firstAccessSummary', '2ª e 4ª quinta-feira do mês • 18h às 22h • Abertura 19h • Porta fecha 19h30 e reabre 20h',
        'first_access_summary', '2ª e 4ª quinta-feira do mês • 18h às 22h • Abertura 19h • Porta fecha 19h30 e reabre 20h',
        'recurring', true,
        'recurrenceFrequency', 'mensal',
        'recurrenceWeekday', 'quinta',
        'recurrenceLabel', '2ª e 4ª quinta-feira do mês',
        'dateLabel', '2ª e 4ª quinta-feira do mês',
        'timeLabel', '18h às 22h • Abertura 19h • Porta fecha 19h30 e reabre 20h',
        'locationLabel', 'TUCXA',
        'mandatoryForAll', false,
        'requiredForAllFilhosDaCorrente', false
      ),
      updated_at = now()
  where organization_id = tucxa_id
    and (
      group_slug = 'quinta-grupo-2'
      or event_type = 'quinta-grupo-2'
      or lower(coalesce(title, '')) like '%grupo 2%'
    );

  if not exists (select 1 from public.agv_events where organization_id = tucxa_id and group_slug = 'quinta-grupo-2') then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, recurrence_rule, metadata)
    values (tucxa_id, 'Filhos da Corrente 2026 - Grupo 2', 'quinta-grupo-2', 'aprovado', '2026-02-12 18:00:00-03', '2026-12-10 22:00:00-03', false, 'TUCXA', 'quinta-grupo-2', false, '2ª e 4ª quinta-feira do mês. Funcionamento 18h às 22h. Abertura 19h. Porta fecha 19h30 e reabre 20h.', 'FREQ=MONTHLY;BYDAY=TH;BYSETPOS=2,4', '{"localStart":"2026-02-12T18:00","local_start":"2026-02-12T18:00","localEnd":"2026-12-10T22:00","local_end":"2026-12-10T22:00","firstAccessEnabled":true,"first_access_enabled":true,"showOnFirstAccess":true,"show_on_first_access":true,"firstAccessOrder":7,"first_access_order":7,"firstAccessSummary":"2ª e 4ª quinta-feira do mês • 18h às 22h • Abertura 19h • Porta fecha 19h30 e reabre 20h","first_access_summary":"2ª e 4ª quinta-feira do mês • 18h às 22h • Abertura 19h • Porta fecha 19h30 e reabre 20h","recurring":true,"recurrenceFrequency":"mensal","recurrenceWeekday":"quinta","recurrenceLabel":"2ª e 4ª quinta-feira do mês","dateLabel":"2ª e 4ª quinta-feira do mês","timeLabel":"18h às 22h • Abertura 19h • Porta fecha 19h30 e reabre 20h","locationLabel":"TUCXA","imageEmoji":"✨"}'::jsonb);
  end if;

  -- Eventos do Calendário Sementinha 2026.
  if not exists (select 1 from public.agv_events where organization_id = tucxa_id and group_slug = 'sementinha-acao-comunidade-2026-02-28') then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, metadata)
    values (tucxa_id, 'Sementinha — Ação em comunidade', 'acao-comunidade', 'aprovado', '2026-02-28 00:00:00-03', null, true, 'A definir', 'sementinha-acao-comunidade-2026-02-28', false, 'Data destacada no Calendário Sementinha 2026.', '{"source":"calendario-sementinha-2026","localStart":"2026-02-28T00:00","local_start":"2026-02-28T00:00","dateLabel":"28/02/2026","timeLabel":"Horário a definir","timeUndefined":true,"locationLabel":"A definir","imageEmoji":"🤝","image_url":"/clientes/tucxa/eventos/calendario-sementinha-2026.png","firstAccessEnabled":false,"first_access_enabled":false,"showOnFirstAccess":false,"show_on_first_access":false}'::jsonb);
  end if;

  if not exists (select 1 from public.agv_events where organization_id = tucxa_id and group_slug = 'sementinha-bazar-2026-03-07') then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, metadata)
    values (tucxa_id, 'Sementinha — Bazar', 'bazar', 'aprovado', '2026-03-07 00:00:00-03', null, true, 'A definir', 'sementinha-bazar-2026-03-07', false, 'Data destacada no Calendário Sementinha 2026.', '{"source":"calendario-sementinha-2026","localStart":"2026-03-07T00:00","local_start":"2026-03-07T00:00","dateLabel":"07/03/2026","timeLabel":"Horário a definir","timeUndefined":true,"locationLabel":"A definir","imageEmoji":"🛍️","image_url":"/clientes/tucxa/eventos/calendario-sementinha-2026.png","firstAccessEnabled":false,"first_access_enabled":false,"showOnFirstAccess":false,"show_on_first_access":false}'::jsonb);
  end if;

  if not exists (select 1 from public.agv_events where organization_id = tucxa_id and group_slug = 'sementinha-acao-comunidade-2026-04-04') then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, metadata)
    values (tucxa_id, 'Sementinha — Ação em comunidade', 'acao-comunidade', 'aprovado', '2026-04-04 00:00:00-03', null, true, 'A definir', 'sementinha-acao-comunidade-2026-04-04', false, 'Data destacada no Calendário Sementinha 2026.', '{"source":"calendario-sementinha-2026","localStart":"2026-04-04T00:00","local_start":"2026-04-04T00:00","dateLabel":"04/04/2026","timeLabel":"Horário a definir","timeUndefined":true,"locationLabel":"A definir","imageEmoji":"🤝","image_url":"/clientes/tucxa/eventos/calendario-sementinha-2026.png","firstAccessEnabled":false,"first_access_enabled":false,"showOnFirstAccess":false,"show_on_first_access":false}'::jsonb);
  end if;

  if not exists (select 1 from public.agv_events where organization_id = tucxa_id and group_slug = 'sementinha-bazar-simples-2026-04-10') then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, metadata)
    values (tucxa_id, 'Sementinha — Bazar simples', 'bazar-simples', 'aprovado', '2026-04-10 00:00:00-03', null, true, 'A definir', 'sementinha-bazar-simples-2026-04-10', false, 'Data destacada no Calendário Sementinha 2026.', '{"source":"calendario-sementinha-2026","localStart":"2026-04-10T00:00","local_start":"2026-04-10T00:00","dateLabel":"10/04/2026","timeLabel":"Horário a definir","timeUndefined":true,"locationLabel":"A definir","imageEmoji":"🧺","image_url":"/clientes/tucxa/eventos/calendario-sementinha-2026.png","firstAccessEnabled":false,"first_access_enabled":false,"showOnFirstAccess":false,"show_on_first_access":false}'::jsonb);
  end if;

  if not exists (select 1 from public.agv_events where organization_id = tucxa_id and group_slug = 'sementinha-bazar-simples-2026-04-11') then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, metadata)
    values (tucxa_id, 'Sementinha — Bazar simples', 'bazar-simples', 'aprovado', '2026-04-11 00:00:00-03', null, true, 'A definir', 'sementinha-bazar-simples-2026-04-11', false, 'Data destacada no Calendário Sementinha 2026.', '{"source":"calendario-sementinha-2026","localStart":"2026-04-11T00:00","local_start":"2026-04-11T00:00","dateLabel":"11/04/2026","timeLabel":"Horário a definir","timeUndefined":true,"locationLabel":"A definir","imageEmoji":"🧺","image_url":"/clientes/tucxa/eventos/calendario-sementinha-2026.png","firstAccessEnabled":false,"first_access_enabled":false,"showOnFirstAccess":false,"show_on_first_access":false}'::jsonb);
  end if;

  if not exists (select 1 from public.agv_events where organization_id = tucxa_id and group_slug = 'sementinha-bingo-2026-05-09') then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, metadata)
    values (tucxa_id, 'Sementinha — Bingo', 'bingo', 'aprovado', '2026-05-09 00:00:00-03', null, true, 'A definir', 'sementinha-bingo-2026-05-09', false, 'Data destacada no Calendário Sementinha 2026.', '{"source":"calendario-sementinha-2026","localStart":"2026-05-09T00:00","local_start":"2026-05-09T00:00","dateLabel":"09/05/2026","timeLabel":"Horário a definir","timeUndefined":true,"locationLabel":"A definir","imageEmoji":"🎱","image_url":"/clientes/tucxa/eventos/calendario-sementinha-2026.png","firstAccessEnabled":false,"first_access_enabled":false,"showOnFirstAccess":false,"show_on_first_access":false}'::jsonb);
  end if;

  if not exists (select 1 from public.agv_events where organization_id = tucxa_id and group_slug = 'sementinha-bazar-simples-2026-06-05') then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, metadata)
    values (tucxa_id, 'Sementinha — Bazar simples', 'bazar-simples', 'aprovado', '2026-06-05 00:00:00-03', null, true, 'A definir', 'sementinha-bazar-simples-2026-06-05', false, 'Data destacada no Calendário Sementinha 2026.', '{"source":"calendario-sementinha-2026","localStart":"2026-06-05T00:00","local_start":"2026-06-05T00:00","dateLabel":"05/06/2026","timeLabel":"Horário a definir","timeUndefined":true,"locationLabel":"A definir","imageEmoji":"🧺","image_url":"/clientes/tucxa/eventos/calendario-sementinha-2026.png","firstAccessEnabled":false,"first_access_enabled":false,"showOnFirstAccess":false,"show_on_first_access":false}'::jsonb);
  end if;

  if not exists (select 1 from public.agv_events where organization_id = tucxa_id and group_slug = 'sementinha-bazar-simples-2026-06-06') then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, metadata)
    values (tucxa_id, 'Sementinha — Bazar simples', 'bazar-simples', 'aprovado', '2026-06-06 00:00:00-03', null, true, 'A definir', 'sementinha-bazar-simples-2026-06-06', false, 'Data destacada no Calendário Sementinha 2026.', '{"source":"calendario-sementinha-2026","localStart":"2026-06-06T00:00","local_start":"2026-06-06T00:00","dateLabel":"06/06/2026","timeLabel":"Horário a definir","timeUndefined":true,"locationLabel":"A definir","imageEmoji":"🧺","image_url":"/clientes/tucxa/eventos/calendario-sementinha-2026.png","firstAccessEnabled":false,"first_access_enabled":false,"showOnFirstAccess":false,"show_on_first_access":false}'::jsonb);
  end if;

  if not exists (select 1 from public.agv_events where organization_id = tucxa_id and group_slug = 'sementinha-acao-comunidade-2026-06-27') then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, metadata)
    values (tucxa_id, 'Sementinha — Ação em comunidade', 'acao-comunidade', 'aprovado', '2026-06-27 00:00:00-03', null, true, 'A definir', 'sementinha-acao-comunidade-2026-06-27', false, 'Data destacada no Calendário Sementinha 2026.', '{"source":"calendario-sementinha-2026","localStart":"2026-06-27T00:00","local_start":"2026-06-27T00:00","dateLabel":"27/06/2026","timeLabel":"Horário a definir","timeUndefined":true,"locationLabel":"A definir","imageEmoji":"🤝","image_url":"/clientes/tucxa/eventos/calendario-sementinha-2026.png","firstAccessEnabled":false,"first_access_enabled":false,"showOnFirstAccess":false,"show_on_first_access":false}'::jsonb);
  end if;

  -- Feijoada de Ogum.
  if not exists (select 1 from public.agv_events where organization_id = tucxa_id and group_slug = 'feijoada-ogum-2026-04-25') then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, metadata)
    values (tucxa_id, 'Feijoada de Ogum', 'feijoada', 'aprovado', '2026-04-25 12:30:00-03', '2026-04-25 17:00:00-03', false, 'Salão de festas LA & LE — Rua Carlos Araújo Gobbi, 267, Vila São Bento, Campinas', 'feijoada-ogum-2026-04-25', false, 'Evento beneficente divulgado nas artes da Feijoada de Ogum.', '{"source":"arte-feijoada-ogum-2026","localStart":"2026-04-25T12:30","local_start":"2026-04-25T12:30","localEnd":"2026-04-25T17:00","local_end":"2026-04-25T17:00","dateLabel":"Sábado, 25/04/2026","timeLabel":"12h30 às 17h","locationLabel":"Salão de festas LA & LE — Rua Carlos Araújo Gobbi, 267, Vila São Bento, Campinas","imageEmoji":"🍲","image_url":"/clientes/tucxa/eventos/feijoada-ogum-2026.jpeg","image_alt":"Arte da Feijoada de Ogum Tucxa 2026","firstAccessEnabled":false,"first_access_enabled":false,"showOnFirstAccess":false,"show_on_first_access":false}'::jsonb);
  end if;

  -- Festa Junina / Arraiá Tucxa 2026 e Bingo associado.
  if not exists (select 1 from public.agv_events where organization_id = tucxa_id and group_slug = 'arraia-tucxa-2026-06-14') then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, metadata)
    values (tucxa_id, 'Arraiá Tucxa 2026', 'festa-junina', 'aprovado', '2026-06-14 12:00:00-03', '2026-06-14 17:00:00-03', false, 'Espaço Santa Fé — Rua Antônio Maurício Ladeira, 474, Jardim Conceição, Campinas/SP', 'arraia-tucxa-2026-06-14', false, 'Festa Junina beneficente do Tucxa, com comidas típicas, quadrilha, brincadeiras e bingo.', '{"source":"tucxa-festa-junina-vercel","localStart":"2026-06-14T12:00","local_start":"2026-06-14T12:00","localEnd":"2026-06-14T17:00","local_end":"2026-06-14T17:00","dateLabel":"Domingo, 14/06/2026","timeLabel":"12h às 17h","locationLabel":"Espaço Santa Fé — Rua Antônio Maurício Ladeira, 474, Jardim Conceição, Campinas/SP","imageEmoji":"🌽","external_url":"https://tucxa-festa-junina.vercel.app/festa-junina","firstAccessEnabled":false,"first_access_enabled":false,"showOnFirstAccess":false,"show_on_first_access":false}'::jsonb);
  end if;

  if not exists (select 1 from public.agv_events where organization_id = tucxa_id and group_slug = 'bingo-festa-junina-tucxa-2026-06-14') then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, metadata)
    values (tucxa_id, 'Bingo Festa Junina do Tucxa', 'bingo', 'aprovado', '2026-06-14 12:00:00-03', '2026-06-14 17:00:00-03', false, 'R. Antônio Maurício Ladeira, 474 - Jardim Conceição', 'bingo-festa-junina-tucxa-2026-06-14', false, 'Bingo da Festa Junina do Tucxa com sorteio de Air Fryer.', '{"source":"bingo-sementinha-vercel","localStart":"2026-06-14T12:00","local_start":"2026-06-14T12:00","localEnd":"2026-06-14T17:00","local_end":"2026-06-14T17:00","dateLabel":"Domingo, 14/06/2026","timeLabel":"12h às 17h","locationLabel":"R. Antônio Maurício Ladeira, 474 - Jardim Conceição","imageEmoji":"🎱","external_url":"https://bingo-sementinha.vercel.app/evento/bingo-festa-junina-do-tucxa-2026-06-14","firstAccessEnabled":false,"first_access_enabled":false,"showOnFirstAccess":false,"show_on_first_access":false}'::jsonb);
  end if;
end $$;
