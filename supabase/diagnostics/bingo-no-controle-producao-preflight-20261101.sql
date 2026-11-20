-- BINGO NO CONTROLE: auditoria SOMENTE LEITURA no Supabase compartilhado de producao.
-- Conferir Project Ref na interface antes de executar (ooegejytfldzkjeexggo).
-- Uma unica linha para exportar CSV; nenhuma informacao pessoal e retornada.
WITH bnc_tables AS (
 SELECT c.relname AS name, c.relrowsecurity AS rls_enabled
 FROM pg_class c
 JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
   AND c.relname LIKE 'bnc\_%' ESCAPE '\'
), indexes AS (
 SELECT count(*) AS found FROM pg_indexes
 WHERE schemaname = 'public' AND indexname IN (
 'bnc_events_org_idx', 'bnc_rounds_event_idx', 'bnc_orders_event_idx',
 'bnc_cards_round_idx', 'bnc_draws_round_idx')
), v05_policies AS (
 SELECT count(*) AS found FROM pg_policies
 WHERE schemaname = 'public' AND (
    (tablename='bnc_organizations' AND policyname='bnc_v05_org_member_read') OR
    (tablename='bnc_events' AND policyname='bnc_v05_event_member_read') OR
    (tablename='bnc_rounds' AND policyname='bnc_v05_round_member_read') OR
    (tablename='bnc_draws' AND policyname='bnc_v05_draw_member_read') OR
    (tablename='bnc_awards' AND policyname='bnc_v05_award_member_read'))
)
SELECT
  (SELECT count(*) FROM bnc_tables) AS tabelas_bnc,
  (SELECT count(*) FROM bnc_tables WHERE rls_enabled) AS tabelas_com_rls,
  (SELECT found FROM indexes) AS indices_v1_de_5,
  (SELECT found FROM v05_policies) AS politicas_v05_de_5,
  EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='bnc_members' AND policyname='bnc_members_own_read'
    AND cmd='SELECT' AND 'authenticated'=ANY(roles)
  ) AS membros_politica_propria,
  to_regprocedure('public.bnc_materialize_legacy_v04()') IS NOT NULL AS funcao_v04_existe,
  (SELECT count(*) FROM public.bnc_organizations) AS organizacoes,
  (SELECT count(*) FROM public.bnc_events) AS eventos,
  (SELECT count(*) FROM public.bnc_rounds) AS rodadas,
  (SELECT count(*) FROM public.bnc_draws) AS sorteios,
  (SELECT count(*) FROM public.bnc_awards) AS premiacoes,
  (SELECT count(*) FROM public.bnc_legacy_raw) AS historico_bruto,
  (SELECT count(*) FROM public.bnc_legacy_map) AS mapeamentos;
