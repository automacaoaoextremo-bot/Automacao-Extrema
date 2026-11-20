-- SOMENTE LEITURA. Executar no projeto desejado e conferir o Project Ref no Dashboard.
SELECT tablename, policyname, cmd, roles, permissive, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename IN ('bnc_events','bnc_rounds','bnc_prizes')
ORDER BY tablename, policyname;

SELECT table_name, privilege_type, grantee
FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name IN ('bnc_events','bnc_rounds','bnc_prizes')
 AND grantee IN ('anon','authenticated')
ORDER BY table_name, grantee, privilege_type;

SELECT table_name, column_name, privilege_type, grantee
FROM information_schema.column_privileges
WHERE table_schema='public' AND table_name IN ('bnc_events','bnc_rounds')
 AND grantee='authenticated' AND privilege_type IN ('INSERT','UPDATE')
ORDER BY table_name, privilege_type, column_name;

SELECT o.slug, COUNT(DISTINCT e.id) AS eventos, COUNT(DISTINCT r.id) AS rodadas,
 COUNT(DISTINCT d.id) AS sorteios, COUNT(DISTINCT a.id) AS premiacoes
FROM public.bnc_organizations o
LEFT JOIN public.bnc_events e ON e.organization_id=o.id
LEFT JOIN public.bnc_rounds r ON r.event_id=e.id
LEFT JOIN public.bnc_draws d ON d.round_id=r.id
LEFT JOIN public.bnc_awards a ON a.round_id=r.id
GROUP BY o.id,o.slug ORDER BY o.slug;
