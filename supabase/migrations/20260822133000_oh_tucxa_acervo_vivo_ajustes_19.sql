-- TUCXA / Acervo Vivo - Ajustes e Evolucoes 19
-- Avaliacoes/comentarios, lembretes de devolucao e configuracoes complementares.

begin;

create table if not exists public.oh_acervo_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  title_id uuid not null references public.oh_acervo_titles(id) on delete cascade,
  person_id uuid not null references public.oh_people(id) on delete cascade,
  loan_id uuid references public.oh_acervo_loans(id) on delete set null,
  rating integer check (rating between 1 and 5),
  comment text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (rating is not null or nullif(btrim(comment), '') is not null)
);

create unique index if not exists idx_oh_acervo_reviews_one_per_loan
  on public.oh_acervo_reviews (organization_id, loan_id)
  where loan_id is not null and active = true;

create index if not exists idx_oh_acervo_reviews_title
  on public.oh_acervo_reviews (organization_id, title_id, active, created_at desc);

alter table public.oh_acervo_reviews enable row level security;

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
    raise exception 'Organizacao Tucxa nao localizada.';
  end if;

  update public.oh_acervo_settings
     set metadata = coalesce(metadata, '{}'::jsonb)
       || jsonb_build_object(
            'loan_reminder_days_before_due',
            coalesce(
              nullif(metadata ->> 'loan_reminder_days_before_due', '')::integer,
              3
            )
          ),
         updated_at = now()
   where organization_id = tucxa_id;
end $$;

commit;
