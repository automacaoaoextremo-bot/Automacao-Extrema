-- SOMENTE LEITURA: rodar em homologacao antes da V07E e novamente em producao.
SELECT
 to_regprocedure('public.bnc_v07b_publish_event(uuid,boolean)') IS NOT NULL AS publicacao_v07b,
 to_regprocedure('public.bnc_v07d_clone_event(uuid,text,text,timestamptz,timestamptz)') IS NOT NULL AS clonagem_v07d,
 to_regclass('public.bnc_menu_items') IS NOT NULL AS cardapio_v07b,
 to_regclass('public.bnc_v07c_prize_audit') IS NOT NULL AS auditoria_prendas_v07c,
 to_regprocedure('public.bnc_v07e_menu_update(uuid,text,text,integer,boolean)') IS NULL AS v07e_ainda_ausente,
 (SELECT count(*) FROM public.bnc_events) AS eventos,
 (SELECT count(*) FROM public.bnc_rounds) AS rodadas,
 (SELECT count(*) FROM public.bnc_draws) AS sorteios,
 (SELECT count(*) FROM public.bnc_awards) AS premiacoes,
 (SELECT count(*) FROM public.bnc_menu_items) AS cardapio,
 (SELECT count(*) FROM public.bnc_v07c_combos WHERE status='draft') AS ofertas_rascunho;
SELECT e.slug,e.status,e.is_public,e.sales_enabled,
 (SELECT count(*) FROM public.bnc_menu_items m WHERE m.event_id=e.id) AS itens,
 (SELECT count(*) FROM public.bnc_v07c_combos c WHERE c.event_id=e.id AND c.status='draft') AS ofertas
FROM public.bnc_events e JOIN public.bnc_organizations o ON o.id=e.organization_id
WHERE o.slug='tucxa' AND e.slug='bingo-tucxa-2026-12-12';
SELECT id,name,public,file_size_limit,allowed_mime_types FROM storage.buckets WHERE id='bnc-public-images';
SELECT policyname,cmd,roles,qual,with_check FROM pg_policies
WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'bnc_%photo_upload';
