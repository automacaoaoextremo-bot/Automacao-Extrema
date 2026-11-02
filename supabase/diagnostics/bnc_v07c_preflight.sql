-- SOMENTE LEITURA. Executar em HOMOLOGACAO antes da migration V07C.
SELECT 'V07A / politica de escrita' AS verificacao, EXISTS(
 SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bnc_events' AND policyname='bnc_v07a_event_insert'
) AS ok
UNION ALL SELECT 'V07B / funcao de operacoes', to_regprocedure('public.bnc_v07b_clone_event(uuid,text,text,timestamptz)') IS NOT NULL
UNION ALL SELECT 'V07B / cardapio', to_regclass('public.bnc_menu_items') IS NOT NULL
UNION ALL SELECT 'V07C / nao aplicada', to_regclass('public.bnc_v07c_combos') IS NULL;

SELECT 'bnc_organizations' AS tabela, count(*) AS total FROM public.bnc_organizations
UNION ALL SELECT 'bnc_events',count(*) FROM public.bnc_events
UNION ALL SELECT 'bnc_rounds',count(*) FROM public.bnc_rounds
UNION ALL SELECT 'bnc_draws',count(*) FROM public.bnc_draws
UNION ALL SELECT 'bnc_awards',count(*) FROM public.bnc_awards
UNION ALL SELECT 'bnc_legacy_raw',count(*) FROM public.bnc_legacy_raw
UNION ALL SELECT 'bnc_legacy_map',count(*) FROM public.bnc_legacy_map;

-- Verificar a existencia de politicas de armazenamento que poderiam afetar a configuracao.
SELECT policyname,cmd,roles FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
 AND policyname LIKE 'bnc_%' ORDER BY policyname;
