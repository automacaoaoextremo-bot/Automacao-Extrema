-- Organização em Harmonia / TUCXA
-- Ajustes de privacidade do Consulente e consistência das entidades.
-- Migration aditiva e sem exclusão de histórico.

alter table if exists public.oh_people
  add column if not exists privacy_notice_accepted_at timestamptz,
  add column if not exists privacy_notice_version text,
  add column if not exists privacy_notice_source text;

comment on column public.oh_people.privacy_notice_accepted_at is
  'Data e hora em que a pessoa confirmou ciência do Aviso de Privacidade.';
comment on column public.oh_people.privacy_notice_version is
  'Versão do Aviso de Privacidade apresentada à pessoa.';
comment on column public.oh_people.privacy_notice_source is
  'Origem da confirmação de ciência do Aviso de Privacidade.';

-- Remove somente o texto técnico de carga inicial que chegou a ser exibido
-- ao Consulente. Orientações reais cadastradas pela organização são preservadas.
update public.oh_spiritual_entities
set appointment_notes = null,
    updated_at = now()
where appointment_notes is not null
  and (
    lower(appointment_notes) like '%cadastro inicial genérico%'
    or lower(appointment_notes) like '%cadastro inicial generico%'
    or lower(appointment_notes) like '%edite nome, linha e capacidade%'
  );

-- Registros antigos inconsistentes deixam de participar de novos agendamentos.
-- O histórico e o cadastro permanecem armazenados.
update public.oh_spiritual_entities
set active = false,
    appointment_enabled = false,
    updated_at = now()
where active = true
  and coalesce(cardinality(usual_days), 0) = 0;

update public.oh_spiritual_entities
set appointment_enabled = false,
    updated_at = now()
where appointment_enabled = true
  and (
    active is distinct from true
    or coalesce(cardinality(usual_days), 0) = 0
  );

-- Regras de integridade também no banco, além das validações da interface e API.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'oh_spiritual_entities_active_requires_day'
      and conrelid = 'public.oh_spiritual_entities'::regclass
  ) then
    alter table public.oh_spiritual_entities
      add constraint oh_spiritual_entities_active_requires_day
      check (
        active is distinct from true
        or coalesce(cardinality(usual_days), 0) > 0
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'oh_spiritual_entities_booking_requires_active_day'
      and conrelid = 'public.oh_spiritual_entities'::regclass
  ) then
    alter table public.oh_spiritual_entities
      add constraint oh_spiritual_entities_booking_requires_active_day
      check (
        appointment_enabled is distinct from true
        or (
          active is true
          and coalesce(cardinality(usual_days), 0) > 0
        )
      );
  end if;
end
$$;

create index if not exists idx_oh_spiritual_entities_booking_days
  on public.oh_spiritual_entities (organization_id, active, appointment_enabled);
