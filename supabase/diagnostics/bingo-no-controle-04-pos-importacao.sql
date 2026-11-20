-- SOMENTE no banco de homologação de destino; sem alterações.
with expected(kind,total) as (values ('events',2),('rounds',26),('draws',1046),('awards',53),('claims_raw',60),('winners_raw',47)),
actual(kind,total) as (
 select 'events',count(*) from public.bnc_events where id in ('2bc80233-73f1-4ad4-b789-b9249d472ea4','e7cc5ba7-8500-441f-ab3b-327ec1732e9b')
 union all select 'rounds',count(*) from public.bnc_rounds where event_id in ('2bc80233-73f1-4ad4-b789-b9249d472ea4','e7cc5ba7-8500-441f-ab3b-327ec1732e9b')
 union all select 'draws',count(*) from public.bnc_draws d join public.bnc_rounds r on r.id=d.round_id where r.event_id in ('2bc80233-73f1-4ad4-b789-b9249d472ea4','e7cc5ba7-8500-441f-ab3b-327ec1732e9b')
 union all select 'awards',count(*) from public.bnc_awards a where a.event_id in ('2bc80233-73f1-4ad4-b789-b9249d472ea4','e7cc5ba7-8500-441f-ab3b-327ec1732e9b')
 union all select 'claims_raw',count(*) from public.bnc_legacy_raw where source_table='winner_claims' and source_project='tzyyrabjqtvjzxossyuk'
 union all select 'winners_raw',count(*) from public.bnc_legacy_raw where source_table='winners' and source_project='tzyyrabjqtvjzxossyuk'
)
select expected.kind,expected.total as esperado,actual.total as encontrado,(expected.total=actual.total) as ok from expected join actual using(kind) order by kind;
select o.slug as organizacao,e.title,e.is_public,e.sales_enabled,
(select count(*) from public.bnc_rounds r where r.event_id=e.id) as rodadas
from public.bnc_events e join public.bnc_organizations o on o.id=e.organization_id
where e.id in ('2bc80233-73f1-4ad4-b789-b9249d472ea4','e7cc5ba7-8500-441f-ab3b-327ec1732e9b') order by o.slug;
select exists (select 1 from public.bnc_events where id='8ab60e8d-57e5-4019-9cd8-52be78a48612') as evento_teste_migrado_indevidamente;
