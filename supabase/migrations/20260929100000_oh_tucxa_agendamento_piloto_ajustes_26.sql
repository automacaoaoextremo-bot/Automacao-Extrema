-- Organização em Harmonia / TUCXA — Agendamento-26
alter table if exists public.oh_tucxa_pilot_person_preferences
  add column if not exists default_entity_changed_at timestamptz,
  add column if not exists default_entity_changed_by_person_id uuid references public.oh_people(id) on delete set null;

create table if not exists public.oh_tucxa_consulente_relationships (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  owner_person_id uuid not null references public.oh_people(id) on delete cascade, related_person_id uuid references public.oh_people(id) on delete set null,
  related_name text not null, relationship text not null, default_entity_id uuid references public.oh_spiritual_entities(id) on delete set null,
  created_by_person_id uuid references public.oh_people(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, owner_person_id, related_name)
);
create index if not exists idx_oh_tucxa_consulente_relationships_owner on public.oh_tucxa_consulente_relationships (organization_id, owner_person_id);
alter table public.oh_tucxa_consulente_relationships enable row level security;

create table if not exists public.oh_tucxa_default_entity_history (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.oh_organizations(id) on delete cascade,
  person_id uuid not null references public.oh_people(id) on delete cascade, previous_entity_id uuid references public.oh_spiritual_entities(id) on delete set null,
  new_entity_id uuid references public.oh_spiritual_entities(id) on delete set null, changed_by_person_id uuid references public.oh_people(id) on delete set null,
  changed_at timestamptz not null default now()
);
create index if not exists idx_oh_tucxa_default_entity_history_person on public.oh_tucxa_default_entity_history (organization_id, person_id, changed_at desc);
alter table public.oh_tucxa_default_entity_history enable row level security;
