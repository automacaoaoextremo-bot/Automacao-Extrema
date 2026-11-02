-- SOMENTE LEITURA. Executar depois da migration V07C. Exportar resultado para homologacao.
SELECT 'bnc_menu_items.image_url' AS recurso, EXISTS (
 SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bnc_menu_items' AND column_name='image_url'
) AS ok
UNION ALL SELECT 'combos',to_regclass('public.bnc_v07c_combos') IS NOT NULL
UNION ALL SELECT 'lotes de cartelas',to_regclass('public.bnc_v07c_card_batches') IS NOT NULL
UNION ALL SELECT 'auditoria do catalogo',to_regclass('public.bnc_v07c_prize_audit') IS NOT NULL
UNION ALL SELECT 'funcao publica',to_regprocedure('public.bnc_v07c_public_events()') IS NOT NULL
UNION ALL SELECT 'foto do cardapio',to_regprocedure('public.bnc_v07c_menu_set_image(uuid,text)') IS NOT NULL
UNION ALL SELECT 'cadastro de combos',to_regprocedure('public.bnc_v07c_combo_create(uuid,text,text,integer,integer,integer,text,text)') IS NOT NULL;

SELECT t.relname AS tabela, t.relrowsecurity AS rls_ativo
FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public'
 AND t.relname IN ('bnc_v07c_combos','bnc_v07c_card_batches','bnc_v07c_prize_audit') ORDER BY t.relname;

SELECT id,name,public,file_size_limit,allowed_mime_types FROM storage.buckets WHERE id='bnc-public-images';
SELECT schemaname,tablename,policyname,cmd,roles FROM pg_policies
WHERE policyname LIKE 'bnc_v07c_%' ORDER BY schemaname,tablename,policyname;

SELECT has_function_privilege('anon','public.bnc_v07c_public_events()','EXECUTE') AS anon_pode_ver_eventos_publicos,
 has_function_privilege('anon','public.bnc_v07c_combo_create(uuid,text,text,integer,integer,integer,text,text)','EXECUTE') AS anon_pode_criar_combo,
 has_function_privilege('authenticated','public.bnc_v07c_combo_create(uuid,text,text,integer,integer,integer,text,text)','EXECUTE') AS autenticado_pode_chamar_rpc_com_verificacao;

SELECT 'bnc_events' AS tabela,count(*) AS total FROM public.bnc_events
UNION ALL SELECT 'bnc_rounds',count(*) FROM public.bnc_rounds
UNION ALL SELECT 'bnc_draws',count(*) FROM public.bnc_draws
UNION ALL SELECT 'bnc_awards',count(*) FROM public.bnc_awards;
