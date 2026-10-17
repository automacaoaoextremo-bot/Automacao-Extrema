-- Organização em Harmonia / TUCXA
-- Agendamento Piloto — Ajuste 63
-- Pessoas sem WhatsApp vinculadas a um contato responsável:
-- Entidade padrão própria + permissão individual para usar Entidade diferente.

alter table if exists public.oh_tucxa_consulente_relationships
  add column if not exists allow_different_entity boolean not null default false;

comment on column public.oh_tucxa_consulente_relationships.allow_different_entity is
  'Quando true, permite que a pessoa vinculada ao contato responsável seja agendada em Entidade diferente de sua Entidade padrão.';

-- O default_entity_id já existe desde o Ajuste 26.
-- Não há backfill destrutivo nesta migration: vínculos históricos continuam sendo
-- apresentados a partir de oh_consulente_appointments e passam a ser persistidos
-- em oh_tucxa_consulente_relationships quando a Recepção salva suas preferências.
