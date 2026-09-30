-- Organizacao em Harmonia / TUCXA - Agendamento Piloto - Ajustes 18
-- Identificacao segura de consulentes sem WhatsApp.
-- Migration aditiva: preserva todos os cadastros existentes.

alter table if exists public.oh_people
  add column if not exists birth_date date;

comment on column public.oh_people.birth_date is
  'Data de nascimento usada como identificador complementar, especialmente para consulentes sem WhatsApp.';

create index if not exists idx_oh_people_org_birth_date
  on public.oh_people (organization_id, birth_date)
  where birth_date is not null;
