-- APLICAR UMA VEZ, SOMENTE no SQL Editor do projeto de producao pretendido.
-- Esta reconciliacao NAO recria tabelas, nao apaga linhas, nao altera tabelas nao-bnc.
-- Project Ref esperado deve ser verificado na interface do Supabase.
BEGIN;
DO $$
DECLARE missing text; p record; n integer;
BEGIN
 SELECT string_agg(x.table_name, ', ' ORDER BY x.table_name) INTO missing
 FROM (VALUES ('bnc_organizations'),('bnc_members'),('bnc_events'),
 ('bnc_rounds'),('bnc_prizes'),('bnc_awards'),('bnc_offers'),
 ('bnc_offer_rounds'),('bnc_orders'),('bnc_payments'),
 ('bnc_cards'),('bnc_draws'),('bnc_winner_claims'),('bnc_legacy_map')) AS x(table_name)
 WHERE to_regclass('public.' || x.table_name) IS NULL;
 IF missing IS NOT NULL THEN
  RAISE EXCEPTION 'Tabelas BNC obrigatorias ausentes: %', missing;
 END IF;
 SELECT permissive, roles, cmd, qual, with_check INTO p FROM pg_policies
 WHERE schemaname='public' AND tablename='bnc_members'
 AND policyname='bnc_members_own_read';
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Politica bnc_members_own_read ausente; nao criar sem auditoria.';
 END IF;
 IF p.permissive <> 'PERMISSIVE' OR p.cmd <> 'SELECT'
 OR p.roles <> ARRAY['authenticated']::name[]
 OR regexp_replace(p.qual, '[[:space:]]+', '', 'g') <> '(user_id=auth.uid())'
 OR p.with_check IS NOT NULL THEN
  RAISE EXCEPTION 'Politica de membros divergente; revisar antes de continuar.';
 END IF;
 SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
 WHERE ns.nspname='public' AND c.relkind IN ('r','p')
 AND c.relname LIKE 'bnc\_%' ESCAPE '\' AND NOT c.relrowsecurity;
 IF n > 0 THEN
  RAISE EXCEPTION '% tabela(s) bnc_ sem RLS ativo. Interrompido.', n;
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS bnc_events_org_idx ON public.bnc_events(organization_id);
CREATE INDEX IF NOT EXISTS bnc_rounds_event_idx ON public.bnc_rounds(event_id);
CREATE INDEX IF NOT EXISTS bnc_orders_event_idx ON public.bnc_orders(event_id);
CREATE INDEX IF NOT EXISTS bnc_cards_round_idx ON public.bnc_cards(round_id);
CREATE INDEX IF NOT EXISTS bnc_draws_round_idx ON public.bnc_draws(round_id);
COMMIT;
