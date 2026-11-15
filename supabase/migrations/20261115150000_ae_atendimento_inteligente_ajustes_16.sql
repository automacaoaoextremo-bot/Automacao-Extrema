-- AE Atendimento Inteligente / RMC - Ajustes 16
-- APLICAR primeiro no Supabase de homologacao, apos migration 14.
-- Nenhum dado de conversas privadas e importado por esta migration.

create table if not exists public.ae_ai_rmc_catalog (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.ae_ai_organizations(id) on delete cascade,
 kind text not null check (kind in ('service','material','tool','address','vehicle','supplier','contract')),
 name text not null check (char_length(btrim(name)) between 2 and 120),
 details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
 is_default boolean not null default false,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint ae_ai_rmc_catalog_default_only_address check (not is_default or kind = 'address'),
 unique (organization_id,id)
);
create unique index if not exists ae_ai_rmc_catalog_unique_name_v16
 on public.ae_ai_rmc_catalog (organization_id,kind,lower(name));
create unique index if not exists ae_ai_rmc_catalog_default_address_v16
 on public.ae_ai_rmc_catalog (organization_id)
 where (kind='address' and is_default);
create index if not exists ae_ai_rmc_catalog_org_kind_v16
 on public.ae_ai_rmc_catalog(organization_id,kind);

create table if not exists public.ae_ai_rmc_review_drafts (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.ae_ai_organizations(id) on delete cascade,
 source_key text not null check (char_length(source_key) between 8 and 160),
 customer_phone text not null check (customer_phone ~ '^[0-9]{10,15}$'),
 customer_label text not null,
 source_date date,
 title text not null,
 summary text not null,
 suggested_status text not null default 'need_info',
 review_status text not null default 'pending' check (review_status in ('pending','approved_for_manual_entry','rejected')),
 review_note text not null default '',
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 unique (organization_id, source_key)
);
create index if not exists ae_ai_rmc_drafts_review_v16
 on public.ae_ai_rmc_review_drafts(organization_id,review_status,created_at desc);

-- Nenhuma politica para anon/authenticated. Somente backend autenticado e service_role.
alter table public.ae_ai_rmc_catalog enable row level security;
alter table public.ae_ai_rmc_review_drafts enable row level security;
revoke all on public.ae_ai_rmc_catalog from anon,authenticated;
revoke all on public.ae_ai_rmc_review_drafts from anon,authenticated;
grant select,insert,update,delete on public.ae_ai_rmc_catalog to service_role;
grant select,insert,update,delete on public.ae_ai_rmc_review_drafts to service_role;

-- Salva catalogo/enderecos em transacao; garante uma unica origem padrao por empresa.
create or replace function public.ae_ai_rmc_save_catalog_v16(
 p_organization_id uuid,p_id uuid,p_kind text,p_name text,
 p_details jsonb,p_is_default boolean,p_actor uuid
) returns uuid language plpgsql security definer
 set search_path=public,pg_temp as $$
declare v_id uuid; v_default boolean;
begin
 if p_kind not in ('service','material','tool','address','vehicle','supplier','contract') or
    char_length(btrim(coalesce(p_name,''))) not between 2 and 120 or
    jsonb_typeof(p_details) is distinct from 'object' then
   raise exception 'Catalogo invalido';
 end if;
 -- Sincroniza mudancas concorrentes da origem padrao.
 perform 1 from public.ae_ai_organizations where id=p_organization_id for update;
 if not found then raise exception 'Empresa nao encontrada'; end if;
 if p_id is not null and not exists(
    select 1 from public.ae_ai_rmc_catalog
    where organization_id=p_organization_id and id=p_id and kind=p_kind
 ) then raise exception 'Registro nao encontrado para esta empresa'; end if;
 v_default := (p_kind='address') and (coalesce(p_is_default,false) or
   not exists(select 1 from public.ae_ai_rmc_catalog
   where organization_id=p_organization_id and kind='address' and is_default
   and (p_id is null or id<>p_id)));
 if v_default then
    update public.ae_ai_rmc_catalog set is_default=false,updated_at=now()
    where organization_id=p_organization_id and kind='address' and is_default
      and (p_id is null or id<>p_id);
 end if;
 if p_id is null then
   insert into public.ae_ai_rmc_catalog(organization_id,kind,name,details,is_default,created_by)
   values(p_organization_id,p_kind,btrim(p_name),p_details,v_default,p_actor)
   returning id into v_id;
 else
   update public.ae_ai_rmc_catalog
   set name=btrim(p_name),details=p_details,is_default=v_default,updated_at=now()
   where id=p_id and organization_id=p_organization_id and kind=p_kind
   returning id into v_id;
 end if;
 return v_id;
end $$;
revoke all on function public.ae_ai_rmc_save_catalog_v16(uuid,uuid,text,text,jsonb,boolean,uuid)
 from public,anon,authenticated;
grant execute on function public.ae_ai_rmc_save_catalog_v16(uuid,uuid,text,text,jsonb,boolean,uuid)
 to service_role;
