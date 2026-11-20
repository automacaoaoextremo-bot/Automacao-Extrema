-- AE Atendimento Inteligente V1 - somente CRM / triagem / Cloud API
-- Revisar e executar manualmente no Supabase SQL Editor ANTES da ativacao de webhooks.
-- Estrutura nova; nao altera tabelas existentes do TUCXA, BotConversa, Bazar ou Memorias.

create table if not exists public.ae_ai_organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  name text not null,
  segment text not null check (segment in ('reparos','automotivo')),
  website text,
  status text not null default 'onboarding' check (status in ('onboarding','active','suspended')),
  automation_enabled boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.ae_ai_platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.ae_ai_memberships (
  organization_id uuid not null references public.ae_ai_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','operator')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create table if not exists public.ae_ai_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ae_ai_organizations(id) on delete cascade,
  provider text not null default 'meta_cloud' check(provider='meta_cloud'),
  phone_number_id text unique,
  token_env_key text not null check (token_env_key ~ '^AE_WA_TOKEN_[A-Z0-9_]+$'),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  unique(organization_id, id)
);
-- A V1 permite um canal ativo POR EMPRESA (varias empresas = varios numeros).
create unique index if not exists ae_ai_one_active_channel_per_org on public.ae_ai_channels(organization_id) where active;
create table if not exists public.ae_ai_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ae_ai_organizations(id) on delete cascade,
  phone text not null check (phone ~ '^[0-9]{8,15}$'),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, phone),
  unique (organization_id, id)
);
create table if not exists public.ae_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ae_ai_organizations(id) on delete cascade,
  contact_id uuid not null,
  mode text not null default 'bot' check (mode in ('bot','human','closed')),
  stage text not null default 'new',
  state jsonb not null default '{}'::jsonb,
  last_inbound_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(organization_id, contact_id),
  unique(organization_id, id),
  foreign key (organization_id, contact_id) references public.ae_ai_contacts(organization_id, id)
);
create table if not exists public.ae_ai_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  conversation_id uuid not null,
  external_message_id text,
  direction text not null check (direction in ('inbound','outbound')),
  message_type text not null default 'text',
  body text,
  media_id text, -- Apenas o ID Meta; baixar e armazenar anexos requer etapa posterior.
  created_at timestamptz not null default now(),
  foreign key (organization_id, conversation_id) references public.ae_ai_conversations(organization_id, id),
  unique (organization_id, external_message_id)
);
create index if not exists ae_ai_messages_conversation_idx on public.ae_ai_messages(conversation_id, created_at desc);
create table if not exists public.ae_ai_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  conversation_id uuid not null,
  category text not null,
  description text not null,
  neighborhood text not null,
  urgency text not null check(urgency in ('normal','alta')),
  status text not null default 'pending' check(status in ('pending','contacted','closed')),
  created_at timestamptz not null default now(),
  foreign key (organization_id, conversation_id) references public.ae_ai_conversations(organization_id, id)
);
create index if not exists ae_ai_requests_org_idx on public.ae_ai_requests(organization_id,created_at desc);
create table if not exists public.ae_ai_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  channel_id uuid not null,
  conversation_id uuid not null,
  to_phone text not null,
  body text not null,
  source text not null check(source in ('bot','human')),
  status text not null default 'pending' check(status in ('pending','sending','sent','simulated','failed','unknown')),
  external_message_id text,
  attempts integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  attempted_at timestamptz,
  sent_at timestamptz,
  foreign key (organization_id, channel_id) references public.ae_ai_channels(organization_id,id),
  foreign key (organization_id, conversation_id) references public.ae_ai_conversations(organization_id,id)
);
create index if not exists ae_ai_outbox_status_idx on public.ae_ai_outbox(status, created_at);

-- O servidor usa SUPABASE_SERVICE_ROLE_KEY; acessos diretos de clientes sao bloqueados.
-- Cada endpoint autentica operador e verifica organization_id antes de consultar dados.
do $$
declare t text;
begin
  foreach t in array array[
    'ae_ai_organizations','ae_ai_platform_admins','ae_ai_memberships',
    'ae_ai_channels','ae_ai_contacts','ae_ai_conversations',
    'ae_ai_messages','ae_ai_requests','ae_ai_outbox'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- A transacao abaixo evita duplicidade de reentregas e avancos de etapa repetidos.
create or replace function public.ae_ai_receive_message(
  p_phone_number_id text, p_message_id text, p_from text, p_type text,
  p_text text, p_media_id text default null, p_contact_name text default null
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
  v_channel_id uuid;
  v_seg text;
  v_auto boolean;
  v_contact_id uuid;
  v_conv public.ae_ai_conversations%rowtype;
  v_name text := nullif(left(trim(coalesce(p_contact_name,'')),120),'');
  v_phone text := regexp_replace(coalesce(p_from,''),'[^0-9]','','g');
  v_text text := left(trim(coalesce(p_text,'')),1800);
  v_stage text;
  v_data jsonb;
  v_category text;
  v_reply text;
  v_outbox_id uuid;
  v_choice text;
  v_menu text;
  v_has_text boolean;
  v_urgency text;
begin
  if coalesce(p_message_id,'')='' or length(p_message_id)>200 or v_phone !~ '^[0-9]{8,15}$' then
    return jsonb_build_object('ignored',true,'reason','invalid_message');
  end if;

  select o.id, c.id, o.segment, o.automation_enabled
    into v_org_id,v_channel_id,v_seg,v_auto
  from public.ae_ai_channels c join public.ae_ai_organizations o on o.id=c.organization_id
  where c.phone_number_id=p_phone_number_id and c.active and o.status='active';
  if v_org_id is null then
    return jsonb_build_object('ignored',true,'reason','unknown_or_inactive_channel');
  end if;

  insert into public.ae_ai_contacts(organization_id,phone,display_name)
  values (v_org_id,v_phone,v_name)
  on conflict (organization_id,phone) do update
    set display_name=coalesce(excluded.display_name,public.ae_ai_contacts.display_name),
        updated_at=now()
  returning id into v_contact_id;

  insert into public.ae_ai_conversations(organization_id,contact_id)
  values (v_org_id,v_contact_id)
  on conflict (organization_id,contact_id) do update set updated_at=now()
  returning * into v_conv;
  select * into v_conv from public.ae_ai_conversations
   where id=v_conv.id for update;

  -- A insercao idempotente acontece antes da transicao do bot.
  insert into public.ae_ai_messages(organization_id,conversation_id,external_message_id,
      direction,message_type,body,media_id)
  values(v_org_id,v_conv.id,p_message_id,'inbound',left(coalesce(p_type,'other'),40),v_text,
      nullif(left(coalesce(p_media_id,''),250),''))
  on conflict (organization_id,external_message_id) do nothing;
  if not found then
    return jsonb_build_object('duplicate',true,'conversation_id',v_conv.id);
  end if;

  update public.ae_ai_conversations set last_inbound_at=now(),updated_at=now() where id=v_conv.id;
  if not v_auto or v_conv.mode <> 'bot' then
    return jsonb_build_object('stored',true,'conversation_id',v_conv.id,'reply_queued',false);
  end if;

  v_menu := case when v_seg='automotivo'
      then '1 - Bateria' || E'\n' || '2 - Motor de partida' || E'\n' || '3 - Alternador' || E'\n' || '4 - Autoeletrica' || E'\n' || '5 - Socorro'
      else '1 - Eletrica' || E'\n' || '2 - Hidraulica' || E'\n' || '3 - Instalacoes e reparos' || E'\n' || '4 - Pintura e jardinagem' || E'\n' || '5 - Outros servicos' end;
  v_stage := v_conv.stage;
  v_data := coalesce(v_conv.state,'{}'::jsonb);
  v_has_text := length(v_text)>0 and p_type in ('text','button','interactive');

  if lower(v_text)='atendente' then
    v_reply := 'Recebido. Vamos direcionar seu contato para atendimento humano. O retorno depende da disponibilidade da equipe.';
    update public.ae_ai_conversations set mode='human' where id=v_conv.id;
    v_stage := 'handoff';
  elsif v_stage='new' then
    v_reply := case when v_seg='automotivo'
      then 'Ola! Voce entrou em contato com o Centro Automotivo Piloto. Sou o assistente de triagem. Qual assunto precisa de atendimento?'
      else 'Ola! Bem-vindo a Reparos RMC. Sou o assistente de triagem. Qual servico voce precisa?' end
      || E'\n' || v_menu || E'\n' || 'Responda com o numero. Voce pode pedir atendimento humano a qualquer momento escrevendo ATENDENTE.';
    v_stage := 'waiting_category';
  elsif v_stage='waiting_category' then
    v_choice := substring(v_text from '^\s*([1-5])\s*$');
    if v_has_text and v_choice is not null then
      v_category := case when v_seg='automotivo' then
        (array['Bateria','Motor de partida','Alternador','Autoeletrica','Socorro'])[v_choice::integer]
        else (array['Eletrica','Hidraulica','Instalacoes e reparos','Pintura e jardinagem','Outros servicos'])[v_choice::integer] end;
      v_data := v_data || jsonb_build_object('category',v_category);
      v_reply := 'Entendi: '||v_category||'. Conte brevemente o problema ou o servico desejado. Se quiser, envie fotos tambem. Elas ficam registradas para avaliacao.';
      v_stage := 'waiting_details';
    else
      v_reply := 'Por favor, escolha uma das opcoes respondendo de 1 a 5:'||E'\n'||v_menu;
    end if;
  elsif v_stage='waiting_details' then
    if v_has_text then
      v_data := v_data || jsonb_build_object('description',v_text);
      v_stage := 'waiting_location';
      v_reply := case when v_seg='automotivo' then 'Obrigado! Em qual bairro voce esta e qual o modelo do veiculo?'
        else 'Obrigado! Em qual bairro ou regiao de Campinas e o local do servico?' end;
    else
      v_reply := 'Recebi sua mensagem ou anexo. Para continuar, escreva uma breve descricao do problema.';
    end if;
  elsif v_stage='waiting_location' then
    if v_has_text then
      v_data := v_data || jsonb_build_object('neighborhood',v_text);
      v_stage := 'waiting_urgency';
      v_reply := 'Voce considera que precisa de atencao urgente? Responda 1 para SIM ou 2 para NAO. Nao estamos confirmando visita, horario ou preco. Em risco imediato, acione o servico de emergencia apropriado.';
    else
      v_reply := 'Pode informar o bairro e, se for veiculo, o modelo?';
    end if;
  elsif v_stage='waiting_urgency' then
    v_urgency := case when lower(v_text) in ('1','sim','s','urgente') then 'alta'
      when lower(v_text) in ('2','nao','não','n') then 'normal' else null end;
    if v_urgency is null then
      v_reply := 'Por favor, responda 1 (SIM) ou 2 (NAO).';
    else
      insert into public.ae_ai_requests(organization_id,conversation_id,category,description,neighborhood,urgency)
      values(v_org_id,v_conv.id,v_data->>'category',v_data->>'description',v_data->>'neighborhood',v_urgency);
      v_stage := 'handoff';
      update public.ae_ai_conversations set mode='human' where id=v_conv.id;
      v_reply := 'Obrigado! Sua solicitacao foi registrada e encaminhada para avaliacao humana. A equipe retornara conforme disponibilidade, sem compromisso de horario ou preco neste momento.';
    end if;
  else
    -- Um fluxo ja concluido exige intervencao do atendente; nada e enviado.
    return jsonb_build_object('stored',true,'conversation_id',v_conv.id,'reply_queued',false);
  end if;

  update public.ae_ai_conversations
    set stage=v_stage,state=v_data,updated_at=now()
    where id=v_conv.id;
  insert into public.ae_ai_outbox(organization_id,channel_id,conversation_id,to_phone,body,source)
  values(v_org_id,v_channel_id,v_conv.id,v_phone,v_reply,'bot') returning id into v_outbox_id;
  return jsonb_build_object('stored',true,'conversation_id',v_conv.id,
     'reply_queued',true,'outbox_id',v_outbox_id,'stage',v_stage);
end $$;

create or replace function public.ae_ai_claim_outbox(p_outbox_id uuid)
returns setof public.ae_ai_outbox language sql security definer set search_path = public, pg_temp as $$
  update public.ae_ai_outbox set status='sending', attempts=attempts+1,attempted_at=now()
  where id=p_outbox_id and status='pending'
  returning *;
$$;
revoke all on function public.ae_ai_receive_message(text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.ae_ai_receive_message(text,text,text,text,text,text,text) to service_role;
revoke all on function public.ae_ai_claim_outbox(uuid) from public,anon,authenticated;
grant execute on function public.ae_ai_claim_outbox(uuid) to service_role;

-- Cadastros iniciais: SEM numeros Meta ativos e SEM automacao ligada.
insert into public.ae_ai_organizations(slug,name,segment,website)
values
 ('reparos-rmc','Reparos RMC','reparos','https://www.reparosrmc.com.br/'),
 ('piloto-automotivo','Piloto Eletrica e Baterias','automotivo','https://pilotobaterias.wixsite.com/piloto')
on conflict (slug) do nothing;
