-- TUCXA / Organização em Harmonia - Ajuste 64
--
-- O cadastro de pessoas pertence a uma organização. Portanto, o mesmo e-mail
-- pode legitimamente existir em organizações diferentes. A unicidade continua
-- garantida dentro de cada organização.
--
-- A migration é aditiva em comportamento e não altera/exclui pessoas.

do $$
begin
  if to_regclass('public.oh_people') is null then
    return;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.oh_people'::regclass
      and conname = 'oh_people_email_lower_unique'
  ) then
    alter table public.oh_people
      drop constraint oh_people_email_lower_unique;
  end if;
end
$$;

-- Caso a unicidade antiga tenha sido criada como índice e não constraint.
drop index if exists public.oh_people_email_lower_unique;

-- Mantém a proteção contra dois cadastros com o mesmo e-mail dentro da MESMA
-- organização, ignorando nulos/vazios. O índice global anterior impedia um
-- e-mail já utilizado em outra organização de participar do TUCXA.
create unique index if not exists oh_people_organization_email_lower_unique
  on public.oh_people (organization_id, lower(email))
  where email is not null
    and btrim(email) <> '';

comment on index public.oh_people_organization_email_lower_unique is
  'Ajuste 64: e-mail único por organização; identidade canônica do TUCXA continua sendo o celular normalizado.';
