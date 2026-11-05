-- AE Atendimento Inteligente Ajustes 03 — orçamento assistido com WhatsApp manual.
-- PRE-REQUISITOS: migrations 20261103180000 V1 e 20261104173000 Ajustes 02.
-- Sem integracao nova com Meta, sem alteracoes no Tucxa. Fazer backup antes de executar.

create table if not exists public.ae_ai_quote_settings (
  organization_id uuid primary key references public.ae_ai_organizations(id) on delete cascade,
  default_validity_days integer not null default 7 check(default_validity_days between 1 and 30),
  reminder_hours integer not null default 24 check(reminder_hours = 24),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into public.ae_ai_quote_settings(organization_id)
select id from public.ae_ai_organizations
where slug in ('reparos-rmc','piloto-automotivo')
on conflict (organization_id) do nothing;

create table if not exists public.ae_ai_quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ae_ai_organizations(id),
  request_id uuid not null,
  summary text not null check(length(btrim(summary)) between 10 and 3000),
  materials_cents integer not null default 0 check(materials_cents >= 0 and materials_cents <= 100000000),
  labor_cents integer not null default 0 check(labor_cents >= 0 and labor_cents <= 100000000),
  other_cents integer not null default 0 check(other_cents >= 0 and other_cents <= 100000000),
  total_cents bigint generated always as ((materials_cents::bigint + labor_cents::bigint + other_cents::bigint)) stored,
  valid_until timestamptz not null,
  proposed_dates date[] not null,
  chosen_date date,
  status text not null default 'draft' check(status in ('draft','sent','accepted','declined','expired','superseded')),
  sent_at timestamptz,
  accepted_at timestamptz,
  reminder_sent_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ae_ai_quotes_request_fk foreign key (organization_id,request_id)
    references public.ae_ai_requests(organization_id,id),
  constraint ae_ai_quotes_dates_len check(cardinality(proposed_dates) between 2 and 3),
  constraint ae_ai_quotes_chosen_valid check(chosen_date is null or chosen_date = any(proposed_dates))
);
create index if not exists ae_ai_quotes_request_recent on public.ae_ai_quotes(organization_id, request_id, created_at desc);
create index if not exists ae_ai_quotes_reminders on public.ae_ai_quotes(status, valid_until)
  where status = 'sent' and reminder_sent_at is null;

alter table public.ae_ai_quote_settings enable row level security;
alter table public.ae_ai_quotes enable row level security;
revoke all on public.ae_ai_quote_settings, public.ae_ai_quotes from anon, authenticated;

create or replace function public.ae_ai_create_quote_v3(
 p_organization_id uuid, p_request_id uuid, p_actor_id uuid, p_summary text,
 p_materials_cents integer, p_labor_cents integer, p_other_cents integer,
 p_validity_days integer, p_proposed_dates date[]
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_quote_id uuid; v_request_status text;
begin
 if p_validity_days not between 1 and 30
 or p_materials_cents not between 0 and 100000000
 or p_labor_cents not between 0 and 100000000
 or p_other_cents not between 0 and 100000000
 or length(btrim(coalesce(p_summary,''))) not between 10 and 3000
 or cardinality(p_proposed_dates) not between 2 and 3
 or exists(select 1 from unnest(p_proposed_dates) as t(day_offered) where day_offered is null or day_offered < (now() at time zone 'America/Sao_Paulo')::date)
 or (select count(distinct day_offered) from unnest(p_proposed_dates) as t(day_offered)) <> cardinality(p_proposed_dates)
 then raise exception 'Dados invalidos para orcamento'; end if;
 select status into v_request_status from public.ae_ai_requests
   where id=p_request_id and organization_id=p_organization_id for update;
 if not found or v_request_status in ('completed','cancelled','closed') then
   raise exception 'Pedido nao permite orcamento'; end if;
 update public.ae_ai_quotes set status='superseded', updated_at=now(), updated_by=p_actor_id
   where organization_id=p_organization_id and request_id=p_request_id
     and status in ('draft','sent');
 insert into public.ae_ai_quotes(organization_id,request_id,summary,materials_cents,labor_cents,other_cents,valid_until,proposed_dates,created_by,updated_by)
 values(p_organization_id,p_request_id,trim(p_summary),p_materials_cents,p_labor_cents,p_other_cents,
   now() + make_interval(days => p_validity_days),p_proposed_dates,p_actor_id,p_actor_id)
 returning id into v_quote_id;
 insert into public.ae_ai_request_history(organization_id,request_id,status,note,actor_id)
 values(p_organization_id,p_request_id,v_request_status,'Minuta de orcamento registrada. Sem envio automatico.',p_actor_id);
 return v_quote_id;
end $$;

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
   v_stage := 'quoted';v_note := 'Cliente recusou o orcamento, conforme registro do operador.';
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

revoke all on function public.ae_ai_create_quote_v3(uuid,uuid,uuid,text,integer,integer,integer,integer,date[]) from public,anon,authenticated;
grant execute on function public.ae_ai_create_quote_v3(uuid,uuid,uuid,text,integer,integer,integer,integer,date[]) to service_role;
revoke all on function public.ae_ai_transition_quote_v3(uuid,uuid,uuid,uuid,text,date) from public,anon,authenticated;
grant execute on function public.ae_ai_transition_quote_v3(uuid,uuid,uuid,uuid,text,date) to service_role;
