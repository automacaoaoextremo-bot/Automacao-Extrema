-- Automação Extrema — Corrente em Dia
-- 05. Funil de leads WhatsApp/Formulário, Cliente Fundador e alertas de prazo.
-- Execute após os SQLs 01 a 04 do Corrente em Dia.

create extension if not exists "pgcrypto";

create table if not exists public.ced_leads (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'site_corrente_em_dia',
  organization_type text not null check (organization_type in ('federacao', 'associacao', 'terreiro')),
  organization_name text not null,
  organization_slug text,
  responsible_name text not null,
  email text,
  whatsapp text,
  state text,
  city text,
  contributors_estimate integer,
  observations text,
  status text not null default 'novo_whatsapp',
  founder_terms_accepted boolean not null default false,
  testimonial_permission boolean not null default false,
  lgpd_contact_consent boolean not null default true,
  access_user_email text,
  access_sent_at timestamptz,
  access_due_at timestamptz,
  internal_alert_at timestamptz,
  internal_alert_sent_at timestamptz,
  trial_days integer not null default 30,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  ae_client_id uuid references public.ae_clients(id) on delete set null,
  organization_id uuid references public.ced_organizations(id) on delete set null,
  responsible_person_id uuid references public.ced_people(id) on delete set null,
  auth_user_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ced_leads_status on public.ced_leads(status);
create index if not exists idx_ced_leads_source on public.ced_leads(source);
create index if not exists idx_ced_leads_email on public.ced_leads(email);
create index if not exists idx_ced_leads_whatsapp on public.ced_leads(whatsapp);
create index if not exists idx_ced_leads_access_due on public.ced_leads(access_due_at);
create index if not exists idx_ced_leads_internal_alert on public.ced_leads(internal_alert_at);
create index if not exists idx_ced_leads_created_at on public.ced_leads(created_at desc);

alter table public.ced_leads enable row level security;

do $$
begin
  execute 'drop policy if exists "Authenticated can read ced_leads" on public.ced_leads';
  execute 'create policy "Authenticated can read ced_leads" on public.ced_leads for select to authenticated using (true)';
end $$;

do $$
begin
  execute 'drop trigger if exists trg_ced_leads_updated_at on public.ced_leads';
  execute 'create trigger trg_ced_leads_updated_at before update on public.ced_leads for each row execute function public.set_updated_at()';
end $$;

-- Observação: este script não insere leads de simulação.
-- Use o formulário ou webhook do Corrente em Dia para cadastrar os leads de teste.
