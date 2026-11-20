-- AE Atendimento Inteligente - Ajustes 14 (2026-11-14)
-- Aplicar APOS as migrations 01-04. Fazer backup e testar no Preview.
-- Clientes novos podem ser cadastrados sem senha/conta de Auth na Fase 0.
-- Contas Auth ja vinculadas continuam inalteradas; nenhuma senha e criada/alterada.
BEGIN;
ALTER TABLE public.ae_ai_customers ALTER COLUMN auth_user_id DROP NOT NULL;
DO $check$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ae_ai_customer_portal_requires_auth_v14') THEN
    ALTER TABLE public.ae_ai_customers ADD CONSTRAINT ae_ai_customer_portal_requires_auth_v14
      CHECK (auth_user_id IS NOT NULL OR portal_enabled = false);
  END IF;
END $check$;
-- Registrar operacao N1 sem afirmar consentimento expresso inexistente.
-- Portal futuro continua exigindo consentimento verdadeiro.
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
    or (p_intake_source='customer_portal' and p_consent_confirmed is not true)
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
    p_intake_source,p_intake_by,(p_consent_confirmed is true),p_secret_hash,p_secret_expires_at,p_customer_id,v_address_id
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
    case when p_intake_source='assisted_n1' then 'Solicitacao registrada pelo operador N1; autorizacao da origem deve ser comprovada no historico do atendimento'
      else 'Solicitacao registrada em portal autenticado' end,p_intake_by);
  return v_request_id;
end $$;
REVOKE ALL ON FUNCTION public.ae_ai_register_request_v4(uuid,uuid,text,text,jsonb,text,uuid,jsonb,text,text,uuid,boolean,text,timestamptz)
  FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ae_ai_register_request_v4(uuid,uuid,text,text,jsonb,text,uuid,jsonb,text,text,uuid,boolean,text,timestamptz)
  TO service_role;
COMMIT;
