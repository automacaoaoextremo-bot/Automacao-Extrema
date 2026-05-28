-- Automação Extrema — correção 2026-05-28
-- Objetivo:
-- 1) Evitar erro de schema cache relacionado a ae_leads.funnel_stage.
-- 2) Garantir a tabela de follow-ups do funil.
-- 3) Recriar views sem depender de colunas extras em ae_leads.
-- 4) Forçar reload do schema cache do PostgREST/Supabase.

create extension if not exists "pgcrypto";

-- Campos seguros/compatíveis com versões anteriores.
alter table public.ae_leads
  add column if not exists notes text;

-- Mantemos estas colunas como opcionais para instalações que já as usam,
-- mas a aplicação atualizada NÃO depende delas para salvar diagnóstico ou abrir Gestão.
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

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ae_lead_followups_updated_at on public.ae_lead_followups;
create trigger trg_ae_lead_followups_updated_at
before update on public.ae_lead_followups
for each row execute function public.set_updated_at();

alter table public.ae_lead_followups enable row level security;

-- Políticas para leitura por usuários autenticados na área de gestão.
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

drop policy if exists "Authenticated can update AE solutions" on public.ae_solutions;
create policy "Authenticated can update AE solutions"
on public.ae_solutions
for update
to authenticated
using (true)
with check (true);

-- Recria views sem depender de funnel_stage/next_action_at.
drop view if exists public.ae_hot_leads;
drop view if exists public.ae_report_solutions;
drop view if exists public.ae_report_pains;

create view public.ae_report_pains as
select
  coalesce(main_pain, 'não informado') as pain,
  count(*) as total
from public.ae_leads
group by 1
order by total desc;

create view public.ae_report_solutions as
select
  s.name as solution_name,
  count(*) as total,
  avg(m.score)::numeric(10,2) as avg_match_score
from public.ae_solution_matches m
join public.ae_solutions s on s.id = m.solution_id
group by s.name
order by total desc, avg_match_score desc;

create view public.ae_hot_leads as
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
  s.name as recommended_solution,
  l.created_at
from public.ae_leads l
left join public.ae_solutions s on s.id = l.recommended_solution_id
where l.diagnostic_score >= 9
order by l.diagnostic_score desc, l.created_at desc;

-- Força o PostgREST/Supabase a recarregar o cache de schema.
notify pgrst, 'reload schema';
