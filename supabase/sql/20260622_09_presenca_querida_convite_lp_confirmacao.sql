-- Presença Querida | Ajustes convite curto + confirmação na LP + convidados vinculados
-- Rodar depois de 20260622_08_presenca_querida_daniela50_ajustes.sql

begin;

alter table public.pq_guests
  add column if not exists primary_guest_id uuid references public.pq_guests(id) on delete set null,
  add column if not exists household_label text,
  add column if not exists is_invite_recipient boolean not null default true;

create index if not exists idx_pq_guests_primary_guest on public.pq_guests(event_id, primary_guest_id);
create index if not exists idx_pq_guests_invite_recipient on public.pq_guests(event_id, is_invite_recipient);

-- Garante que convidados já existentes continuem recebendo convite próprio até serem vinculados manualmente.
update public.pq_guests
set is_invite_recipient = true
where is_invite_recipient is null;

-- Atualiza a mensagem pública da landing do evento Daniela 50 anos para não competir com a mensagem curta do WhatsApp.
update public.pq_events
set
  invitation_message = 'A Daniela vai celebrar 50 anos cercada de pessoas que fazem parte da história dela. Esta página reúne os detalhes da festa e, para quem recebeu o link individual, também permite confirmar presença com carinho.',
  public_headline = coalesce(nullif(public_headline, ''), 'Sua presença é muito querida nos 50 anos da Daniela.'),
  updated_at = now()
where slug in ('daniela-50-anos', 'daniela-50-anos-demo')
   or lower(name) like '%daniela 50%';

-- Remove o conceito de acompanhante livre no case Daniela 50 anos: convidados vinculados devem ser cadastrados como pessoas reais.
update public.pq_guests g
set companions_allowed = 0,
    companions_confirmed_count = 0,
    updated_at = now()
where exists (
  select 1
  from public.pq_events e
  where e.id = g.event_id
    and (e.slug in ('daniela-50-anos', 'daniela-50-anos-demo') or lower(e.name) like '%daniela 50%')
);

-- Exemplo idempotente para validar convite vinculado: Leticia recebe, Gabriel fica vinculado a ela.
with ev as (
  select id
  from public.pq_events
  where slug in ('daniela-50-anos', 'daniela-50-anos-demo') or lower(name) like '%daniela 50%'
  order by created_at desc
  limit 1
), leticia as (
  insert into public.pq_guests (
    event_id, full_name, whatsapp, group_name, relationship_type, relationship_label, relationship_context,
    invite_context, guest_status, adults_count, children_count, companions_allowed, companions_confirmed_count,
    household_label, is_invite_recipient, is_active, notes
  )
  select
    ev.id,
    'Leticia',
    '5519999991111',
    'Família',
    'parentesco',
    'Prima',
    'família da Dani',
    'Prima da Dani e presença querida da família.',
    'pendente',
    1,
    0,
    0,
    0,
    'Família da Leticia',
    true,
    true,
    'Exemplo de convidada principal para validação do vínculo familiar.'
  from ev
  where not exists (
    select 1 from public.pq_guests g where g.event_id = ev.id and lower(g.full_name) = 'leticia'
  )
  returning id, event_id
), leticia_ref as (
  select id, event_id from leticia
  union all
  select g.id, g.event_id
  from public.pq_guests g
  join ev on ev.id = g.event_id
  where lower(g.full_name) = 'leticia'
  limit 1
)
insert into public.pq_guests (
  event_id, full_name, whatsapp, group_name, relationship_type, relationship_label, relationship_context,
  invite_context, guest_status, adults_count, children_count, companions_allowed, companions_confirmed_count,
  primary_guest_id, household_label, is_invite_recipient, is_active, notes
)
select
  leticia_ref.event_id,
  'Gabriel',
  null,
  'Família',
  'parentesco',
  'Marido da Leticia',
  'família da Dani',
  'Convidado vinculado ao convite da Leticia.',
  'pendente',
  1,
  0,
  0,
  0,
  leticia_ref.id,
  'Família da Leticia',
  false,
  true,
  'Exemplo de convidado vinculado sem WhatsApp próprio.'
from leticia_ref
where not exists (
  select 1 from public.pq_guests g where g.event_id = leticia_ref.event_id and lower(g.full_name) = 'gabriel' and g.primary_guest_id = leticia_ref.id
);

-- Templates operacionais por fase para reforçar a estratégia Deep Dive sem parecer cobrança.
with ev as (
  select id
  from public.pq_events
  where slug in ('daniela-50-anos', 'daniela-50-anos-demo') or lower(name) like '%daniela 50%'
  order by created_at desc
  limit 1
), templates(message_phase, template_label, message_text, scheduled_at) as (
  values
    (
      'lembrete_confirmados',
      'Lembrete para confirmados',
      'Oi, {{nome}}! Passando só para relembrar com carinho os detalhes da festa da Dani: horário, local e orientações finais estão no link do convite. Estamos felizes em contar com sua presença.',
      '2026-12-12 09:00:00-03'::timestamptz
    ),
    (
      'lembrete_talvez',
      'Lembrete para talvez',
      'Oi, {{nome}}! Como dezembro costuma ter muitos compromissos, estamos fechando a lista da festa da Dani até 30/11 para organizar buffet, bebidas e recepção com calma. Você acha que conseguirá estar com a gente?',
      '2026-11-25 09:00:00-03'::timestamptz
    ),
    (
      'lembrete_pendentes',
      'Lembrete para pendentes',
      'Oi, {{nome}}! A Dani ficaria muito feliz com sua presença. Como a festa será em dezembro e a agenda de fim de ano costuma encher rápido, sua confirmação até 30/11 ajuda muito a família a preparar tudo com carinho.',
      '2026-11-20 09:00:00-03'::timestamptz
    ),
    (
      'prazo_final',
      'Prazo final de confirmação',
      'Oi, {{nome}}! Hoje é o prazo ideal para confirmar a presença na festa da Dani. Sua resposta ajuda a fechar buffet, bebidas, mesas e recepção sem correria. Pode responder pelo link do convite?',
      '2026-11-30 09:00:00-03'::timestamptz
    )
)
insert into public.pq_guest_messages (event_id, guest_id, message_phase, channel, template_label, message_text, status, scheduled_at, approval_status, is_active)
select ev.id, null, templates.message_phase, 'whatsapp', templates.template_label, templates.message_text, 'rascunho', templates.scheduled_at, 'pendente', true
from ev
cross join templates
where not exists (
  select 1
  from public.pq_guest_messages m
  where m.event_id = ev.id
    and m.guest_id is null
    and m.message_phase = templates.message_phase
);

commit;
