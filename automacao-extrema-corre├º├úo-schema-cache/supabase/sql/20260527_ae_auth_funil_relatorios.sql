-- Automação Extrema — atualização: Auth, gestão, funil, relatórios e validações
-- Rode no Supabase SQL Editor após o SQL inicial do MVP.

create extension if not exists "pgcrypto";

alter table public.ae_leads
  add column if not exists funnel_stage text default 'diagnostico_recebido',
  add column if not exists next_action_at timestamptz,
  add column if not exists last_contact_at timestamptz;

create table if not exists public.ae_lead_followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.ae_leads(id) on delete cascade,
  kind text not null,
  channel text not null default 'whatsapp',
  status text not null default 'pendente',
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ae_lead_followups_lead on public.ae_lead_followups(lead_id);
create index if not exists idx_ae_lead_followups_status on public.ae_lead_followups(status);
create index if not exists idx_ae_lead_followups_scheduled on public.ae_lead_followups(scheduled_at);
create index if not exists idx_ae_leads_funnel_stage on public.ae_leads(funnel_stage);
create index if not exists idx_ae_leads_next_action on public.ae_leads(next_action_at);

drop trigger if exists trg_ae_lead_followups_updated_at on public.ae_lead_followups;
create trigger trg_ae_lead_followups_updated_at
before update on public.ae_lead_followups
for each row execute function public.set_updated_at();

alter table public.ae_lead_followups enable row level security;

-- A aplicação usa SERVICE_ROLE nas rotas server-side e valida Supabase Auth via Bearer token.
-- As políticas abaixo permitem leitura para usuários autenticados se você futuramente consultar direto pelo client.
drop policy if exists "Authenticated can read AE solutions" on public.ae_solutions;
create policy "Authenticated can read AE solutions"
on public.ae_solutions
for select
to authenticated
using (true);

drop policy if exists "Authenticated can read AE leads" on public.ae_leads;
create policy "Authenticated can read AE leads"
on public.ae_leads
for select
to authenticated
using (true);

drop policy if exists "Authenticated can read AE lead answers" on public.ae_lead_answers;
create policy "Authenticated can read AE lead answers"
on public.ae_lead_answers
for select
to authenticated
using (true);

drop policy if exists "Authenticated can read AE matches" on public.ae_solution_matches;
create policy "Authenticated can read AE matches"
on public.ae_solution_matches
for select
to authenticated
using (true);

drop policy if exists "Authenticated can read AE followups" on public.ae_lead_followups;
create policy "Authenticated can read AE followups"
on public.ae_lead_followups
for select
to authenticated
using (true);

-- Opcional: liberar update direto para usuários autenticados no futuro.
drop policy if exists "Authenticated can update AE solutions" on public.ae_solutions;
create policy "Authenticated can update AE solutions"
on public.ae_solutions
for update
to authenticated
using (true)
with check (true);

-- Views úteis para conferência rápida no Supabase.
create or replace view public.ae_report_pains as
select
  coalesce(main_pain, 'não informado') as pain,
  count(*) as total
from public.ae_leads
group by 1
order by total desc;

create or replace view public.ae_report_solutions as
select
  s.name as solution_name,
  count(*) as total,
  avg(m.score)::numeric(10,2) as avg_match_score
from public.ae_solution_matches m
join public.ae_solutions s on s.id = m.solution_id
group by s.name
order by total desc, avg_match_score desc;

create or replace view public.ae_hot_leads as
select
  l.id,
  l.full_name,
  l.whatsapp,
  l.email,
  l.main_area,
  l.main_pain,
  l.urgency,
  l.diagnostic_score,
  l.status,
  l.funnel_stage,
  l.next_action_at,
  s.name as recommended_solution,
  l.created_at
from public.ae_leads l
left join public.ae_solutions s on s.id = l.recommended_solution_id
where l.diagnostic_score >= 9
order by l.diagnostic_score desc, l.created_at desc;
