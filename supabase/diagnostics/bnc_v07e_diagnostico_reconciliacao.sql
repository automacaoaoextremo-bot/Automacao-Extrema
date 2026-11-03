-- BNC V07E - SOMENTE LEITURA, para HOMOLOGACAO (ou producao, se pertinente)
SELECT
  current_database() AS database_name,
  to_regprocedure('public.bnc_v07b_publish_event(uuid,boolean)') IS NOT NULL AS depende_v07b,
  to_regprocedure('public.bnc_v07d_clone_event(uuid,text,text,timestamptz,timestamptz)') IS NOT NULL AS depende_v07d,
  to_regclass('public.bnc_v07c_prize_audit') IS NOT NULL AS depende_v07c;

WITH assinaturas(nome,assinatura) AS (
  VALUES
    ('clone_from_form','public.bnc_v07e_clone_from_form(uuid,text,text,timestamptz,timestamptz,text,text)'),
    ('prize_update','public.bnc_v07e_prize_update(uuid,text,text)'),
    ('prize_archive','public.bnc_v07e_prize_archive(uuid)'),
    ('menu_update','public.bnc_v07e_menu_update(uuid,text,text,integer,boolean)'),
    ('menu_archive','public.bnc_v07e_menu_archive(uuid)')
)
SELECT nome,
  to_regprocedure(assinatura) IS NOT NULL AS existe,
  CASE WHEN to_regprocedure(assinatura) IS NULL THEN null
    ELSE has_function_privilege('anon',to_regprocedure(assinatura),'EXECUTE') END AS anon_execute,
  CASE WHEN to_regprocedure(assinatura) IS NULL THEN null
    ELSE has_function_privilege('authenticated',to_regprocedure(assinatura),'EXECUTE') END AS authenticated_execute,
  p.prosecdef AS security_definer,
  p.proconfig AS funcao_configuracao
FROM assinaturas a
LEFT JOIN pg_proc p ON p.oid = to_regprocedure(a.assinatura)
ORDER BY nome;

SELECT table_name,column_name,data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('bnc_prizes','bnc_menu_items')
 AND column_name='archived_at' ORDER BY table_name;

SELECT indexname, tablename,indexdef
FROM pg_indexes
WHERE schemaname='public' AND indexname IN
 ('bnc_v07e_prizes_active_title','bnc_v07e_menu_active_title')
ORDER BY indexname;

SELECT
 (SELECT count(*) FROM public.bnc_events) AS eventos,
 (SELECT count(*) FROM public.bnc_rounds) AS rodadas,
 (SELECT count(*) FROM public.bnc_draws) AS sorteios,
 (SELECT count(*) FROM public.bnc_awards) AS premiacoes;
