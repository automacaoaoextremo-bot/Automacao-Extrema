-- Automação Extrema — Presença Querida: ajustes Daniela 50 anos, landing pública, convidados e aprovação de convites.
-- Rode depois de 20260620_07_presenca_querida_cliente_fundador.sql.

create extension if not exists "pgcrypto";

alter table public.pq_events
  add column if not exists venue_instagram_url text,
  add column if not exists map_url text,
  add column if not exists location_notes text,
  add column if not exists host_photo_url text,
  add column if not exists host_photo_gallery jsonb not null default '[]'::jsonb,
  add column if not exists event_gallery jsonb not null default '[]'::jsonb,
  add column if not exists menu_gallery jsonb not null default '[]'::jsonb,
  add column if not exists attractions jsonb not null default '[]'::jsonb,
  add column if not exists menu_sections jsonb not null default '[]'::jsonb,
  add column if not exists buffet_name text,
  add column if not exists buffet_instagram_url text,
  add column if not exists drinks_provider_name text,
  add column if not exists drinks_provider_instagram_url text,
  add column if not exists cake_info text,
  add column if not exists location_positive_points jsonb not null default '[]'::jsonb,
  add column if not exists event_positive_points jsonb not null default '[]'::jsonb,
  add column if not exists privacy_notes text,
  add column if not exists landing_enabled boolean not null default true,
  add column if not exists public_status text not null default 'configuracao';

alter table public.pq_guests
  add column if not exists relationship_type text,
  add column if not exists relationship_label text,
  add column if not exists relationship_context text,
  add column if not exists invite_context text,
  add column if not exists message_preview text,
  add column if not exists approval_status text not null default 'pendente',
  add column if not exists is_active boolean not null default true,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by_person_id uuid references public.pq_people(id) on delete set null,
  add column if not exists rejected_at timestamptz;

alter table public.pq_guest_messages
  add column if not exists is_active boolean not null default true,
  add column if not exists approval_status text not null default 'pendente',
  add column if not exists approved_by_person_id uuid references public.pq_people(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists sort_order integer not null default 50;

create index if not exists idx_pq_guests_event_active on public.pq_guests(event_id, is_active);
create index if not exists idx_pq_guests_event_approval on public.pq_guests(event_id, approval_status);
create index if not exists idx_pq_guest_messages_event_approval on public.pq_guest_messages(event_id, approval_status);
create index if not exists idx_pq_guest_messages_guest_phase on public.pq_guest_messages(guest_id, message_phase);

-- Atualiza a view para ignorar convidados inativos nas estatísticas operacionais.
create or replace view public.pq_v_dashboard_events as
select
  e.id as event_id,
  e.name as event_name,
  e.slug as event_slug,
  e.event_type,
  e.event_date,
  count(g.id)::integer as total_guests,
  count(*) filter (where g.guest_status in ('confirmado','confirmado_com_acompanhantes'))::integer as confirmed_count,
  count(*) filter (where g.guest_status = 'talvez')::integer as maybe_count,
  count(*) filter (where g.guest_status = 'nao_podera_ir')::integer as declined_count,
  count(*) filter (where g.guest_status in ('pendente','reservou_data'))::integer as pending_count,
  coalesce(sum(g.adults_count), 0)::integer as adults_count,
  coalesce(sum(g.children_count), 0)::integer as children_count,
  coalesce(sum(g.companions_confirmed_count), 0)::integer as companions_count,
  case
    when count(g.id) = 0 then 0
    else round((count(*) filter (where g.guest_status not in ('pendente','reservou_data'))::numeric / count(g.id)::numeric) * 100, 0)
  end as response_rate
from public.pq_events e
left join public.pq_guests g on g.event_id = e.id and coalesce(g.is_active, true) = true
group by e.id, e.name, e.slug, e.event_type, e.event_date;

-- Evento real do case Daniela 50 anos.
with client_upsert as (
  insert into public.ae_clients (client_type, display_name, slug, email, whatsapp, city, state, status, notes, is_demo)
  values ('pessoa_fisica', 'Daniela 50 anos', 'daniela-50-anos-presenca-querida', 'demo@automacaoextrema.com', '5519999990000', 'Campinas', 'SP', 'piloto', 'Case real Presença Querida — Daniela 50 anos.', false)
  on conflict (slug) do update set display_name = excluded.display_name, city = excluded.city, state = excluded.state, updated_at = now()
  returning id
)
insert into public.pq_events (
  ae_client_id,
  event_type,
  name,
  slug,
  host_name,
  event_date,
  event_time,
  venue_name,
  address,
  city,
  state,
  whatsapp,
  email,
  public_headline,
  invitation_message,
  dress_code,
  parking_info,
  venue_instagram_url,
  map_url,
  host_photo_url,
  host_photo_gallery,
  event_gallery,
  menu_gallery,
  attractions,
  menu_sections,
  buffet_name,
  buffet_instagram_url,
  drinks_provider_name,
  drinks_provider_instagram_url,
  cake_info,
  location_positive_points,
  event_positive_points,
  privacy_notes,
  landing_enabled,
  public_status,
  status,
  is_surprise,
  is_demo,
  notes
)
select
  client_upsert.id,
  'aniversario',
  'Daniela 50 anos',
  'daniela-50-anos',
  'Daniela',
  '2026-12-19',
  '12h30 às 17h30',
  'Chácara Piloto',
  'Chácara Piloto, Campinas - SP',
  'Campinas',
  'SP',
  '5519999990000',
  'demo@automacaoextrema.com',
  'Sua presença é muito querida nos 50 anos da Daniela.',
  'A Daniela vai celebrar 50 anos cercada de pessoas que fazem parte da história dela. Confirme sua presença pelo link individual para nos ajudar a preparar tudo com carinho, previsibilidade e cuidado.',
  'Venha confortável para um almoço de celebração, música ao vivo e momentos especiais.',
  'Confira o endereço pelo Google Maps antes de sair e chegue com tranquilidade.',
  'https://www.instagram.com/chacara.piloto?igsh=MWxobnJham9tMXQyZg==',
  'https://www.google.com/maps/search/?api=1&query=Ch%C3%A1cara%20Piloto%20Campinas%20SP',
  '/presenca-querida/daniela-50-anos/daniela-01.jpeg',
  '["/presenca-querida/daniela-50-anos/daniela-01.jpeg","/presenca-querida/daniela-50-anos/daniela-02.jpeg","/presenca-querida/daniela-50-anos/daniela-03.jpeg"]'::jsonb,
  '["/presenca-querida/daniela-50-anos/daniela-01.jpeg","/presenca-querida/daniela-50-anos/daniela-02.jpeg","/presenca-querida/daniela-50-anos/daniela-03.jpeg"]'::jsonb,
  '["/presenca-querida/daniela-50-anos/cardapio-01.jpeg","/presenca-querida/daniela-50-anos/cardapio-02.jpeg","/presenca-querida/daniela-50-anos/cardapio-03.jpeg","/presenca-querida/daniela-50-anos/cardapio-04.jpeg","/presenca-querida/daniela-50-anos/cardapio-05.jpeg","/presenca-querida/daniela-50-anos/cardapio-06.jpeg","/presenca-querida/daniela-50-anos/cardapio-07.jpeg","/presenca-querida/daniela-50-anos/cardapio-08.jpeg","/presenca-querida/daniela-50-anos/cardapio-09.jpeg","/presenca-querida/daniela-50-anos/cardapio-10.jpeg","/presenca-querida/daniela-50-anos/cardapio-11.jpeg"]'::jsonb,
  '[{"title":"Banda Raça de Quintal","subtitle":"Samba, alegria e clima de celebração","time":"13h30 às 16h30","description":"A trilha principal da tarde fica por conta da Banda Raça de Quintal, trazendo música ao vivo para deixar a comemoração ainda mais viva e memorável.","instagramUrl":"https://www.instagram.com/racadequintal?igsh=NmZjOGJxenNic3Ni"},{"title":"DJ Gabriel Mattano","subtitle":"Antes e depois da banda","time":"Fora do período da banda","description":"Nos intervalos da programação ao vivo, o DJ Gabriel Mattano mantém o clima gostoso da festa com seleção musical para acolher os convidados.","instagramUrl":"https://www.instagram.com/mattanos_vintage?igsh=MTVld2xsbXd5czNxbA=="}]'::jsonb,
  '[{"title":"Entradinhas e acompanhamentos","items":["Churipam com chimichurri","Guacamole com doritos caseiro","Pão de alho","Mandioca frita","Batata frita","Salada Caesar","Maionese de legumes","Salada marroquina","Vinagrete","Farofa"]},{"title":"Carnes e pratos quentes","items":["Contra filé","Maminha","Linguiça","Tulipa de frango","Arroz branco","Arroz primavera","Feijão gordo"]},{"title":"Bebidas e sobremesa","items":["Coca-Cola","Guaraná","Água aromatizada","Chopp Kremer","Bolo de abacaxi","Docinhos"]}]'::jsonb,
  'J_M Festas',
  'https://www.instagram.com/magali.goes.9?igsh=cW50c2dyamFmYmNp',
  'Chopp Kremer Campinas',
  'https://www.instagram.com/choppkremercampinas/',
  'Bolo de abacaxi e docinhos para fechar a tarde com doçura.',
  '["Espaço de chácara para um almoço leve, familiar e acolhedor.","Horário diurno, das 12h30 às 17h30, ideal para celebrar com tranquilidade.","Endereço com acesso direto pelo Google Maps para reduzir dúvidas dos convidados."]'::jsonb,
  '["Música ao vivo com a Banda Raça de Quintal no melhor momento da tarde.","DJ antes e depois da banda para manter a energia da festa.","Buffet completo, bebidas, chopp, bolo e docinhos para receber bem cada pessoa querida."]'::jsonb,
  'Dados usados somente para organização do evento, confirmação de presença e comunicação com convidados.',
  true,
  'publicado',
  'configuracao',
  false,
  false,
  'Case Cliente Fundador Presença Querida — Daniela 50 anos.'
from client_upsert
on conflict (slug) do update set
  event_date = excluded.event_date,
  event_time = excluded.event_time,
  venue_name = excluded.venue_name,
  address = excluded.address,
  city = excluded.city,
  state = excluded.state,
  public_headline = excluded.public_headline,
  invitation_message = excluded.invitation_message,
  dress_code = excluded.dress_code,
  parking_info = excluded.parking_info,
  venue_instagram_url = excluded.venue_instagram_url,
  map_url = excluded.map_url,
  host_photo_url = excluded.host_photo_url,
  host_photo_gallery = excluded.host_photo_gallery,
  event_gallery = excluded.event_gallery,
  menu_gallery = excluded.menu_gallery,
  attractions = excluded.attractions,
  menu_sections = excluded.menu_sections,
  buffet_name = excluded.buffet_name,
  buffet_instagram_url = excluded.buffet_instagram_url,
  drinks_provider_name = excluded.drinks_provider_name,
  drinks_provider_instagram_url = excluded.drinks_provider_instagram_url,
  cake_info = excluded.cake_info,
  location_positive_points = excluded.location_positive_points,
  event_positive_points = excluded.event_positive_points,
  privacy_notes = excluded.privacy_notes,
  landing_enabled = excluded.landing_enabled,
  public_status = excluded.public_status,
  updated_at = now();

-- Dados de exemplo para validar parentesco/relacionamento e mensagens personalizadas.
with ev as (select id from public.pq_events where slug = 'daniela-50-anos'),
rows(full_name, whatsapp, group_name, relationship_label, relationship_context, adults_count, children_count, companions_allowed, notes) as (
  values
    ('Ana Paula', '5519999991111', 'Família', 'Prima', null, 1, 0, 1, 'Convidada próxima da família.'),
    ('Carlos Roberto', '5519999992222', 'Trabalho', null, 'Amigo do trabalho e das celebrações importantes', 1, 0, 0, 'Confirmar se vai direto para a chácara.'),
    ('Marina e João', '5519999993333', 'Amigos', null, 'Casal de amigos da Daniela', 2, 1, 0, 'Casal com uma criança.'),
    ('Tia Lúcia', '5519999994444', 'Família', 'Tia', null, 1, 0, 2, 'Vai com duas pessoas.'),
    ('Rafael', '5519999995555', 'Grupo espiritual', null, 'Amigo do grupo espiritual', 1, 0, 0, 'Validar disponibilidade.')
)
insert into public.pq_guests (event_id, full_name, whatsapp, group_name, relationship_type, relationship_label, relationship_context, invite_context, guest_status, adults_count, children_count, companions_allowed, companions_confirmed_count, notes, is_active)
select ev.id, rows.full_name, rows.whatsapp, rows.group_name,
  case when rows.relationship_label is not null then 'parentesco' else 'relacionamento' end,
  rows.relationship_label,
  rows.relationship_context,
  coalesce(rows.relationship_label, rows.relationship_context, rows.group_name),
  'pendente', rows.adults_count, rows.children_count, rows.companions_allowed, 0, rows.notes, true
from ev, rows
where not exists (
  select 1 from public.pq_guests g where g.event_id = ev.id and g.full_name = rows.full_name and coalesce(g.whatsapp, '') = coalesce(rows.whatsapp, '')
);
