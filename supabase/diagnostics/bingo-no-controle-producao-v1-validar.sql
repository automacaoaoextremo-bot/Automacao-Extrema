-- Somente leitura. Executar no projeto de producao da Automacao Extrema.
SELECT table_name, (SELECT c.relrowsecurity FROM pg_class c
 JOIN pg_namespace ns ON ns.oid=c.relnamespace
 WHERE ns.nspname='public' AND c.relname=t.table_name LIMIT 1) AS rls_ativo
FROM information_schema.tables t
WHERE table_schema='public' AND table_type='BASE TABLE'
  AND table_name LIKE 'bnc\_%' ESCAPE '\'
ORDER BY table_name;

SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname='public' AND tablename='bnc_members'
ORDER BY policyname;

SELECT indexname FROM pg_indexes
WHERE schemaname='public' AND indexname IN
('bnc_events_org_idx','bnc_rounds_event_idx','bnc_orders_event_idx',
'bnc_cards_round_idx','bnc_draws_round_idx') ORDER BY indexname;

SELECT 'organizations' AS item,count(*) AS n FROM public.bnc_organizations
UNION ALL SELECT 'events',count(*) FROM public.bnc_events
UNION ALL SELECT 'rounds',count(*) FROM public.bnc_rounds
UNION ALL SELECT 'draws',count(*) FROM public.bnc_draws
UNION ALL SELECT 'awards',count(*) FROM public.bnc_awards
UNION ALL SELECT 'legacy_raw',count(*) FROM public.bnc_legacy_raw
UNION ALL SELECT 'legacy_map',count(*) FROM public.bnc_legacy_map;

SELECT n.nspname AS esquema, p.proname AS funcao
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='bnc_materialize_legacy_v04';
