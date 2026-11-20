-- Execute antes e depois da V07B no projeto correto. Somente leitura.
SELECT 'tabelas' AS tipo, COUNT(*)::text AS resultado FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'bnc_%'
UNION ALL SELECT 'eventos',COUNT(*)::text FROM public.bnc_events
UNION ALL SELECT 'rodadas',COUNT(*)::text FROM public.bnc_rounds
UNION ALL SELECT 'sorteios',COUNT(*)::text FROM public.bnc_draws
UNION ALL SELECT 'premiacoes',COUNT(*)::text FROM public.bnc_awards
UNION ALL SELECT 'v07a_instalada',(COUNT(*)=4)::text FROM pg_policies WHERE schemaname='public' AND policyname IN ('bnc_v07a_event_insert','bnc_v07a_event_update','bnc_v07a_round_insert','bnc_v07a_round_update');

SELECT n.nspname,p.proname,p.prosecdef,has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname LIKE 'bnc_v07b_%' ORDER BY p.proname;

SELECT schemaname,tablename,policyname,cmd,roles,qual FROM pg_policies
WHERE schemaname='public' AND policyname LIKE 'bnc_v07b_%' ORDER BY tablename,policyname;

SELECT o.slug,COUNT(DISTINCT e.id) eventos,COUNT(DISTINCT r.id) rodadas,COUNT(DISTINCT d.id) sorteios
FROM public.bnc_organizations o LEFT JOIN public.bnc_events e ON e.organization_id=o.id
LEFT JOIN public.bnc_rounds r ON r.event_id=e.id LEFT JOIN public.bnc_draws d ON d.round_id=r.id
GROUP BY o.slug ORDER BY o.slug;

-- Confira duplicidades antes da criacao do indice unico parcial:
SELECT round_id,number,COUNT(*) duplicados FROM public.bnc_draws WHERE NOT is_voided
GROUP BY round_id,number HAVING COUNT(*)>1;
