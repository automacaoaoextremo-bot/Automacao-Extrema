-- AE Atendimento Inteligente - Ajustes 04 / Fase 0.
-- Executar APOS V1, Ajustes 02 e Ajustes 03; backup e homologacao obrigatorios.
-- Tabelas exclusivas da AE Atendimento Inteligente. Nunca executar para supor identidade verificada.

create table if not exists public.ae_ai_customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ae_ai_organizations(id) on delete cascade,
  contact_id uuid not null,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null check(length(btrim(full_name)) between 2 and 120),
  email text,
  portal_enabled boolean not null default false,
  must_change_password boolean not null default true,
  phone_verified_at timestamptz,
  provisioned_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, contact_id),
  unique (organization_id, id),
  foreign key (organization_id, contact_id) references public.ae_ai_contacts(organization_id, id)
);
create index if not exists ae_ai_customers_org_idx on public.ae_ai_customers(organization_id, created_at desc);

create table if not exists public.ae_ai_customer_addresses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  contact_id uuid not null,
  label text not null default 'Principal',
  cep text not null check (cep ~ '^[0-9]{8}$'),
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null check(state ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, contact_id) references public.ae_ai_contacts(organization_id, id)
);
create index if not exists ae_ai_addresses_contact_idx on public.ae_ai_customer_addresses(organization_id, contact_id);

alter table public.ae_ai_requests
  add column if not exists customer_id uuid,
  add column if not exists address_id uuid;
-- A migration e executada uma vez; vinculos de integridade compostos mantem o isolamento.
do $$ begin
  if not exists(select 1 from pg_constraint where conname='ae_ai_requests_customer_v4_fk') then
    alter table public.ae_ai_requests add constraint ae_ai_requests_customer_v4_fk
      foreign key(organization_id,customer_id) references public.ae_ai_customers(organization_id,id);
  end if;
  if not exists(select 1 from pg_constraint where conname='ae_ai_requests_address_v4_fk') then
    alter table public.ae_ai_requests add constraint ae_ai_requests_address_v4_fk
      foreign key(organization_id,address_id) references public.ae_ai_customer_addresses(organization_id,id);
  end if;
end $$;

create table if not exists public.ae_ai_request_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  request_id uuid not null,
  position integer not null check(position between 1 and 5),
  category text not null,
  description text not null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (request_id, position),
  foreign key (organization_id,request_id) references public.ae_ai_requests(organization_id,id) on delete cascade
);
create index if not exists ae_ai_items_request_idx on public.ae_ai_request_items(organization_id,request_id);

alter table public.ae_ai_requests drop constraint if exists ae_ai_requests_intake_source_check;
alter table public.ae_ai_requests add constraint ae_ai_requests_intake_source_check
  check (intake_source in ('meta_cloud','assisted_n1','web_self_service','customer_portal'));

alter table public.ae_ai_requests drop constraint if exists ae_ai_requests_status_check;
alter table public.ae_ai_requests add constraint ae_ai_requests_status_check check (status in (
  'pending','need_info','in_review','quoted','approved','scheduled','in_progress',
  'awaiting_payment','completed','declined','cancelled','contacted','closed'
));

alter table public.ae_ai_customers enable row level security;
alter table public.ae_ai_customer_addresses enable row level security;
alter table public.ae_ai_request_items enable row level security;
revoke all on public.ae_ai_customers,public.ae_ai_customer_addresses,public.ae_ai_request_items from anon,authenticated;

-- Novos status para a fila do operador; os status de orcamento continuam separados.
create or replace function public.ae_ai_set_request_stage_v2(
  p_organization_id uuid, p_request_id uuid, p_actor_id uuid,
  p_status text, p_note text
) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_status not in (
    'pending','need_info','in_review','quoted','approved','scheduled','in_progress',
    'awaiting_payment','completed','declined','cancelled','contacted','closed'
  ) then raise exception 'Status invalido'; end if;
  update public.ae_ai_requests set status=p_status,updated_at=now()
    where id=p_request_id and organization_id=p_organization_id;
  if not found then return false; end if;
  insert into public.ae_ai_request_history(organization_id,request_id,status,note,actor_id)
    values(p_organization_id,p_request_id,p_status,nullif(left(trim(coalesce(p_note,'')),1500),''),p_actor_id);
  return true;
end $$;
revoke all on function public.ae_ai_set_request_stage_v2(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.ae_ai_set_request_stage_v2(uuid,uuid,uuid,text,text) to service_role;

-- Uma transacao registra o cliente selecionado, endereco, itens e historico.
-- A API valida permissao, autenticacao e categoria ANTES de chamar esta RPC.
create or replace function public.ae_ai_register_request_v4(
  p_organization_id uuid,
  p_customer_id uuid,
  p_phone text,
  p_name text,
  p_items jsonb,
  p_urgency text,
  p_address_id uuid,
  p_address jsonb,
  p_preferred_contact text,
  p_intake_source text,
  p_intake_by uuid,
  p_consent_confirmed boolean,
  p_secret_hash text,
  p_secret_expires_at timestamptz
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_contact_id uuid;
  v_conv_id uuid;
  v_request_id uuid;
  v_address_id uuid;
  v_address public.ae_ai_customer_addresses%rowtype;
  v_item jsonb;
  v_index integer := 0;
  v_first_category text := '';
  v_all_details text := '';
  v_neighborhood text;
  v_property text;
  v_customer_contact_id uuid;
begin
  if p_phone !~ '^55[0-9]{10,11}$' or length(btrim(coalesce(p_name,''))) < 2
    or p_items is null or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) not between 1 and 5
    or p_urgency not in ('normal','alta')
    or p_intake_source not in ('assisted_n1','customer_portal')
    or p_consent_confirmed is not true
    or p_secret_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Dados invalidos para solicitacao';
  end if;

  if p_customer_id is not null then
    select contact_id into v_customer_contact_id from public.ae_ai_customers
    where id=p_customer_id and organization_id=p_organization_id;
    if not found then raise exception 'Cliente nao pertence a empresa'; end if;
    select id into v_contact_id from public.ae_ai_contacts
    where id=v_customer_contact_id and organization_id=p_organization_id and phone=p_phone;
    if not found then raise exception 'Telefone do cliente nao corresponde ao cadastro'; end if;
  else
    insert into public.ae_ai_contacts(organization_id,phone,display_name)
    values(p_organization_id,p_phone,left(trim(p_name),120))
    on conflict(organization_id,phone) do update set
       display_name=excluded.display_name,updated_at=now()
    returning id into v_contact_id;
  end if;

  if p_address_id is not null then
    select * into v_address from public.ae_ai_customer_addresses
      where id=p_address_id and organization_id=p_organization_id and contact_id=v_contact_id;
    if not found then raise exception 'Endereco nao pertence ao cliente'; end if;
    v_address_id := v_address.id;
  else
    if jsonb_typeof(p_address) <> 'object'
      or coalesce(p_address->>'cep','') !~ '^[0-9]{8}$'
      or coalesce(p_address->>'state','') !~ '^[A-Z]{2}$'
      or length(trim(coalesce(p_address->>'street',''))) < 2
      or length(trim(coalesce(p_address->>'number',''))) < 1
      or length(trim(coalesce(p_address->>'neighborhood',''))) < 2
      or length(trim(coalesce(p_address->>'city',''))) < 2 then
      raise exception 'Endereco incompleto';
    end if;
    insert into public.ae_ai_customer_addresses(organization_id,contact_id,label,cep,street,number,complement,neighborhood,city,state)
    values(p_organization_id,v_contact_id,left(coalesce(p_address->>'label','Principal'),50),
      p_address->>'cep',left(trim(p_address->>'street'),180),left(trim(p_address->>'number'),30),
      nullif(left(trim(coalesce(p_address->>'complement','')),100),''),
      left(trim(p_address->>'neighborhood'),120),left(trim(p_address->>'city'),120),p_address->>'state')
    returning * into v_address;
    v_address_id := v_address.id;
  end if;
  v_neighborhood := v_address.neighborhood;
  v_property := left(concat_ws(', ',v_address.street,v_address.number,nullif(v_address.complement,''),
    v_address.neighborhood, v_address.city || '/' || v_address.state, v_address.cep),300);

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_index := v_index + 1;
    if length(trim(coalesce(v_item->>'category',''))) < 2
       or length(trim(coalesce(v_item->>'description',''))) < 12
       or length(v_item->>'description') > 4000 then
      raise exception 'Servico incompleto';
    end if;
    if v_index = 1 then v_first_category := left(v_item->>'category',120); end if;
    v_all_details := v_all_details || case when v_index>1 then E'\n\n' else '' end
      || left(v_item->>'category',120) || ': ' || left(v_item->>'description',3300)
      || case when length(trim(coalesce(v_item->'answers'->>'specific','')))>0
         then E'\nDetalhe adicional: ' || left(v_item->'answers'->>'specific',480) else '' end;
  end loop;
  insert into public.ae_ai_conversations(organization_id,contact_id,mode,stage)
    values(p_organization_id,v_contact_id,'human','handoff')
    on conflict(organization_id,contact_id) do update set updated_at=now()
    returning id into v_conv_id;
  insert into public.ae_ai_requests(
    organization_id,conversation_id,category,description,neighborhood,urgency,
    customer_name,property_address,preferred_contact,intake_source,intake_by,
    consent_confirmed,intake_secret_hash,intake_secret_expires_at,customer_id,address_id
  ) values (
    p_organization_id,v_conv_id,v_first_category,left(v_all_details,4000),v_neighborhood,p_urgency,
    left(trim(p_name),120),v_property,nullif(left(trim(coalesce(p_preferred_contact,'')),200),''),
    p_intake_source,p_intake_by,true,p_secret_hash,p_secret_expires_at,p_customer_id,v_address_id
  ) returning id into v_request_id;
  v_index := 0;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_index := v_index + 1;
    insert into public.ae_ai_request_items(organization_id,request_id,position,category,description,answers)
    values(p_organization_id,v_request_id,v_index,left(v_item->>'category',120),
      left(v_item->>'description',4000),coalesce(v_item->'answers','{}'::jsonb));
  end loop;
  insert into public.ae_ai_request_history(organization_id,request_id,status,note,actor_id)
  values (p_organization_id,v_request_id,'pending',
    case when p_intake_source='assisted_n1' then 'Cadastro assistido por operador autorizado'
      else 'Solicitacao registrada em portal autenticado' end,p_intake_by);
  return v_request_id;
end $$;
revoke all on function public.ae_ai_register_request_v4(uuid,uuid,text,text,jsonb,text,uuid,jsonb,text,text,uuid,boolean,text,timestamptz) from public,anon,authenticated;
grant execute on function public.ae_ai_register_request_v4(uuid,uuid,text,text,jsonb,text,uuid,jsonb,text,text,uuid,boolean,text,timestamptz) to service_role;

-- Alinhar status do pedido quando o cliente recusa o orçamento.
create or replace function public.ae_ai_transition_quote_v3(
 p_organization_id uuid, p_request_id uuid, p_quote_id uuid,
 p_actor_id uuid, p_action text, p_chosen_date date default null
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_quote public.ae_ai_quotes%rowtype; v_stage text; v_note text;
begin
 select * into v_quote from public.ae_ai_quotes
 where id=p_quote_id and organization_id=p_organization_id and request_id=p_request_id for update;
 if not found then return false; end if;
 if p_action='sent' and v_quote.status='draft' and v_quote.valid_until>now() then
   update public.ae_ai_quotes set status='sent',sent_at=now(),updated_at=now(),updated_by=p_actor_id where id=p_quote_id;
   v_stage := 'quoted';v_note := 'Operador confirmou envio manual do orcamento por WhatsApp.';
 elsif p_action='accepted' and v_quote.status='sent' and v_quote.valid_until>now()
   and p_chosen_date is not null and p_chosen_date=any(v_quote.proposed_dates) then
   update public.ae_ai_quotes set status='accepted',chosen_date=p_chosen_date,accepted_at=now(),updated_at=now(),updated_by=p_actor_id where id=p_quote_id;
   v_stage := 'scheduled'; v_note := 'Aceite informado pelo operador; data escolhida ' || p_chosen_date::text || '. Confirmar horario antes da visita.';
 elsif p_action='declined' and v_quote.status='sent' then
   update public.ae_ai_quotes set status='declined',updated_at=now(),updated_by=p_actor_id where id=p_quote_id;
   v_stage := 'declined';v_note := 'Cliente recusou o orcamento, conforme registro do operador.';
 elsif p_action='expired' and v_quote.status='sent' and v_quote.valid_until<=now() then
   update public.ae_ai_quotes set status='expired',updated_at=now(),updated_by=p_actor_id where id=p_quote_id;
   v_stage := 'quoted';v_note := 'Orcamento marcado como vencido.';
 elsif p_action='reminded' and v_quote.status='sent' and v_quote.reminder_sent_at is null
   and now()>=v_quote.valid_until-interval '24 hours' and now()<v_quote.valid_until then
   update public.ae_ai_quotes set reminder_sent_at=now(),updated_at=now(),updated_by=p_actor_id where id=p_quote_id;
   select status into v_stage from public.ae_ai_requests where id=p_request_id and organization_id=p_organization_id;
   v_note := 'Operador confirmou lembrete manual no WhatsApp. Sem envio pela API.';
 else raise exception 'Transicao de orcamento nao permitida'; end if;
 if p_action <> 'reminded' then
   update public.ae_ai_requests set status=v_stage, updated_at=now()
   where id=p_request_id and organization_id=p_organization_id;
 end if;
 insert into public.ae_ai_request_history(organization_id,request_id,status,note,actor_id)
 values(p_organization_id,p_request_id,v_stage,v_note,p_actor_id);
 return true;
end $$;

-- Esta fase NAO libera clientes, cadastro publico nem automacao WhatsApp.
update public.ae_ai_organizations set public_intake_enabled=false, automation_enabled=false
  where slug in ('reparos-rmc','piloto-automotivo');
