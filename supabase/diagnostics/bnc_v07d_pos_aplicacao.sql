-- V07D / VALIDAÇÃO, SOMENTE LEITURA.
SELECT 'Horário final no evento' AS verificacao, EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bnc_events' AND column_name='ends_at') AS ok
UNION ALL SELECT 'Estado disponibilidade prenda', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bnc_prizes' AND column_name='availability_status')
UNION ALL SELECT 'Clonagem V07D', to_regprocedure('public.bnc_v07d_clone_event(uuid,text,text,timestamptz,timestamptz)') IS NOT NULL
UNION ALL SELECT 'Associação múltipla', to_regprocedure('public.bnc_v07d_assign_prizes(uuid,uuid,uuid[],text)') IS NOT NULL
UNION ALL SELECT 'Foto no catálogo', to_regprocedure('public.bnc_v07d_prize_set_image(uuid,text)') IS NOT NULL
UNION ALL SELECT 'Disponibilidade controlada', to_regprocedure('public.bnc_v07d_prize_set_availability(uuid,text)') IS NOT NULL
UNION ALL SELECT 'Política Storage de prendas', EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='bnc_v07d_prize_image_upload')
UNION ALL SELECT 'RLS catálogo ativo', (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='bnc_prizes');
SELECT 'Organizações' AS tabela,count(*) AS total FROM public.bnc_organizations
UNION ALL SELECT 'Eventos',count(*) FROM public.bnc_events
UNION ALL SELECT 'Rodadas',count(*) FROM public.bnc_rounds
UNION ALL SELECT 'Sorteios',count(*) FROM public.bnc_draws
UNION ALL SELECT 'Premiações',count(*) FROM public.bnc_awards
UNION ALL SELECT 'Prendas catálogo',count(*) FROM public.bnc_prizes
UNION ALL SELECT 'Histórico bruto',count(*) FROM public.bnc_legacy_raw
UNION ALL SELECT 'Mapeamentos',count(*) FROM public.bnc_legacy_map;
SELECT e.title,e.status,e.starts_at,e.ends_at,o.slug
FROM public.bnc_events e JOIN public.bnc_organizations o ON o.id=e.organization_id
WHERE o.slug IN('tucxa','sementinha') ORDER BY e.starts_at DESC NULLS LAST LIMIT 20;
SELECT p.availability_status,count(*) FROM public.bnc_prizes p
JOIN public.bnc_organizations o ON o.id=p.organization_id WHERE o.slug='tucxa'
GROUP BY p.availability_status ORDER BY p.availability_status;
