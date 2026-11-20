-- AE Atendimento Inteligente | Ajustes 02 | Fase 0: N1 assistido, N2 Anderson.
-- Executar SOMENTE depois de 20261103180000_ae_atendimento_inteligente_v1.sql.
-- Nao altera TUCXA, BotConversa nem a Cloud API existente.

alter table public.ae_ai_organizations
  add column if not exists public_intake_enabled boolean not null default false;

alter table public.ae_ai_requests
  add column if not exists customer_name text,
  add column if not exists property_address text,
  add column if not exists preferred_contact text,
  add column if not exists intake_source text not null default 'meta_cloud',
  add column if not exists intake_by uuid references auth.users(id),
  add column if not exists consent_confirmed boolean not null default false,
  add column if not exists intake_secret_hash text,
  add column if not exists intake_secret_expires_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.ae_ai_requests drop constraint if exists ae_ai_requests_status_check;
alter table public.ae_ai_requests add constraint ae_ai_requests_status_check
  check (status in ('pending','in_review','need_info','quoted','scheduled','completed','cancelled','contacted','closed'));

alter table public.ae_ai_requests add constraint ae_ai_requests_intake_source_check
  check (intake_source in ('meta_cloud','assisted_n1','web_self_service'));

create index if not exists ae_ai_requests_queue_idx
  on public.ae_ai_requests (organization_id, status, created_at desc);

-- A chave composta evita anexos e historico associados a outra empresa.
alter table public.ae_ai_requests
  add constraint ae_ai_requests_org_id_unique unique (organization_id, id);

create table if not exists public.ae_ai_request_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  request_id uuid not null,
  status text not null,
  note text,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (organization_id, request_id) references public.ae_ai_requests(organization_id, id)
);

create table if not exists public.ae_ai_request_media (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  request_id uuid not null,
  object_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','video/mp4','video/webm')),
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 15728640),
  original_name text not null,
  uploaded boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (organization_id, request_id) references public.ae_ai_requests(organization_id, id)
);
create index if not exists ae_ai_request_media_request_idx
  on public.ae_ai_request_media(organization_id, request_id);

-- Bucket PRIVADO. URL de leitura somente assinada para operador autorizado.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('ae-ai-request-media','ae-ai-request-media',false,15728640,
  array['image/jpeg','image/png','image/webp','video/mp4','video/webm']::text[])
on conflict (id) do update set public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

-- Impedir acesso direto por roles web (APIs autenticadas aplicam o escopo).
alter table public.ae_ai_request_history enable row level security;
alter table public.ae_ai_request_media enable row level security;
revoke all on public.ae_ai_request_history, public.ae_ai_request_media from anon, authenticated;

-- Esta RPC eh invocada SOMENTE pelo servidor com service_role, apos verificacao
-- de autenticacao + membership (N1) ou Turnstile (cliente publico).
create or replace function public.ae_ai_register_request_v2(
  p_organization_id uuid,
  p_phone text,
  p_name text,
  p_category text,
  p_description text,
  p_neighborhood text,
  p_urgency text,
  p_address text,
  p_preferred_contact text,
  p_intake_source text,
  p_intake_by uuid,
  p_consent_confirmed boolean,
  p_secret_hash text,
  p_secret_expires_at timestamptz
) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_contact_id uuid;
  v_conv_id uuid;
  v_request_id uuid;
begin
  if p_phone !~ '^55[0-9]{10,11}$'
    or length(btrim(coalesce(p_name,''))) < 2
    or length(btrim(coalesce(p_description,''))) < 12
    or p_intake_source not in ('assisted_n1','web_self_service')
    or p_urgency not in ('normal','alta')
    or p_consent_confirmed is not true then
    raise exception 'Dados de solicitacao invalidos';
  end if;

  insert into public.ae_ai_contacts (organization_id,phone,display_name)
  values (p_organization_id,p_phone,left(btrim(p_name),120))
  on conflict (organization_id,phone)
  do update set display_name=excluded.display_name,updated_at=now()
  returning id into v_contact_id;

  insert into public.ae_ai_conversations (organization_id,contact_id,mode,stage)
  values (p_organization_id,v_contact_id,'human','handoff')
  on conflict (organization_id,contact_id)
  do update set updated_at=now() -- nao altera estado/mode de uma conversa em curso
  returning id into v_conv_id;

  insert into public.ae_ai_requests (
    organization_id,conversation_id,category,description,neighborhood,urgency,
    customer_name,property_address,preferred_contact,intake_source,
    intake_by,consent_confirmed,intake_secret_hash,intake_secret_expires_at
  ) values (
    p_organization_id,v_conv_id,left(btrim(p_category),120),left(btrim(p_description),4000),
    left(btrim(p_neighborhood),180),p_urgency,left(btrim(p_name),120),
    nullif(left(btrim(coalesce(p_address,'')),300),''),
    nullif(left(btrim(coalesce(p_preferred_contact,'')),200),''),
    p_intake_source,p_intake_by,true,p_secret_hash,p_secret_expires_at
  ) returning id into v_request_id;

  insert into public.ae_ai_request_history(organization_id,request_id,status,note,actor_id)
  values(p_organization_id,v_request_id,'pending',
    case when p_intake_source='assisted_n1' then 'Recebido via triagem manual do nivel 1' else 'Enviado pelo cliente no formulario publico' end,
    p_intake_by);
  return v_request_id;
end;
$$;
revoke all on function public.ae_ai_register_request_v2(uuid,text,text,text,text,text,text,text,text,text,uuid,boolean,text,timestamptz) from public,anon,authenticated;
grant execute on function public.ae_ai_register_request_v2(uuid,text,text,text,text,text,text,text,text,text,uuid,boolean,text,timestamptz) to service_role;

-- Atualizar status e registrar o historico na MESMA transacao.
create or replace function public.ae_ai_set_request_stage_v2(
  p_organization_id uuid,
  p_request_id uuid,
  p_actor_id uuid,
  p_status text,
  p_note text
) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_status not in ('pending','in_review','need_info','quoted','scheduled','completed','cancelled','contacted','closed') then
    raise exception 'Status invalido';
  end if;
  update public.ae_ai_requests set status=p_status,updated_at=now()
    where id=p_request_id and organization_id=p_organization_id;
  if not found then return false; end if;
  insert into public.ae_ai_request_history(organization_id,request_id,status,note,actor_id)
    values(p_organization_id,p_request_id,p_status,nullif(left(trim(coalesce(p_note,'')),1500),''),p_actor_id);
  return true;
end;
$$;
revoke all on function public.ae_ai_set_request_stage_v2(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.ae_ai_set_request_stage_v2(uuid,uuid,uuid,text,text) to service_role;

-- Nao habilitar formulario publico ou bot antes dos testes.
update public.ae_ai_organizations set public_intake_enabled=false
where slug in ('reparos-rmc','piloto-automotivo');
