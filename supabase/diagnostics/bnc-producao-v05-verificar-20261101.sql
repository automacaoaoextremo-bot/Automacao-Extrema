-- Somente leitura. Executar depois da aplicacao da V05 no projeto de producao correto.
WITH target_policies AS (
  SELECT tablename, policyname, cmd, roles, qual FROM pg_policies
  WHERE schemaname='public' AND policyname IN (
    'bnc_v05_org_member_read', 'bnc_v05_event_member_read',
    'bnc_v05_round_member_read', 'bnc_v05_draw_member_read',
    'bnc_v05_award_member_read')
), rls AS (
  SELECT count(*) AS all_count, count(*) FILTER (WHERE c.relrowsecurity) AS enabled
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname LIKE 'bnc\_%' ESCAPE '\'
)
SELECT
  (SELECT all_count FROM rls) AS tabelas_bnc,
  (SELECT enabled FROM rls) AS com_rls,
  (SELECT count(*) FROM target_policies) AS politicas_v05,
  (SELECT count(*) FROM target_policies
    WHERE cmd='SELECT' AND 'authenticated'=ANY(roles)
      AND qual ILIKE '%uid%') AS politicas_com_filtro_usuario,
  has_table_privilege('anon', 'public.bnc_events', 'SELECT') AS anon_pode_selecionar_eventos,
  has_table_privilege('authenticated', 'public.bnc_events', 'SELECT') AS authenticated_pode_selecionar_eventos,
  has_table_privilege('authenticated', 'public.bnc_events', 'INSERT') AS authenticated_pode_inserir_eventos,
  (SELECT count(*) FROM public.bnc_organizations) AS organizacoes,
  (SELECT count(*) FROM public.bnc_events) AS eventos,
  (SELECT count(*) FROM public.bnc_legacy_raw) AS historico_bruto;

-- Conferencia detalhada, sem dados pessoais:
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname='public' AND policyname LIKE 'bnc_v05_%'
ORDER BY tablename;
