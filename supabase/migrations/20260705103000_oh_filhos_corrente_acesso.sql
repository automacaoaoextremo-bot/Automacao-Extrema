-- Organização em Harmonia — primeiro acesso dos Filhos da Corrente
-- Seguro para rodar mais de uma vez no Supabase SQL Editor.

alter table if exists public.oh_people
  add column if not exists auth_user_id uuid;

alter table if exists public.oh_memberships
  add column if not exists status text default 'ativo';

create index if not exists idx_oh_people_organization_whatsapp
  on public.oh_people (organization_id, whatsapp);

create index if not exists idx_oh_people_organization_email
  on public.oh_people (organization_id, lower(email));

create index if not exists idx_oh_memberships_organization_status
  on public.oh_memberships (organization_id, status);
