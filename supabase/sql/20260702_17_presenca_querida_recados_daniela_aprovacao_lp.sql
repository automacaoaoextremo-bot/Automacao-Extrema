-- Presença Querida — recados da Daniela: aprovação, backfill e LP.
-- Execute depois dos SQLs anteriores do Presença Querida.

begin;

alter table public.pq_guest_messages
  add column if not exists is_active boolean not null default true,
  add column if not exists approval_status text not null default 'pendente',
  add column if not exists approved_by_person_id uuid references public.pq_people(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists sort_order integer not null default 50;

create index if not exists idx_pq_guest_messages_recados_landing
  on public.pq_guest_messages(event_id, approval_status, is_active, approved_at desc, created_at desc)
  where message_phase = 'recado_convidado';

create index if not exists idx_pq_guest_messages_recados_guest
  on public.pq_guest_messages(event_id, guest_id, message_phase, created_at desc)
  where message_phase = 'recado_convidado';

-- Trata recados já enviados anteriormente no campo pq_guests.notes, como o caso da Mariana.
-- Eles entram como pendentes de aprovação; nada é publicado automaticamente.
with source_notes as (
  select
    g.event_id,
    g.id as guest_id,
    trim(g.notes) as note_text,
    coalesce(g.confirmed_at, g.updated_at, g.created_at, now()) as note_created_at
  from public.pq_guests g
  join public.pq_events e on e.id = g.event_id
  where coalesce(trim(g.notes), '') <> ''
    and (e.slug in ('daniela-50-anos', 'daniela-50-anos-demo') or lower(e.name) like '%daniela 50%')
)
insert into public.pq_guest_messages (
  event_id,
  guest_id,
  message_phase,
  channel,
  template_label,
  message_text,
  status,
  approval_status,
  is_active,
  sort_order,
  created_at,
  updated_at
)
select
  source_notes.event_id,
  source_notes.guest_id,
  'recado_convidado',
  'landing_page',
  'Recado enviado pelo convidado',
  source_notes.note_text,
  'aguardando_aprovacao',
  'pendente',
  true,
  30,
  source_notes.note_created_at,
  now()
from source_notes
where not exists (
  select 1
  from public.pq_guest_messages existing
  where existing.event_id = source_notes.event_id
    and existing.guest_id = source_notes.guest_id
    and existing.message_phase = 'recado_convidado'
    and trim(existing.message_text) = source_notes.note_text
);

-- Atualiza modelos de lembrete da Daniela para citar a novidade dos recados aprovados na LP.
with ev as (
  select id
  from public.pq_events
  where slug in ('daniela-50-anos', 'daniela-50-anos-demo') or lower(name) like '%daniela 50%'
), templates(message_phase, template_label, message_text) as (
  values
    (
      'lembrete_confirmados',
      'Lembrete para confirmados',
      'Oi, {{nome}}! Passando só para relembrar com carinho os detalhes da festa da Dani: horário, local, mapa e orientações estão no link do convite. Também incluímos a seção "Recados para a Dani", com mensagens aprovadas pela família, para já aquecer esse clima de memória afetiva antes da festa.'
    ),
    (
      'lembrete_talvez',
      'Lembrete para talvez',
      'Oi, {{nome}}! A Dani ficaria muito feliz com sua presença. Se ainda estiver em dúvida, dá uma olhadinha no link do convite: além dos detalhes da festa, agora também existe o espaço para deixar um recado carinhoso para ela. A confirmação até 19/11 ajuda a família a organizar tudo com calma.'
    ),
    (
      'lembrete_pendentes',
      'Lembrete para pendentes',
      'Oi, {{nome}}! A Dani quer celebrar os 50 anos cercada de pessoas que fazem parte da história dela. No link do convite, além dos detalhes da festa, agora você também pode deixar uma curiosidade ou recado carinhoso. Sua confirmação até 19/11 ajuda muito na organização do buffet, bebidas e recepção.'
    ),
    (
      'prazo_final',
      'Prazo final de confirmação',
      'Oi, {{nome}}! Hoje é o prazo ideal para confirmar presença na festa da Dani. Sua resposta ajuda a fechar buffet, bebidas, mesas e recepção sem correria. No mesmo link, você também pode deixar um recado para ela; os recados aprovados poderão aparecer na seção "Recados para a Dani".'
    )
)
update public.pq_guest_messages m
set
  template_label = templates.template_label,
  message_text = templates.message_text,
  updated_at = now()
from ev
join templates on true
where m.event_id = ev.id
  and m.guest_id is null
  and m.message_phase = templates.message_phase;

commit;
