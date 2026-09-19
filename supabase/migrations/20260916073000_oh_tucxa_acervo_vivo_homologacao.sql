-- TUCXA / Acervo Vivo - Ajustes 02
-- Homologacao estruturada do fluxo de uso/emprestimo com evidencias opcionais.

begin;

create table if not exists public.oh_acervo_homologations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  participant_person_id uuid not null references public.oh_people(id) on delete restrict,
  conducted_by_person_id uuid references public.oh_people(id) on delete set null,
  conducted_at timestamptz not null default now(),
  source_type text not null default 'manual'
    check (source_type in ('manual','foto','audio')),
  source_storage_path text,
  source_file_name text,
  source_mime_type text,
  task_results jsonb not null default '{}'::jsonb,
  final_answers jsonb not null default '{}'::jsonb,
  notes text,
  ai_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_oh_acervo_homologations_org_date
  on public.oh_acervo_homologations (organization_id, conducted_at desc);

create index if not exists idx_oh_acervo_homologations_participant
  on public.oh_acervo_homologations (organization_id, participant_person_id, conducted_at desc);

alter table public.oh_acervo_homologations enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tucxa-acervo-vivo-homologacao',
  'tucxa-acervo-vivo-homologacao',
  false,
  4194304,
  array[
    'image/jpeg','image/png','image/webp',
    'audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/webm','audio/ogg'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
