-- V07D / PRÉ-INSTALAÇÃO, SOMENTE LEITURA.
-- Execute no SQL Editor da HOMOLOGACAO antes da migration.
SELECT 'V07B clonagem' AS verificacao, to_regprocedure('public.bnc_v07b_clone_event(uuid,text,text,timestamptz)') IS NOT NULL AS ok
UNION ALL SELECT 'V07C catálogo', to_regprocedure('public.bnc_v07c_catalog_prize(text,text,text)') IS NOT NULL
UNION ALL SELECT 'V07C bucket de imagens', EXISTS(SELECT 1 FROM storage.buckets WHERE id='bnc-public-images' AND public)
UNION ALL SELECT 'V07D não instalada', NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bnc_events' AND column_name='ends_at')
UNION ALL SELECT 'V07D disponibilidade ausente', NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bnc_prizes' AND column_name='availability_status');
SELECT 'Organizações' AS tabela,count(*) AS total FROM public.bnc_organizations
UNION ALL SELECT 'Eventos',count(*) FROM public.bnc_events
UNION ALL SELECT 'Rodadas',count(*) FROM public.bnc_rounds
UNION ALL SELECT 'Sorteios',count(*) FROM public.bnc_draws
UNION ALL SELECT 'Premiações',count(*) FROM public.bnc_awards
UNION ALL SELECT 'Prendas catálogo',count(*) FROM public.bnc_prizes
UNION ALL SELECT 'Histórico bruto',count(*) FROM public.bnc_legacy_raw
UNION ALL SELECT 'Mapeamentos',count(*) FROM public.bnc_legacy_map;
SELECT 'historico TUCXA/Sementinha' AS descricao, o.slug, count(DISTINCT e.id) eventos,
 count(DISTINCT r.id) rodadas, count(DISTINCT d.id) sorteios
FROM public.bnc_organizations o LEFT JOIN public.bnc_events e ON e.organization_id=o.id
LEFT JOIN public.bnc_rounds r ON r.event_id=e.id LEFT JOIN public.bnc_draws d ON d.round_id=r.id
GROUP BY o.slug ORDER BY o.slug;
