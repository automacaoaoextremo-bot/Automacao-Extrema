-- Organização em Harmonia / Corrente em Dia v3 — Ajustes Evolução 05
-- Mantém os vínculos familiares nos dois cadastros e saneia os registros existentes.
-- Os graus neutros abaixo são internos e não aparecem como opções de cadastro.

insert into public.oh_family_relationship_types (
  organization_id,
  slug,
  label,
  sort_order,
  active
)
select organization_id, 'filho-ou-filha', 'Filho(a)', 55, true
from public.oh_family_relationship_types
where slug in ('pai', 'mae')
group by organization_id
on conflict (organization_id, slug) do update set
  label = excluded.label,
  active = true,
  updated_at = now();

insert into public.oh_family_relationship_types (
  organization_id,
  slug,
  label,
  sort_order,
  active
)
select organization_id, 'pai-ou-mae', 'Pai/Mãe', 25, true
from public.oh_family_relationship_types
where slug in ('filho', 'filha')
group by organization_id
on conflict (organization_id, slug) do update set
  label = excluded.label,
  active = true,
  updated_at = now();

create or replace function public.oh_inverse_family_relationship_type(
  p_organization_id uuid,
  p_relationship_type_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  original_slug text;
  inverse_slug text;
  inverse_id uuid;
begin
  select slug
    into original_slug
    from public.oh_family_relationship_types
   where id = p_relationship_type_id
     and organization_id = p_organization_id;

  inverse_slug := case original_slug
    when 'pai' then 'filho-ou-filha'
    when 'mae' then 'filho-ou-filha'
    when 'filho' then 'pai-ou-mae'
    when 'filha' then 'pai-ou-mae'
    when 'marido' then 'esposa'
    when 'esposa' then 'marido'
    when 'filho-ou-filha' then 'pai-ou-mae'
    when 'pai-ou-mae' then 'filho-ou-filha'
    else null
  end;

  if inverse_slug is null then
    return null;
  end if;

  select id
    into inverse_id
    from public.oh_family_relationship_types
   where organization_id = p_organization_id
     and slug = inverse_slug
     and active = true
   limit 1;

  return inverse_id;
end;
$$;

create or replace function public.oh_sync_reciprocal_family_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inverse_type_id uuid;
  generated_source text;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  -- Linhas geradas pelo próprio gatilho não propagam outra alteração.
  if coalesce(new.source, '') like 'reciprocal:%' then
    return new;
  end if;

  generated_source := 'reciprocal:' || new.person_id::text;
  inverse_type_id := public.oh_inverse_family_relationship_type(
    new.organization_id,
    new.relationship_type_id
  );

  if new.active and inverse_type_id is not null then
    insert into public.oh_person_family_links (
      organization_id,
      person_id,
      related_person_id,
      relationship_type_id,
      source,
      active,
      updated_at
    )
    values (
      new.organization_id,
      new.related_person_id,
      new.person_id,
      inverse_type_id,
      generated_source,
      true,
      now()
    )
    on conflict (organization_id, person_id, related_person_id)
    do update set
      relationship_type_id = case
        when public.oh_person_family_links.source like 'reciprocal:%'
          then excluded.relationship_type_id
        else public.oh_person_family_links.relationship_type_id
      end,
      source = case
        when public.oh_person_family_links.source like 'reciprocal:%'
          then excluded.source
        else public.oh_person_family_links.source
      end,
      active = true,
      updated_at = now();
  elsif not new.active then
    update public.oh_person_family_links
       set active = false,
           updated_at = now()
     where organization_id = new.organization_id
       and person_id = new.related_person_id
       and related_person_id = new.person_id
       and source = generated_source
       and active = true;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_oh_sync_reciprocal_family_link
  on public.oh_person_family_links;

create trigger trg_oh_sync_reciprocal_family_link
after insert or update of relationship_type_id, active
on public.oh_person_family_links
for each row
execute function public.oh_sync_reciprocal_family_link();

-- Saneia todos os vínculos ativos existentes sem substituir um vínculo
-- inverso que já tenha sido informado diretamente pela outra pessoa.
insert into public.oh_person_family_links (
  organization_id,
  person_id,
  related_person_id,
  relationship_type_id,
  source,
  active,
  updated_at
)
select
  original.organization_id,
  original.related_person_id,
  original.person_id,
  public.oh_inverse_family_relationship_type(
    original.organization_id,
    original.relationship_type_id
  ),
  'reciprocal:' || original.person_id::text,
  true,
  now()
from public.oh_person_family_links original
where original.active = true
  and coalesce(original.source, '') not like 'reciprocal:%'
  and public.oh_inverse_family_relationship_type(
    original.organization_id,
    original.relationship_type_id
  ) is not null
  and not exists (
    select 1
      from public.oh_person_family_links reverse_link
     where reverse_link.organization_id = original.organization_id
       and reverse_link.person_id = original.related_person_id
       and reverse_link.related_person_id = original.person_id
  )
on conflict (organization_id, person_id, related_person_id) do nothing;

comment on function public.oh_sync_reciprocal_family_link() is
  'Cria e mantém o vínculo familiar inverso sem sobrescrever vínculos informados diretamente.';
