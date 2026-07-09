-- Organização em Harmonia — ajustes Filho da Corrente, funções e Agenda Tucxa.
-- Seguro para rodar mais de uma vez no Supabase SQL Editor.

alter table if exists public.agv_events
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists all_day boolean not null default false,
  add column if not exists recurrence_rule text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
declare
  tucxa_id uuid;
begin
  select id into tucxa_id
  from public.oh_organizations
  where slug = 'tucxa' or name ilike '%tucxa%'
  order by created_at desc
  limit 1;

  if tucxa_id is null then
    return;
  end if;

  -- Funções disponíveis na área logada / Base Única.
  insert into public.oh_roles (organization_id, name, slug, description, active, is_system)
  select tucxa_id, item.name, item.slug, item.description, true, false
  from (values
    ('Coordenação Grupo de Estudos', 'coordenacao-grupo-estudos', 'Responsável por organizar, confirmar datas e orientar o Grupo de Estudos.'),
    ('Coordenação Clube do Livro', 'coordenacao-clube-livro', 'Responsável por organizar encontros do Clube do Livro e Clube do Livro Extra.'),
    ('Coordenação Sementinha', 'coordenacao-sementinha', 'Responsável por coordenar ações do Sementinha.'),
    ('Voluntário Sementinha', 'voluntario-sementinha', 'Apoia ações, bazares, campanhas e atividades do Sementinha.'),
    ('Coordenação de Eventos', 'coordenacao-eventos', 'Responsável por organizar eventos culturais, confraternizações e ações da casa.'),
    ('Voluntário Eventos', 'voluntario-eventos', 'Apoia eventos, recepção, montagem, divulgação e operação no dia.')
  ) as item(name, slug, description)
  where not exists (
    select 1
    from public.oh_roles existing
    where existing.organization_id = tucxa_id
      and existing.slug = item.slug
  );

  update public.oh_roles
  set active = true,
      is_system = coalesce(is_system, false)
  where organization_id = tucxa_id
    and slug in (
      'coordenacao-grupo-estudos',
      'coordenacao-clube-livro',
      'coordenacao-sementinha',
      'voluntario-sementinha',
      'coordenacao-eventos',
      'voluntario-eventos'
    );

  -- Eventos obrigatórios para todos não aparecem no primeiro acesso como opção seletiva.
  update public.agv_events
  set metadata = coalesce(metadata, '{}'::jsonb) || '{"mandatoryForAll": true, "requiredForAllFilhosDaCorrente": true, "hideFromFirstAccess": true}'::jsonb,
      updated_at = now()
  where organization_id = tucxa_id
    and (
      lower(coalesce(title, '')) like '%todos os cavalinhos%'
      or lower(coalesce(title, '')) like '%todos os filhos%'
      or lower(coalesce(notes, '')) like '%todos os cavalinhos%'
      or lower(coalesce(notes, '')) like '%todos os filhos%'
    );

  -- Caminhada TUCXA: 11/07/2026, 16h às 17h.
  update public.agv_events
  set starts_at = '2026-07-11 16:00:00-03',
      ends_at = '2026-07-11 17:00:00-03',
      location = coalesce(nullif(location, ''), 'A confirmar'),
      group_slug = 'caminhada-tucxa',
      event_type = coalesce(nullif(event_type, ''), 'evento-cultural'),
      status = case when status in ('rascunho', 'pendente_aprovacao') then 'aprovado' else status end,
      metadata = coalesce(metadata, '{}'::jsonb) || '{"source":"calendario-julho-cultural-2026","publicOption":true,"displayTitle":"Caminhada TUCXA","dateLabel":"Sábado, 11/07/2026","timeLabel":"16h às 17h","imageEmoji":"🚶"}'::jsonb,
      updated_at = now()
  where organization_id = tucxa_id
    and lower(coalesce(title, '')) like '%caminhada%tucxa%';

  if not exists (
    select 1 from public.agv_events
    where organization_id = tucxa_id and group_slug = 'caminhada-tucxa'
  ) then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, metadata)
    values (tucxa_id, 'Caminhada TUCXA', 'evento-cultural', 'aprovado', '2026-07-11 16:00:00-03', '2026-07-11 17:00:00-03', false, 'A confirmar', 'caminhada-tucxa', false, 'Evento do calendário Julho Cultural.', '{"source":"calendario-julho-cultural-2026","publicOption":true,"displayTitle":"Caminhada TUCXA","dateLabel":"Sábado, 11/07/2026","timeLabel":"16h às 17h","imageEmoji":"🚶"}'::jsonb);
  end if;

  -- Grupo de Estudos: quinzenal aos domingos, datas confirmadas pelos coordenadores.
  update public.agv_events
  set starts_at = coalesce(starts_at, '2026-07-12 15:00:00-03'),
      ends_at = coalesce(ends_at, '2026-07-12 17:00:00-03'),
      recurrence_rule = 'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=SU',
      group_slug = 'grupo-estudos',
      event_type = coalesce(nullif(event_type, ''), 'grupo-estudos'),
      status = case when status in ('rascunho', 'pendente_aprovacao') then 'aprovado' else status end,
      metadata = coalesce(metadata, '{}'::jsonb) || '{"source":"calendario-julho-cultural-2026","publicOption":true,"recurring":true,"recurrenceFrequency":"quinzenal","recurrenceWeekday":"domingo","recurrenceLabel":"A cada 15 dias, conforme datas confirmadas","dateLabel":"Domingo","timeLabel":"15h às 17h","imageEmoji":"💡"}'::jsonb,
      updated_at = now()
  where organization_id = tucxa_id
    and lower(coalesce(title, '')) like '%grupo de estudos%';

  if not exists (
    select 1 from public.agv_events
    where organization_id = tucxa_id and group_slug = 'grupo-estudos'
  ) then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, recurrence_rule, metadata)
    values (tucxa_id, 'Grupo de Estudos', 'grupo-estudos', 'aprovado', '2026-07-12 15:00:00-03', '2026-07-12 17:00:00-03', false, 'Tucxa', 'grupo-estudos', false, 'Ocorre a cada 15 dias, aos domingos, conforme datas confirmadas pelos coordenadores.', 'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=SU', '{"source":"calendario-julho-cultural-2026","publicOption":true,"recurring":true,"recurrenceFrequency":"quinzenal","recurrenceWeekday":"domingo","recurrenceLabel":"A cada 15 dias, conforme datas confirmadas","dateLabel":"Domingo","timeLabel":"15h às 17h","imageEmoji":"💡"}'::jsonb);
  end if;

  -- Clube do Livro Mensal: última sexta-feira do mês, 19h às 20h30.
  if not exists (
    select 1 from public.agv_events
    where organization_id = tucxa_id and group_slug = 'clube-livro-mensal'
  ) then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, recurrence_rule, metadata)
    values (tucxa_id, 'Clube do Livro Mensal', 'clube-livro', 'aprovado', '2026-07-31 19:00:00-03', '2026-07-31 20:30:00-03', false, 'A confirmar', 'clube-livro-mensal', false, 'Ocorre toda última sexta-feira do mês.', 'RRULE:FREQ=MONTHLY;BYDAY=FR;BYSETPOS=-1', '{"source":"calendario-julho-cultural-2026","publicOption":true,"recurring":true,"recurrenceFrequency":"mensal","recurrenceWeekday":"sexta","recurrenceLabel":"Recorrência mensal, toda última sexta-feira do mês","dateLabel":"Última sexta-feira do mês","timeLabel":"19h às 20h30","imageEmoji":"📚"}'::jsonb);
  else
    update public.agv_events
    set title = 'Clube do Livro Mensal',
        starts_at = '2026-07-31 19:00:00-03',
        ends_at = '2026-07-31 20:30:00-03',
        recurrence_rule = 'RRULE:FREQ=MONTHLY;BYDAY=FR;BYSETPOS=-1',
        event_type = 'clube-livro',
        status = case when status in ('rascunho', 'pendente_aprovacao') then 'aprovado' else status end,
        metadata = coalesce(metadata, '{}'::jsonb) || '{"source":"calendario-julho-cultural-2026","publicOption":true,"recurring":true,"recurrenceFrequency":"mensal","recurrenceWeekday":"sexta","recurrenceLabel":"Recorrência mensal, toda última sexta-feira do mês","dateLabel":"Última sexta-feira do mês","timeLabel":"19h às 20h30","imageEmoji":"📚"}'::jsonb,
        updated_at = now()
    where organization_id = tucxa_id and group_slug = 'clube-livro-mensal';
  end if;

  -- Encerramento anual: manter no fim, horário a definir.
  update public.agv_events
  set title = 'Encerramento Anual',
      starts_at = '2026-12-20 00:00:00-03',
      ends_at = null,
      all_day = false,
      group_slug = 'encerramento-anual',
      event_type = coalesce(nullif(event_type, ''), 'evento-cultural'),
      metadata = coalesce(metadata, '{}'::jsonb) || '{"source":"calendario-tucxa-2026","publicOption":true,"displayTitle":"Encerramento Anual","dateLabel":"Domingo, 20/12/2026","timeLabel":"Horário a definir","timeUndefined":true}'::jsonb,
      updated_at = now()
  where organization_id = tucxa_id
    and (lower(coalesce(title, '')) like '%encerramento%' or group_slug in ('encerramento-2026', 'encerramento-anual'));

  if not exists (
    select 1 from public.agv_events
    where organization_id = tucxa_id and group_slug = 'encerramento-anual'
  ) then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, metadata)
    values (tucxa_id, 'Encerramento Anual', 'evento-cultural', 'aprovado', '2026-12-20 00:00:00-03', null, false, 'Tucxa', 'encerramento-anual', false, 'Encerramento anual indicado no calendário anual.', '{"source":"calendario-tucxa-2026","publicOption":true,"displayTitle":"Encerramento Anual","dateLabel":"Domingo, 20/12/2026","timeLabel":"Horário a definir","timeUndefined":true}'::jsonb);
  end if;

  -- Horários oficiais dos atendimentos recorrentes do Tucxa.
  if not exists (select 1 from public.agv_events where organization_id = tucxa_id and group_slug = 'atendimento-segunda') then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, recurrence_rule, metadata)
    values (tucxa_id, 'Atendimento aos filhos de fora — Segunda-feira', 'grupo-segunda-feira', 'recorrente', '2026-07-13 18:00:00-03', '2026-07-13 22:00:00-03', false, 'Tucxa', 'atendimento-segunda', false, 'Horário de funcionamento 18h às 22h. Abertura 18h30. Porta fecha 19h20 e reabre 20h.', 'RRULE:FREQ=WEEKLY;BYDAY=MO', '{"publicOption":true,"recurring":true,"recurrenceFrequency":"semanal","recurrenceWeekday":"segunda","recurrenceLabel":"Recorrência semanal","dateLabel":"Segunda-feira","timeLabel":"18h às 22h • Abertura 18h30 • Porta fecha 19h20 e reabre 20h"}'::jsonb);
  end if;

  if not exists (select 1 from public.agv_events where organization_id = tucxa_id and group_slug = 'atendimento-terca') then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, recurrence_rule, metadata)
    values (tucxa_id, 'Atendimento aos filhos de fora — Terça-feira', 'grupo-terca-feira', 'recorrente', '2026-07-14 18:00:00-03', '2026-07-14 22:00:00-03', false, 'Tucxa', 'atendimento-terca', false, 'Horário de funcionamento 18h às 22h. Abertura 18h30. Porta fecha 19h20 e reabre 20h.', 'RRULE:FREQ=WEEKLY;BYDAY=TU', '{"publicOption":true,"recurring":true,"recurrenceFrequency":"semanal","recurrenceWeekday":"terca","recurrenceLabel":"Recorrência semanal","dateLabel":"Terça-feira","timeLabel":"18h às 22h • Abertura 18h30 • Porta fecha 19h20 e reabre 20h"}'::jsonb);
  end if;

  if not exists (select 1 from public.agv_events where organization_id = tucxa_id and group_slug = 'tratamento-transformacao-quarta') then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, recurrence_rule, metadata)
    values (tucxa_id, 'Tratamento espiritual / Transformação — Quarta-feira', 'tratamento-espiritual-transformacao', 'recorrente', '2026-07-15 18:30:00-03', '2026-07-15 22:00:00-03', false, 'Tucxa', 'tratamento-transformacao-quarta', false, 'Conforme encaminhamento. Funcionamento 18h30 às 22h. Abertura 18h45. Porta fecha 19h.', 'RRULE:FREQ=WEEKLY;BYDAY=WE', '{"publicOption":true,"recurring":true,"recurrenceFrequency":"semanal","recurrenceWeekday":"quarta","recurrenceLabel":"Conforme encaminhamento","dateLabel":"Quarta-feira","timeLabel":"18h30 às 22h • Abertura 18h45 • Porta fecha 19h"}'::jsonb);
  end if;

  if not exists (select 1 from public.agv_events where organization_id = tucxa_id and group_slug = 'quinta-grupo-1') then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, recurrence_rule, metadata)
    values (tucxa_id, 'Quinta - Grupo 1', 'quinta-grupo-1', 'recorrente', '2026-07-16 18:00:00-03', '2026-07-16 22:00:00-03', false, 'Tucxa', 'quinta-grupo-1', false, '1ª e 3ª quinta-feira do mês. Funcionamento 18h às 22h. Abertura 19h. Porta fecha 19h30 e reabre 20h.', 'RRULE:FREQ=MONTHLY;BYDAY=TH;BYSETPOS=1,3', '{"publicOption":true,"recurring":true,"recurrenceFrequency":"mensal","recurrenceWeekday":"quinta","recurrenceLabel":"1ª e 3ª quinta-feira do mês","dateLabel":"Quinta-feira","timeLabel":"18h às 22h • Abertura 19h • Porta fecha 19h30 e reabre 20h"}'::jsonb);
  end if;

  if not exists (select 1 from public.agv_events where organization_id = tucxa_id and group_slug = 'quinta-grupo-2') then
    insert into public.agv_events (organization_id, title, event_type, status, starts_at, ends_at, all_day, location, group_slug, requires_approval, notes, recurrence_rule, metadata)
    values (tucxa_id, 'Quinta - Grupo 2', 'quinta-grupo-2', 'recorrente', '2026-07-09 18:00:00-03', '2026-07-09 22:00:00-03', false, 'Tucxa', 'quinta-grupo-2', false, '2ª e 4ª quinta-feira do mês. Funcionamento 18h às 22h. Abertura 19h. Porta fecha 19h30 e reabre 20h.', 'RRULE:FREQ=MONTHLY;BYDAY=TH;BYSETPOS=2,4', '{"publicOption":true,"recurring":true,"recurrenceFrequency":"mensal","recurrenceWeekday":"quinta","recurrenceLabel":"2ª e 4ª quinta-feira do mês","dateLabel":"Quinta-feira","timeLabel":"18h às 22h • Abertura 19h • Porta fecha 19h30 e reabre 20h"}'::jsonb);
  end if;
end $$;
