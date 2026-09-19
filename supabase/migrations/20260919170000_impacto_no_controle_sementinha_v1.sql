-- Impacto no Controle integrado à Automação Extrema — piloto Sementinha v1
-- Migração não destrutiva. Todas as entidades usam prefixo inc_ para coexistir
-- com os demais módulos no mesmo projeto Supabase.

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Função compartilhada SOMENTE do módulo Impacto no Controle
-- -----------------------------------------------------------------------------
create or replace function public.inc_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tabelas
-- -----------------------------------------------------------------------------
create table if not exists public.inc_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  primary_color text not null default '#2F7D46',
  secondary_color text not null default '#8BB73E',
  pix_key text,
  pix_receiver_name text,
  pix_city text default 'Campinas',
  responsible_name text,
  responsible_whatsapp text,
  responsible_email text,
  privacy_text text not null default 'Usaremos seus dados apenas para identificar sua participação nesta ação e facilitar futuras ações solidárias. Você pode solicitar remoção a qualquer momento.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inc_app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  client_id uuid references public.inc_clients(id) on delete set null,
  role text not null default 'client_admin' check (role in ('owner','client_admin','operator','viewer')),
  name text,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.inc_campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.inc_clients(id) on delete cascade,
  slug text not null unique,
  type text not null default 'numbers' check (type in ('numbers','quotas','numbers_quotas','crowdfunding','auction','direct_items','repasse')),
  title text not null,
  subtitle text,
  story text,
  prize_title text,
  prize_description text,
  prize_image_url text,
  main_image_url text,
  gallery_images jsonb not null default '[]'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft' check (status in ('draft','active','paused','closed','accountability_published')),
  target_amount_cents integer not null default 0 check (target_amount_cents >= 0),
  extended_amount_cents integer not null default 0 check (extended_amount_cents >= 0),
  impact_unit text not null default 'participações',
  impact_value_cents integer not null default 0 check (impact_value_cents >= 0),
  number_count integer not null default 0 check (number_count >= 0),
  number_price_cents integer not null default 0 check (number_price_cents >= 0),
  pix_key text,
  pix_receiver_name text,
  pix_city text,
  regulation_text text,
  data_consent_text text not null default 'Estou ciente de que meus dados serão usados para confirmar minha participação nesta ação e facilitar futuras ações solidárias, sem necessidade de preencher tudo novamente. Posso solicitar remoção depois.',
  show_buyer_names boolean not null default true,
  reservation_minutes integer not null default 30 check (reservation_minutes >= 5),
  intro_modal_enabled boolean not null default false,
  intro_modal_title text,
  intro_modal_body text,
  created_by uuid references public.inc_app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inc_campaign_numbers (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.inc_campaigns(id) on delete cascade,
  number integer not null check (number > 0),
  status text not null default 'available' check (status in ('available','reserved','pending_approval','confirmed','canceled')),
  participant_id uuid,
  contribution_id uuid,
  buyer_display_name text,
  reserved_until timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, number)
);

create table if not exists public.inc_campaign_quotas (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.inc_campaigns(id) on delete cascade,
  title text not null,
  description text,
  amount_cents integer not null check (amount_cents >= 0),
  impact_qty numeric(10,2),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.inc_participants (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.inc_clients(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, phone)
);

-- FKs circulares somente depois de participants/contributions existirem.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'inc_campaign_numbers_participant_fk'
  ) then
    alter table public.inc_campaign_numbers
      add constraint inc_campaign_numbers_participant_fk
      foreign key (participant_id) references public.inc_participants(id) on delete set null;
  end if;
end $$;

create table if not exists public.inc_contributions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.inc_campaigns(id) on delete cascade,
  participant_id uuid not null references public.inc_participants(id) on delete cascade,
  type text not null default 'numbers' check (type in ('numbers','quota','mixed','donation','auction','direct_item','repasse')),
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment','pending_approval','approved','rejected','canceled')),
  amount_cents integer not null check (amount_cents >= 0),
  selected_numbers integer[] not null default '{}',
  selected_quotas jsonb not null default '[]'::jsonb,
  proof_file_path text,
  proof_file_hash text,
  acompanhamento_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  reservation_expires_at timestamptz,
  note text,
  approved_by uuid references public.inc_app_users(id) on delete set null,
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists inc_contributions_proof_file_hash_unique
  on public.inc_contributions (proof_file_hash)
  where proof_file_hash is not null;

create index if not exists inc_contributions_campaign_status_idx
  on public.inc_contributions (campaign_id, status);

create index if not exists inc_campaign_numbers_status_idx
  on public.inc_campaign_numbers (campaign_id, status);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'inc_campaign_numbers_contribution_fk'
  ) then
    alter table public.inc_campaign_numbers
      add constraint inc_campaign_numbers_contribution_fk
      foreign key (contribution_id) references public.inc_contributions(id) on delete set null;
  end if;
end $$;

create table if not exists public.inc_repasse_rules (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.inc_campaigns(id) on delete cascade,
  rule_type text not null check (rule_type in ('percent_gross','percent_profit','fixed_total','fixed_per_unit','matched_donation')),
  label text not null,
  percent numeric(5,2),
  fixed_amount_cents integer,
  max_amount_cents integer,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.inc_campaign_updates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.inc_campaigns(id) on delete cascade,
  title text not null,
  body text not null,
  image_url text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.inc_campaign_accountability (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.inc_campaigns(id) on delete cascade,
  final_amount_cents integer,
  final_impact_qty numeric(10,2),
  receipt_url text,
  photos jsonb not null default '[]'::jsonb,
  thank_you_text text,
  draw_result_text text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inc_message_templates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.inc_campaigns(id) on delete cascade,
  channel text not null default 'whatsapp' check (channel in ('whatsapp','email')),
  purpose text not null,
  title text not null,
  body text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.inc_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.inc_app_users(id) on delete set null,
  client_id uuid references public.inc_clients(id) on delete set null,
  campaign_id uuid references public.inc_campaigns(id) on delete set null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Triggers de updated_at
-- -----------------------------------------------------------------------------
drop trigger if exists inc_clients_touch_updated_at on public.inc_clients;
create trigger inc_clients_touch_updated_at before update on public.inc_clients
for each row execute function public.inc_touch_updated_at();

drop trigger if exists inc_campaigns_touch_updated_at on public.inc_campaigns;
create trigger inc_campaigns_touch_updated_at before update on public.inc_campaigns
for each row execute function public.inc_touch_updated_at();

drop trigger if exists inc_campaign_numbers_touch_updated_at on public.inc_campaign_numbers;
create trigger inc_campaign_numbers_touch_updated_at before update on public.inc_campaign_numbers
for each row execute function public.inc_touch_updated_at();

drop trigger if exists inc_participants_touch_updated_at on public.inc_participants;
create trigger inc_participants_touch_updated_at before update on public.inc_participants
for each row execute function public.inc_touch_updated_at();

drop trigger if exists inc_contributions_touch_updated_at on public.inc_contributions;
create trigger inc_contributions_touch_updated_at before update on public.inc_contributions
for each row execute function public.inc_touch_updated_at();

drop trigger if exists inc_accountability_touch_updated_at on public.inc_campaign_accountability;
create trigger inc_accountability_touch_updated_at before update on public.inc_campaign_accountability
for each row execute function public.inc_touch_updated_at();

-- -----------------------------------------------------------------------------
-- Criação automática dos números no INSERT da campanha.
-- Alterações posteriores em number_count são tratadas pela API de gestão.
-- -----------------------------------------------------------------------------
create or replace function public.inc_create_campaign_numbers()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.number_count > 0 then
    insert into public.inc_campaign_numbers (campaign_id, number)
    select new.id, gs from generate_series(1, new.number_count) gs
    on conflict (campaign_id, number) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists inc_campaign_create_numbers on public.inc_campaigns;
create trigger inc_campaign_create_numbers after insert on public.inc_campaigns
for each row execute function public.inc_create_campaign_numbers();

-- Libera reservas temporárias expiradas. As APIs também fazem a reconciliação
-- antes de novas reservas, portanto não depende de cron para consistência.
create or replace function public.inc_release_expired_reservations()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.inc_campaign_numbers
  set
    status = 'available',
    participant_id = null,
    contribution_id = null,
    buyer_display_name = null,
    reserved_until = null,
    updated_at = now()
  where status = 'reserved'
    and reserved_until is not null
    and reserved_until < now();

  update public.inc_contributions
  set
    status = 'canceled',
    note = coalesce(note, '') || case when coalesce(note, '') = '' then '' else E'\n' end || 'Reserva expirada automaticamente antes do envio do comprovante.',
    updated_at = now()
  where status = 'awaiting_payment'
    and reservation_expires_at is not null
    and reservation_expires_at < now();
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS e funções auxiliares do módulo
-- -----------------------------------------------------------------------------
alter table public.inc_clients enable row level security;
alter table public.inc_app_users enable row level security;
alter table public.inc_campaigns enable row level security;
alter table public.inc_campaign_numbers enable row level security;
alter table public.inc_campaign_quotas enable row level security;
alter table public.inc_participants enable row level security;
alter table public.inc_contributions enable row level security;
alter table public.inc_repasse_rules enable row level security;
alter table public.inc_campaign_updates enable row level security;
alter table public.inc_campaign_accountability enable row level security;
alter table public.inc_message_templates enable row level security;
alter table public.inc_audit_logs enable row level security;

create or replace function public.inc_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.inc_app_users
    where auth_user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.inc_is_client_member(target_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.inc_app_users
    where auth_user_id = auth.uid()
      and (role = 'owner' or client_id = target_client)
  );
$$;

revoke all on function public.inc_release_expired_reservations() from public;
grant execute on function public.inc_release_expired_reservations() to service_role;
revoke all on function public.inc_is_owner() from public;
revoke all on function public.inc_is_client_member(uuid) from public;
grant execute on function public.inc_is_owner(), public.inc_is_client_member(uuid) to authenticated;

-- Policies idempotentes.
drop policy if exists "inc public read clients" on public.inc_clients;
create policy "inc public read clients" on public.inc_clients
for select using (true);

drop policy if exists "inc public read campaigns" on public.inc_campaigns;
create policy "inc public read campaigns" on public.inc_campaigns
for select using (status in ('active','paused','closed','accountability_published'));

drop policy if exists "inc public read numbers" on public.inc_campaign_numbers;
create policy "inc public read numbers" on public.inc_campaign_numbers
for select using (
  exists (
    select 1 from public.inc_campaigns c
    where c.id = campaign_id
      and c.status in ('active','paused','closed','accountability_published')
  )
);

drop policy if exists "inc public read quotas" on public.inc_campaign_quotas;
create policy "inc public read quotas" on public.inc_campaign_quotas
for select using (
  is_active and exists (
    select 1 from public.inc_campaigns c
    where c.id = campaign_id
      and c.status in ('active','paused','closed','accountability_published')
  )
);

drop policy if exists "inc public read updates" on public.inc_campaign_updates;
create policy "inc public read updates" on public.inc_campaign_updates
for select using (is_public);

drop policy if exists "inc app users read themselves" on public.inc_app_users;
create policy "inc app users read themselves" on public.inc_app_users
for select using (auth_user_id = auth.uid() or public.inc_is_owner());

drop policy if exists "inc members campaigns" on public.inc_campaigns;
create policy "inc members campaigns" on public.inc_campaigns
for all using (public.inc_is_client_member(client_id))
with check (public.inc_is_client_member(client_id));

drop policy if exists "inc members numbers" on public.inc_campaign_numbers;
create policy "inc members numbers" on public.inc_campaign_numbers
for all using (
  exists (select 1 from public.inc_campaigns c where c.id = campaign_id and public.inc_is_client_member(c.client_id))
)
with check (
  exists (select 1 from public.inc_campaigns c where c.id = campaign_id and public.inc_is_client_member(c.client_id))
);

drop policy if exists "inc members quotas" on public.inc_campaign_quotas;
create policy "inc members quotas" on public.inc_campaign_quotas
for all using (
  exists (select 1 from public.inc_campaigns c where c.id = campaign_id and public.inc_is_client_member(c.client_id))
)
with check (
  exists (select 1 from public.inc_campaigns c where c.id = campaign_id and public.inc_is_client_member(c.client_id))
);

drop policy if exists "inc members participants" on public.inc_participants;
create policy "inc members participants" on public.inc_participants
for select using (public.inc_is_client_member(client_id));

drop policy if exists "inc members contributions" on public.inc_contributions;
create policy "inc members contributions" on public.inc_contributions
for all using (
  exists (select 1 from public.inc_campaigns c where c.id = campaign_id and public.inc_is_client_member(c.client_id))
)
with check (
  exists (select 1 from public.inc_campaigns c where c.id = campaign_id and public.inc_is_client_member(c.client_id))
);

-- -----------------------------------------------------------------------------
-- Views públicas/admin
-- -----------------------------------------------------------------------------
create or replace view public.inc_clients_public with (security_invoker = true) as
select id, name, slug, logo_url, primary_color, secondary_color
from public.inc_clients;

create or replace view public.inc_campaigns_public with (security_invoker = true) as
select
  ca.id,
  ca.client_id,
  cl.name as client_name,
  cl.slug as client_slug,
  cl.logo_url as client_logo_url,
  cl.primary_color as client_primary_color,
  cl.secondary_color as client_secondary_color,
  ca.slug,
  ca.type,
  ca.title,
  ca.subtitle,
  ca.story,
  ca.prize_title,
  ca.prize_description,
  ca.prize_image_url,
  ca.main_image_url,
  ca.gallery_images,
  ca.starts_at,
  ca.ends_at,
  ca.status,
  ca.target_amount_cents,
  ca.extended_amount_cents,
  ca.impact_unit,
  ca.impact_value_cents,
  ca.number_count,
  ca.number_price_cents,
  ca.regulation_text,
  ca.data_consent_text,
  ca.show_buyer_names,
  ca.created_at,
  ca.intro_modal_enabled,
  ca.intro_modal_title,
  ca.intro_modal_body
from public.inc_campaigns ca
join public.inc_clients cl on cl.id = ca.client_id;

create or replace view public.inc_campaign_numbers_public with (security_invoker = true) as
select
  n.campaign_id,
  n.number,
  n.status,
  case
    when c.show_buyer_names and n.status in ('reserved','pending_approval','confirmed')
      then n.buyer_display_name
    else null
  end as buyer_display_name
from public.inc_campaign_numbers n
join public.inc_campaigns c on c.id = n.campaign_id;

create or replace view public.inc_campaign_quotas_public with (security_invoker = true) as
select id, campaign_id, title, description, amount_cents, impact_qty, is_active, sort_order
from public.inc_campaign_quotas
where is_active = true;

create or replace view public.inc_campaign_stats_public as
select
  c.id as campaign_id,
  coalesce(sum(con.amount_cents) filter (where con.status = 'approved'), 0)::integer as confirmed_amount_cents,
  coalesce(sum(con.amount_cents) filter (where con.status in ('awaiting_payment','pending_approval')), 0)::integer as pending_amount_cents,
  coalesce(count(con.id) filter (where con.status = 'approved'), 0)::integer as confirmed_count,
  coalesce(count(con.id) filter (where con.status in ('awaiting_payment','pending_approval')), 0)::integer as pending_count
from public.inc_campaigns c
left join public.inc_contributions con
  on con.campaign_id = c.id and con.status <> 'canceled'
where c.status in ('active','paused','closed','accountability_published')
group by c.id;

create or replace view public.inc_admin_campaigns_overview with (security_invoker = true) as
select
  ca.id,
  ca.client_id,
  cl.name as client_name,
  ca.slug,
  ca.title,
  ca.status,
  ca.target_amount_cents,
  ca.extended_amount_cents,
  ca.impact_unit,
  ca.impact_value_cents,
  ca.number_count,
  ca.number_price_cents,
  ca.created_at,
  s.confirmed_amount_cents,
  s.pending_amount_cents,
  s.confirmed_count,
  s.pending_count
from public.inc_campaigns ca
join public.inc_clients cl on cl.id = ca.client_id
left join public.inc_campaign_stats_public s on s.campaign_id = ca.id;

create or replace view public.inc_admin_contributions with (security_invoker = true) as
select
  con.id,
  con.campaign_id,
  con.participant_id,
  p.name as participant_name,
  p.phone,
  p.email,
  con.type,
  con.status,
  con.amount_cents,
  con.selected_numbers,
  con.selected_quotas,
  con.proof_file_path,
  con.acompanhamento_token,
  con.rejected_reason,
  con.approved_at,
  con.created_at,
  con.reservation_expires_at,
  con.proof_file_hash
from public.inc_contributions con
join public.inc_participants p on p.id = con.participant_id;

create or replace view public.inc_contribution_tracking with (security_invoker = true) as
select
  con.acompanhamento_token,
  con.status,
  con.amount_cents,
  con.selected_numbers,
  con.selected_quotas,
  con.created_at,
  p.name as participant_name,
  ca.title as campaign_title,
  ca.slug as campaign_slug,
  cl.name as client_name,
  con.campaign_id,
  p.phone as participant_phone,
  p.email as participant_email,
  cl.logo_url as client_logo_url,
  cl.primary_color as client_primary_color,
  cl.secondary_color as client_secondary_color,
  con.reservation_expires_at
from public.inc_contributions con
join public.inc_participants p on p.id = con.participant_id
join public.inc_campaigns ca on ca.id = con.campaign_id
join public.inc_clients cl on cl.id = ca.client_id;

-- -----------------------------------------------------------------------------
-- Permissões
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

-- As views públicas usam security_invoker; por isso concedemos somente as colunas
-- estritamente necessárias nas tabelas-base. Pix e contatos do cliente não ficam
-- disponíveis diretamente para anon.
grant select (id, name, slug, logo_url, primary_color, secondary_color)
  on public.inc_clients to anon, authenticated;
grant select (
  id, client_id, slug, type, title, subtitle, story, prize_title,
  prize_description, prize_image_url, main_image_url, gallery_images,
  starts_at, ends_at, status, target_amount_cents, extended_amount_cents,
  impact_unit, impact_value_cents, number_count, number_price_cents,
  regulation_text, data_consent_text, show_buyer_names, created_at,
  intro_modal_enabled, intro_modal_title, intro_modal_body
) on public.inc_campaigns to anon, authenticated;
grant select (campaign_id, number, status, buyer_display_name)
  on public.inc_campaign_numbers to anon, authenticated;
grant select (id, campaign_id, title, description, amount_cents, impact_qty, is_active, sort_order)
  on public.inc_campaign_quotas to anon, authenticated;

grant select on public.inc_clients_public, public.inc_campaigns_public,
  public.inc_campaign_numbers_public, public.inc_campaign_quotas_public,
  public.inc_campaign_stats_public to anon, authenticated;

-- A gestão da aplicação acessa as entidades privadas pelas APIs com service role.
grant select, insert, update, delete on
  public.inc_clients,
  public.inc_app_users,
  public.inc_campaigns,
  public.inc_campaign_numbers,
  public.inc_campaign_quotas,
  public.inc_participants,
  public.inc_contributions,
  public.inc_repasse_rules,
  public.inc_campaign_updates,
  public.inc_campaign_accountability,
  public.inc_message_templates,
  public.inc_audit_logs
  to service_role;
grant select on public.inc_clients_public, public.inc_campaigns_public,
  public.inc_campaign_numbers_public, public.inc_campaign_quotas_public,
  public.inc_campaign_stats_public, public.inc_admin_campaigns_overview,
  public.inc_admin_contributions, public.inc_contribution_tracking
  to service_role;

-- -----------------------------------------------------------------------------
-- Storage de comprovantes. Upload/leituras são feitos nas APIs com service role.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'impacto-no-controle-proofs',
  'impacto-no-controle-proofs',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Seed: Sementinha e campanha piloto da bicicleta seminova.
-- PIX NÃO é persistido aqui. A aplicação usa PIX_KEY / PIX_RECEIVER_NAME /
-- PIX_CITY do ambiente quando os campos do banco estão vazios.
-- -----------------------------------------------------------------------------
insert into public.inc_clients (
  name, slug, logo_url, primary_color, secondary_color,
  pix_key, pix_receiver_name, pix_city,
  responsible_name, responsible_email, privacy_text
)
values (
  'Sementinha',
  'sementinha',
  '/impacto-no-controle/sementinha/sementinha-logo.jpg',
  '#2F7D46',
  '#8BB73E',
  null,
  null,
  null,
  'Equipe Sementinha',
  'bazardosementinha@gmail.com',
  'Usaremos seus dados apenas para identificar sua participação nesta ação do Sementinha e facilitar o acompanhamento. Você pode solicitar remoção a qualquer momento.'
)
on conflict (slug) do update
set name = excluded.name,
    logo_url = excluded.logo_url,
    primary_color = excluded.primary_color,
    secondary_color = excluded.secondary_color,
    responsible_name = excluded.responsible_name,
    responsible_email = excluded.responsible_email,
    updated_at = now();

insert into public.inc_campaigns (
  client_id, slug, type, title, subtitle, story,
  prize_title, prize_description, prize_image_url, main_image_url, gallery_images,
  status, target_amount_cents, extended_amount_cents, impact_unit, impact_value_cents,
  number_count, number_price_cents,
  pix_key, pix_receiver_name, pix_city,
  regulation_text, data_consent_text, show_buyer_names, reservation_minutes,
  intro_modal_enabled, intro_modal_title, intro_modal_body
)
select
  cl.id,
  'rifa-bike-seminova-sementinha',
  'numbers',
  'Rifa da Bicicleta Seminova',
  'Participe da ação do Sementinha e concorra a uma bicicleta seminova.',
  'O Sementinha está preparando uma nova ação solidária usando o Impacto no Controle. A participação será feita pelo celular, com escolha de números, reserva temporária, Pix, envio de comprovante e acompanhamento da confirmação.',
  'Bicicleta seminova',
  'Bicicleta seminova apresentada nas fotos da campanha. Antes de ativar a ação, a equipe deve revisar a descrição do prêmio, quantidade de números, valor por número, datas e regulamento.',
  '/impacto-no-controle/sementinha/bike-01.jpeg',
  '/impacto-no-controle/sementinha/bike-01.jpeg',
  '["/impacto-no-controle/sementinha/bike-01.jpeg","/impacto-no-controle/sementinha/bike-02.jpeg","/impacto-no-controle/sementinha/bike-03.jpeg","/impacto-no-controle/sementinha/bike-04.jpeg","/impacto-no-controle/sementinha/bike-05.jpeg","/impacto-no-controle/sementinha/bike-06.jpeg","/impacto-no-controle/sementinha/bike-07.jpeg","/impacto-no-controle/sementinha/bike-08.jpeg"]'::jsonb,
  'draft',
  0,
  0,
  'participações',
  0,
  0,
  0,
  null,
  null,
  null,
  'A participação somente será confirmada após a conferência do Pix pela organização. Números reservados temporariamente podem voltar a ficar disponíveis se o comprovante não for enviado dentro do prazo. Antes de ativar a campanha, revise e complete as regras específicas da rifa.',
  'Estou ciente de que meus dados serão usados para confirmar minha participação nesta ação do Sementinha, permitir o acompanhamento da reserva e facilitar o contato relacionado à campanha.',
  true,
  30,
  true,
  'Bem-vindo à rifa da bicicleta seminova do Sementinha',
  'Escolha seus números pelo celular. Depois da reserva, faça o Pix, envie o comprovante pela própria página e acompanhe a confirmação. Antes da divulgação pública, a equipe do Sementinha deve concluir a configuração da campanha na Gestão.'
from public.inc_clients cl
where cl.slug = 'sementinha'
on conflict (slug) do update
set client_id = excluded.client_id,
    title = excluded.title,
    subtitle = excluded.subtitle,
    story = excluded.story,
    prize_title = excluded.prize_title,
    prize_description = excluded.prize_description,
    prize_image_url = excluded.prize_image_url,
    main_image_url = excluded.main_image_url,
    gallery_images = excluded.gallery_images,
    regulation_text = excluded.regulation_text,
    data_consent_text = excluded.data_consent_text,
    intro_modal_enabled = excluded.intro_modal_enabled,
    intro_modal_title = excluded.intro_modal_title,
    intro_modal_body = excluded.intro_modal_body,
    updated_at = now();

-- Mensagens-base. Mantêm placeholders substituídos pela Gestão.
delete from public.inc_message_templates
where campaign_id = (select id from public.inc_campaigns where slug = 'rifa-bike-seminova-sementinha');

insert into public.inc_message_templates (campaign_id, channel, purpose, title, body, sort_order)
select ca.id, 'whatsapp', 'launch', 'Mensagem de lançamento', $$🚲 Rifa da Bicicleta Seminova — Sementinha

Estamos preparando uma ação especial do Sementinha. Escolha seus números pelo link abaixo, faça o Pix e envie o comprovante pela própria página:

[LINK_ACAO]

A confirmação acontece depois da conferência do pagamento pela organização. Compartilhe com quem também quiser participar e apoiar o Sementinha!$$, 1
from public.inc_campaigns ca where ca.slug = 'rifa-bike-seminova-sementinha'
union all
select ca.id, 'whatsapp', 'progress', 'Mensagem de andamento', $$🚲 A rifa da bicicleta do Sementinha continua!

Já temos [VALOR] confirmado. Confira os números disponíveis e participe:

[LINK_ANDAMENTO]

Obrigado por fortalecer esta ação do Sementinha.$$,
2 from public.inc_campaigns ca where ca.slug = 'rifa-bike-seminova-sementinha'
union all
select ca.id, 'whatsapp', 'last_call', 'Última chamada', $$🚲 Última chamada para a rifa da bicicleta do Sementinha.

Se ainda quiser participar, confira os números disponíveis:

[LINK_ULTIMA_CHAMADA]

Obrigado por participar e compartilhar.$$,
3 from public.inc_campaigns ca where ca.slug = 'rifa-bike-seminova-sementinha'
union all
select ca.id, 'whatsapp', 'accountability', 'Prestação de contas', $$Prestação de contas — Rifa da Bicicleta Seminova do Sementinha

Valor confirmado: [VALOR_FINAL].

Acompanhe as informações finais e a prestação de contas:

[LINK_PRESTACAO]

Obrigado a todos que participaram.$$,
4 from public.inc_campaigns ca where ca.slug = 'rifa-bike-seminova-sementinha';

-- Vincula os logins apenas se os usuários já existirem em Authentication > Users.
insert into public.inc_app_users (auth_user_id, client_id, role, name, email)
select u.id, null, 'owner', 'Impacto no Controle', 'impactonocontrole@gmail.com'
from auth.users u
where lower(u.email) = 'impactonocontrole@gmail.com'
on conflict (auth_user_id) do update
set role = excluded.role, name = excluded.name, email = excluded.email;

insert into public.inc_app_users (auth_user_id, client_id, role, name, email)
select u.id, cl.id, 'client_admin', 'Sementinha', 'bazardosementinha@gmail.com'
from auth.users u
cross join public.inc_clients cl
where lower(u.email) = 'bazardosementinha@gmail.com'
  and cl.slug = 'sementinha'
on conflict (auth_user_id) do update
set client_id = excluded.client_id,
    role = excluded.role,
    name = excluded.name,
    email = excluded.email;

commit;
