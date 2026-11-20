-- Calendario anual TUCXA 2027: tabelas isoladas, sem alteracao na Agenda Viva 2026.
-- IMPORTANTISSIMO: todos os registros historicos entram como RASCUNHO.
-- Nunca publicar automaticamente datas extrapoladas dos calendarios de 2026.

create extension if not exists pgcrypto;

create table if not exists public.tucxa_annual_events_2027 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  title text not null check (length(title) between 3 and 150),
  description text,
  event_date date not null check (event_date between date '2027-01-01' and date '2027-12-31'),
  end_date date check (end_date is null or (end_date between event_date and date '2027-12-31')),
  starts_time time,
  ends_time time,
  category text not null check (category in ('segunda','terca','tratamento','grupo1','grupo2','sementinha','evento','estudo','institucional','recesso')),
  audience text not null default 'todos' check (length(audience) between 1 and 80),
  location text not null default 'TUCXA' check (length(location) between 1 and 160),
  status text not null default 'pendente' check (status in ('rascunho','pendente','aprovado','rejeitado','ajustes_solicitados')),
  is_public boolean not null default true,
  proposer_name text,
  proposer_phone text check (proposer_phone is null or proposer_phone ~ '^55[1-9][0-9]9[0-9]{8}$'),
  proposer_email text,
  consent_at timestamptz,
  review_notes text,
  source_key text,
  source_date_2026 date,
  created_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source_key)
);

create index if not exists tucxa_annual_events_2027_public_idx
  on public.tucxa_annual_events_2027 (organization_id, status, event_date);
create index if not exists tucxa_annual_events_2027_phone_idx
  on public.tucxa_annual_events_2027 (organization_id, proposer_phone, created_at);

create table if not exists public.tucxa_annual_events_2027_audit (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.tucxa_annual_events_2027(id) on delete cascade,
  actor_uid uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

-- O navegador NUNCA consulta estas tabelas diretamente; a API filtra os campos publicados.
alter table public.tucxa_annual_events_2027 enable row level security;
alter table public.tucxa_annual_events_2027_audit enable row level security;
revoke all on public.tucxa_annual_events_2027 from anon, authenticated;
revoke all on public.tucxa_annual_events_2027_audit from anon, authenticated;
grant all on public.tucxa_annual_events_2027 to service_role;
grant all on public.tucxa_annual_events_2027_audit to service_role;
grant usage, select on sequence public.tucxa_annual_events_2027_audit_id_seq to service_role;

-- A ausencia de policies anon/authenticated equivale a negar acesso sob RLS.
-- Insercao idempotente: aprove os rascunhos somente depois da revisao dos dias/feriados.
do $$
declare v_org uuid;
begin
  select id into v_org from public.oh_organizations
   where slug = 'tucxa' order by created_at desc limit 1;
  if v_org is null then
    raise exception 'Organizacao TUCXA nao localizada. Nao e seguro semear o calendario 2027.';
  end if;

  -- Atendimento regular, mantendo DIA DA SEMANA e limite de 4 ocorrencias/mes.
  -- Janeiro, julho e fim de dezembro exigem aprovacao de ferias/recesso.
  insert into public.tucxa_annual_events_2027
   (organization_id, title, description, event_date, category, audience,
    location, status, source_key)
  select v_org,
    case extract(dow from d)::int
      when 1 then 'Atendimento — Grupo Segunda-feira'
      when 2 then 'Atendimento — Grupo Terça-feira'
      when 3 then 'Tratamento espiritual'
      when 4 then case when (extract(day from d)::int - 1)/7 in (0,2)
                       then 'Filhos da Corrente — Grupo 1'
                       else 'Filhos da Corrente — Grupo 2' end
    end,
    'Projecao baseada no calendario de 2026. Conferir funcionamento, feriados, escala, local e horario antes de aprovar.',
    d::date,
    case extract(dow from d)::int when 1 then 'segunda' when 2 then 'terca'
         when 3 then 'tratamento' when 4 then
         case when (extract(day from d)::int - 1)/7 in (0,2) then 'grupo1' else 'grupo2' end end,
    case when extract(dow from d)::int in (1,2) then 'consulentes'
         else 'filhos-corrente' end,
    'TUCXA', 'rascunho', 'recorrente-2027-' || to_char(d,'YYYYMMDD')
  from generate_series(date '2027-02-01', date '2027-12-19', interval '1 day') as d
  where extract(month from d) <> 7
    and extract(dow from d)::int in (1,2,3,4)
    and (extract(day from d)::int - 1)/7 < 4
  on conflict (organization_id, source_key) do nothing;

  -- Periodos de ferias/recesso: placeholders, datas A CONFIRMAR.
  insert into public.tucxa_annual_events_2027
    (organization_id,title,description,event_date,end_date,category,audience,location,status,source_key)
  values
    (v_org,'Recesso de janeiro (a confirmar)','Base historica: janeiro ate dia 28 em 2026.', '2027-01-01','2027-01-28','recesso','todos','TUCXA','rascunho','recesso-jan-2027'),
    (v_org,'Recesso de julho (a confirmar)','Base historica: julho ate dia 29 em 2026.', '2027-07-01','2027-07-29','recesso','todos','TUCXA','rascunho','recesso-jul-2027'),
    (v_org,'Recesso de dezembro (a confirmar)','Base historica: a partir do dia 21 de dezembro de 2026.', '2027-12-20','2027-12-31','recesso','todos','TUCXA','rascunho','recesso-dez-2027')
  on conflict (organization_id, source_key) do nothing;

  -- Eventos pontuais do material 2026 convertidos para MESMA SEMANA/ DIA DA SEMANA.
  -- Nenhuma data abaixo e confirmacao oficial para 2027.
  insert into public.tucxa_annual_events_2027
    (organization_id,title,description,event_date,category,audience,location,status,source_key,source_date_2026)
  values
    (v_org,'Pizza — TUCXA','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-02-20','evento','todos','A definir','rascunho','2026-ref-2026-02-21','2026-02-21'),
    (v_org,'Feijoada de São Jorge — TUCXA','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-04-24','evento','todos','A definir','rascunho','2026-ref-2026-04-25','2026-04-25'),
    (v_org,'Festa Junina — TUCXA','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-06-13','evento','todos','A definir','rascunho','2026-ref-2026-06-14','2026-06-14'),
    (v_org,'Pizza — TUCXA','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-08-14','evento','todos','A definir','rascunho','2026-ref-2026-08-08','2026-08-08'),
    (v_org,'Pizza — TUCXA','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-10-16','evento','todos','A definir','rascunho','2026-ref-2026-10-17','2026-10-17'),
    (v_org,'Confraternização — TUCXA','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-11-21','evento','todos','A definir','rascunho','2026-ref-2026-11-15','2026-11-15'),
    (v_org,'Sementinha — Ação em comunidade','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-02-27','sementinha','todos','A definir','rascunho','2026-ref-2026-02-28','2026-02-28'),
    (v_org,'Sementinha — Bazar','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-03-06','sementinha','todos','A definir','rascunho','2026-ref-2026-03-07','2026-03-07'),
    (v_org,'Sementinha — Ação em comunidade','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-04-03','sementinha','todos','A definir','rascunho','2026-ref-2026-04-04','2026-04-04'),
    (v_org,'Sementinha — Bazar simples','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-04-09','sementinha','todos','A definir','rascunho','2026-ref-2026-04-10','2026-04-10'),
    (v_org,'Sementinha — Bazar simples','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-04-10','sementinha','todos','A definir','rascunho','2026-ref-2026-04-11','2026-04-11'),
    (v_org,'Sementinha — Bingo','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-05-08','sementinha','todos','A definir','rascunho','2026-ref-2026-05-09','2026-05-09'),
    (v_org,'Sementinha — Bazar simples','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-06-04','sementinha','todos','A definir','rascunho','2026-ref-2026-06-05','2026-06-05'),
    (v_org,'Sementinha — Bazar simples','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-06-05','sementinha','todos','A definir','rascunho','2026-ref-2026-06-06','2026-06-06'),
    (v_org,'Sementinha — Ação em comunidade','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-06-26','sementinha','todos','A definir','rascunho','2026-ref-2026-06-27','2026-06-27'),
    (v_org,'Sementinha — Bazar','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-07-03','sementinha','todos','A definir','rascunho','2026-ref-2026-07-04','2026-07-04'),
    (v_org,'Sementinha — Bazar','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-08-28','sementinha','todos','A definir','rascunho','2026-ref-2026-08-29','2026-08-29'),
    (v_org,'Sementinha — Ação na comunidade','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-09-18','sementinha','todos','A definir','rascunho','2026-ref-2026-09-19','2026-09-19'),
    (v_org,'Sementinha — Ação na comunidade','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-10-09','sementinha','todos','A definir','rascunho','2026-ref-2026-10-10','2026-10-10'),
    (v_org,'Sementinha — Futebol solidário','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-10-23','sementinha','todos','A definir','rascunho','2026-ref-2026-10-24','2026-10-24'),
    (v_org,'Sementinha — Bazar','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-12-04','sementinha','todos','A definir','rascunho','2026-ref-2026-12-05','2026-12-05'),
    (v_org,'Sementinha — Bazar','Data PROVISORIA baseada no dia da semana e ocorrencia mensal do calendario 2026. Confirmar com a Diretoria.','2027-12-11','sementinha','todos','A definir','rascunho','2026-ref-2026-12-12','2026-12-12'),
    (v_org,'Mutirão de limpeza','Referencia 24/01/2026 (sabado); data de 2027 a confirmar.','2027-01-23','institucional','voluntarios','TUCXA','rascunho','2026-ref-2026-01-24','2026-01-24'),
    (v_org,'Trabalho para Cavalinhos e Cambonos','Referencia 29/01/2026 (quinta); data de 2027 a confirmar.','2027-01-28','institucional','filhos-corrente','TUCXA','rascunho','2026-ref-2026-01-29','2026-01-29'),
    (v_org,'Trabalho para Cavalinhos e Cambonos','Referencia 30/07/2026 (quinta); data de 2027 a confirmar.','2027-07-29','institucional','filhos-corrente','TUCXA','rascunho','2026-ref-2026-07-30','2026-07-30'),
    (v_org,'Encerramento de atividades','Referencia 20/12/2026 (domingo); data de 2027 a confirmar.','2027-12-19','institucional','todos','TUCXA','rascunho','2026-ref-2026-12-20','2026-12-20')
  on conflict (organization_id, source_key) do nothing;
end $$;
