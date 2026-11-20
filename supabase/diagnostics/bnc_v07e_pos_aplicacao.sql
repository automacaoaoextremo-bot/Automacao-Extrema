-- SOMENTE LEITURA: conferir V07E sem alterar dados.
SELECT
 to_regprocedure('public.bnc_v07e_clone_from_form(uuid,text,text,timestamptz,timestamptz,text,text)') IS NOT NULL AS clone_v07e,
 to_regprocedure('public.bnc_v07e_prize_update(uuid,text,text)') IS NOT NULL AS prize_edit_v07e,
 to_regprocedure('public.bnc_v07e_prize_archive(uuid)') IS NOT NULL AS prize_archive_v07e,
 to_regprocedure('public.bnc_v07e_menu_update(uuid,text,text,integer,boolean)') IS NOT NULL AS menu_edit_v07e,
 to_regprocedure('public.bnc_v07e_menu_archive(uuid)') IS NOT NULL AS menu_archive_v07e,
 (SELECT count(*) FROM public.bnc_events) AS eventos,
 (SELECT count(*) FROM public.bnc_rounds) AS rodadas,
 (SELECT count(*) FROM public.bnc_draws) AS sorteios,
 (SELECT count(*) FROM public.bnc_awards) AS premiacoes;
SELECT table_name,column_name FROM information_schema.columns
 WHERE table_schema='public' AND table_name IN ('bnc_prizes','bnc_menu_items') AND column_name='archived_at';
SELECT p.proname,has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'bnc_v07e_%';
SELECT e.slug,e.status,e.is_public,e.sales_enabled,
 (SELECT count(*) FROM public.bnc_menu_items m WHERE m.event_id=e.id AND m.archived_at IS NULL) AS itens_visiveis,
 (SELECT count(*) FROM public.bnc_v07c_combos c WHERE c.event_id=e.id AND c.status='draft') AS ofertas_rascunho
 FROM public.bnc_events e JOIN public.bnc_organizations o ON o.id=e.organization_id
 WHERE o.slug='tucxa' AND e.slug='bingo-tucxa-2026-12-12';
