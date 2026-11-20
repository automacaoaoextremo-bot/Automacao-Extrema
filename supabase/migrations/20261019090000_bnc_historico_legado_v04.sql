-- Aplicar somente no projeto de HOMOLOGAÇÃO e DEPOIS da migration base do BNC.
-- Arquivo fonte original jamais é modificado. Histórico fica privado (RLS sem policies públicas).
create table if not exists public.bnc_legacy_raw (
  source_project text not null,
  source_table text not null,
  source_id text not null,
  payload jsonb not null,
  imported_at timestamptz not null default now(),
  primary key(source_project,source_table,source_id),
  constraint bnc_legacy_raw_table_allowed check(source_table in ('event_days','rounds','prizes','round_awards','draw_events','winner_claims','winners'))
);
alter table public.bnc_legacy_raw enable row level security;
revoke all on public.bnc_legacy_raw from anon, authenticated;

-- A área histórica contém dados pessoais e informações operacionais. Não conceder acesso público.
create or replace function public.bnc_materialize_legacy_v04()
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_source constant text := 'tzyyrabjqtvjzxossyuk';
  v_events integer;v_rounds integer;v_draws integer;v_awards integer;v_claims integer;v_winners integer;
begin
  -- Nunca permitir importação silenciosa de somente parte do backup conhecido.
  select count(*) filter(where source_table='event_days'),count(*) filter(where source_table='rounds'),
  count(*) filter(where source_table='draw_events'),count(*) filter(where source_table='round_awards'),
  count(*) filter(where source_table='winner_claims'),count(*) filter(where source_table='winners')
  into v_events,v_rounds,v_draws,v_awards,v_claims,v_winners
  from public.bnc_legacy_raw where source_project=v_source;
  if (v_events,v_rounds,v_draws,v_awards,v_claims,v_winners) is distinct from (2,26,1046,53,60,47) then
    raise exception 'Contagens inesperadas: eventos %, rodadas %, sorteios %, premios %, claims %, ganhadores %',v_events,v_rounds,v_draws,v_awards,v_claims,v_winners;
  end if;
  if exists (select 1 from public.bnc_legacy_raw where source_project=v_source and source_table='event_days' and source_id='8ab60e8d-57e5-4019-9cd8-52be78a48612') then
    raise exception 'Evento de teste detectado';
  end if;
  -- Os UUIDs legados são mantidos; não sobrescrever possíveis UUIDs já utilizados por outros clientes.
  if exists(select 1 from public.bnc_events e join public.bnc_legacy_raw x on x.source_project=v_source and x.source_table='event_days' and e.id=x.source_id::uuid
    where not exists(select 1 from public.bnc_legacy_map m where m.source_project=v_source and m.source_table='event_days' and m.source_id=x.source_id and m.destination_id=e.id)) then
    raise exception 'Conflito de UUID em eventos já existentes. Exige análise manual';
  end if;

  insert into public.bnc_events(id,organization_id,slug,title,description,starts_at,venue,status,is_public,sales_enabled)
  select r.source_id::uuid,o.id,lower(replace(r.payload->>'slug','_','-')),r.payload->>'name',r.payload->>'description',
    ((r.payload->>'event_date')::date::timestamp + coalesce((r.payload->>'start_time')::time,'00:00'::time)) at time zone 'America/Sao_Paulo',
    r.payload->>'location','completed',false,false
  from public.bnc_legacy_raw r join public.bnc_organizations o
    on o.slug=case r.source_id when '2bc80233-73f1-4ad4-b789-b9249d472ea4' then 'sementinha' when 'e7cc5ba7-8500-441f-ab3b-327ec1732e9b' then 'tucxa' else '__invalid__' end
  where r.source_project=v_source and r.source_table='event_days'
  on conflict(id) do nothing;

  insert into public.bnc_rounds(id,event_id,round_number,title,status,starts_at,card_price_cents)
  select r.source_id::uuid,(r.payload->>'event_day_id')::uuid,(r.payload->>'round_number')::int,r.payload->>'title',
    'completed',null,(r.payload->>'card_price_cents')::integer
  from public.bnc_legacy_raw r join public.bnc_events e on e.id=(r.payload->>'event_day_id')::uuid
  where r.source_project=v_source and r.source_table='rounds'
  on conflict(id) do nothing;

  insert into public.bnc_draws(id,round_id,draw_sequence,number,is_voided,drawn_at)
  select r.source_id::uuid,(r.payload->>'round_id')::uuid,(r.payload->>'sequence_number')::integer,
    (r.payload->>'number')::integer,coalesce((r.payload->>'is_voided')::boolean,false),
    coalesce((r.payload->>'drawn_at')::timestamptz,now())
  from public.bnc_legacy_raw r join public.bnc_rounds x on x.id=(r.payload->>'round_id')::uuid
  where r.source_project=v_source and r.source_table='draw_events'
  on conflict(id) do nothing;

  -- Prêmios antigos registrados como snapshots nas premiações; origem integral mantida em bnc_legacy_raw.
  -- bnc_prizes não recebe aqui referências de bens de outras organizações sem vínculo confirmado.
  insert into public.bnc_awards(id,event_id,round_id,prize_id,award_type,award_number,label)
  select r.source_id::uuid,br.event_id,br.id,null,
    case when r.payload->>'award_type'='full_card' then 'full_card' else 'quina' end,
    (r.payload->>'award_index')::integer,
    coalesce(nullif(r.payload->>'title_snapshot',''),r.payload->>'award_type','Prêmio histórico')
  from public.bnc_legacy_raw r join public.bnc_rounds br on br.id=(r.payload->>'round_id')::uuid
  where r.source_project=v_source and r.source_table='round_awards'
  on conflict(id) do nothing;

  insert into public.bnc_legacy_map(source_project,source_table,source_id,destination_table,destination_id)
  select v_source,r.source_table,r.source_id,
    case r.source_table when 'event_days' then 'bnc_events' when 'rounds' then 'bnc_rounds' when 'draw_events' then 'bnc_draws' when 'round_awards' then 'bnc_awards' end,
    r.source_id::uuid
  from public.bnc_legacy_raw r
  where r.source_project=v_source and r.source_table in ('event_days','rounds','draw_events','round_awards')
  on conflict(source_project,source_table,source_id) do nothing;

  if (select count(*) from public.bnc_events where id in ('2bc80233-73f1-4ad4-b789-b9249d472ea4','e7cc5ba7-8500-441f-ab3b-327ec1732e9b'))<>2
   or (select count(*) from public.bnc_rounds r join public.bnc_events e on e.id=r.event_id where e.id in ('2bc80233-73f1-4ad4-b789-b9249d472ea4','e7cc5ba7-8500-441f-ab3b-327ec1732e9b'))<>26
   or (select count(*) from public.bnc_draws d join public.bnc_rounds r on r.id=d.round_id where r.event_id in ('2bc80233-73f1-4ad4-b789-b9249d472ea4','e7cc5ba7-8500-441f-ab3b-327ec1732e9b'))<>1046
   or (select count(*) from public.bnc_awards a where a.event_id in ('2bc80233-73f1-4ad4-b789-b9249d472ea4','e7cc5ba7-8500-441f-ab3b-327ec1732e9b'))<>53 then
    raise exception 'Conferência de destino falhou; transação será revertida';
  end if;
end $$;
revoke all on function public.bnc_materialize_legacy_v04() from public,anon,authenticated;
