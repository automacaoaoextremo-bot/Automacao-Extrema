-- TUCXA / Sementinha — Ajustes e Evoluções 08
-- 1) Encerra em 31/12/2026 recorrências de eventos iniciadas em 2026 que
--    ainda não possuíam término explícito, evitando projeções artificiais
--    para 2027 e anos posteriores.
-- 2) Atualiza/cadastra as datas destacadas no Calendário Sementinha —
--    segundo semestre de 2026 fornecido na especificação da Evolução 08.
--
-- Migration idempotente: eventos do Sementinha são atualizados por group_slug
-- quando já existem e inseridos quando ainda não existem.

do $$
declare
  tucxa_id uuid;
  item record;
  event_start timestamptz;
  event_metadata jsonb;
begin
  select id
    into tucxa_id
    from public.oh_organizations
   where lower(slug) = 'tucxa'
   limit 1;

  if tucxa_id is null then
    raise notice 'Organização TUCXA não localizada; migration sem alterações.';
    return;
  end if;

  -- Eventos recorrentes existentes que começaram em 2026 e não possuem
  -- término explícito passam a encerrar em 31/12/2026. Um planejamento de
  -- outro ano deve ser cadastrado explicitamente, em vez de ser inferido.
  update public.agv_events
     set recurrence_rule = rtrim(recurrence_rule, ';') || ';UNTIL=20261231',
         metadata = coalesce(metadata, '{}'::jsonb)
           || jsonb_build_object('recurrenceUntil', '2026-12-31'),
         updated_at = now()
   where organization_id = tucxa_id
     and starts_at >= '2026-01-01 00:00:00-03'::timestamptz
     and starts_at <  '2027-01-01 00:00:00-03'::timestamptz
     and recurrence_rule is not null
     and btrim(recurrence_rule) <> ''
     and upper(recurrence_rule) not like '%UNTIL=%';

  -- Legenda da arte fornecida:
  -- Bazar (roxo), Ação na comunidade (laranja), Futebol solidário (turquesa).
  for item in
    select *
      from jsonb_to_recordset(
        '[
          {"title":"Sementinha — Bazar","event_type":"bazar","event_date":"2026-08-29","group_slug":"sementinha-bazar-2026-08-29","event_subtype":"bazar","color_key":"bazar","emoji":"🛍️"},
          {"title":"Sementinha — Ação na comunidade","event_type":"acao-comunidade","event_date":"2026-09-19","group_slug":"sementinha-acao-comunidade-2026-09-19","event_subtype":"community-action","color_key":"community-action","emoji":"🤝"},
          {"title":"Sementinha — Ação na comunidade","event_type":"acao-comunidade","event_date":"2026-10-10","group_slug":"sementinha-acao-comunidade-2026-10-10","event_subtype":"community-action","color_key":"community-action","emoji":"🤝"},
          {"title":"Sementinha — Futebol solidário","event_type":"futebol-solidario","event_date":"2026-10-24","group_slug":"sementinha-futebol-solidario-2026-10-24","event_subtype":"solidarity-football","color_key":"solidarity-football","emoji":"⚽"},
          {"title":"Sementinha — Bazar","event_type":"bazar","event_date":"2026-12-05","group_slug":"sementinha-bazar-2026-12-05","event_subtype":"bazar","color_key":"bazar","emoji":"🛍️"},
          {"title":"Sementinha — Bazar","event_type":"bazar","event_date":"2026-12-12","group_slug":"sementinha-bazar-2026-12-12","event_subtype":"bazar","color_key":"bazar","emoji":"🛍️"}
        ]'::jsonb
      ) as x(
        title text,
        event_type text,
        event_date date,
        group_slug text,
        event_subtype text,
        color_key text,
        emoji text
      )
  loop
    event_start := (item.event_date::text || ' 00:00:00-03')::timestamptz;
    event_metadata := jsonb_build_object(
      'source', 'calendario-sementinha-segundo-semestre-2026',
      'classification', 'sementinha',
      'eventSubtype', item.event_subtype,
      'calendarColorKey', item.color_key,
      'localStart', item.event_date::text || 'T00:00',
      'local_start', item.event_date::text || 'T00:00',
      'dateLabel', to_char(item.event_date, 'DD/MM/YYYY'),
      'timeLabel', 'Horário a definir',
      'timeUndefined', true,
      'locationLabel', 'A definir',
      'imageEmoji', item.emoji,
      'firstAccessEnabled', false,
      'first_access_enabled', false,
      'showOnFirstAccess', false,
      'show_on_first_access', false
    );

    update public.agv_events
       set title = item.title,
           event_type = item.event_type,
           status = 'aprovado',
           starts_at = event_start,
           ends_at = null,
           all_day = true,
           location = 'A definir',
           requires_approval = false,
           notes = 'Data destacada no Calendário Sementinha — segundo semestre de 2026.',
           metadata = coalesce(metadata, '{}'::jsonb) || event_metadata,
           active = true,
           updated_at = now()
     where organization_id = tucxa_id
       and group_slug = item.group_slug;

    if not found then
      insert into public.agv_events (
        organization_id,
        title,
        event_type,
        status,
        starts_at,
        ends_at,
        all_day,
        location,
        group_slug,
        requires_approval,
        notes,
        metadata,
        active
      ) values (
        tucxa_id,
        item.title,
        item.event_type,
        'aprovado',
        event_start,
        null,
        true,
        'A definir',
        item.group_slug,
        false,
        'Data destacada no Calendário Sementinha — segundo semestre de 2026.',
        event_metadata,
        true
      );
    end if;
  end loop;
end $$;
