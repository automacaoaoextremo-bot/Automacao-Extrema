-- BINGO NO CONTROLE | Politicas V05, primeira aplicacao em producao.
-- ATENCAO: confirmar manualmente no Dashboard que o projeto e a Automacao Extrema:
-- Project Ref esperado: ooegejytfldzkjeexggo
-- Fonte: logica da migration 20261020120000_bnc_admin_readonly_v05.sql.
-- Esta versao NAO apaga politicas, nao altera dados, nao toca tabelas nao-BNC.
-- Abortara se encontrar uma politica SELECT/ALL inesperada ou uma V05 ja existente.
-- Aplicar uma vez, no SQL Editor do projeto correto. Uma transacao unica.
BEGIN;

DO $preflight$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bnc_organizations','bnc_members','bnc_events',
                             'bnc_rounds','bnc_draws','bnc_awards'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE EXCEPTION 'Tabela BNC obrigatoria ausente: %', t;
    END IF;
  END LOOP;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='bnc_members'
      AND policyname='bnc_members_own_read'
      AND cmd='SELECT' AND 'authenticated'=ANY(roles)
      AND qual ILIKE '%user_id%' AND qual ILIKE '%uid%'
  ) THEN
    RAISE EXCEPTION 'Politica bnc_members_own_read ausente ou inesperada';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('bnc_organizations','bnc_events','bnc_rounds','bnc_draws','bnc_awards')
      AND cmd IN ('SELECT','ALL')
  ) THEN
    RAISE EXCEPTION 'Ja existem politicas de leitura BNC: revisar antes de aplicar V05';
  END IF;
END $preflight$;

ALTER TABLE public.bnc_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bnc_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bnc_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bnc_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bnc_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bnc_awards ENABLE ROW LEVEL SECURITY;

-- Somente as seis tabelas BNC desta etapa. Nenhuma tabela de outras solucoes e afetada.
REVOKE ALL ON TABLE
  public.bnc_organizations, public.bnc_members, public.bnc_events,
  public.bnc_rounds, public.bnc_draws, public.bnc_awards
FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE
  public.bnc_organizations, public.bnc_members, public.bnc_events,
  public.bnc_rounds, public.bnc_draws, public.bnc_awards
TO authenticated;

CREATE POLICY bnc_v05_org_member_read ON public.bnc_organizations
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bnc_members m
          WHERE m.organization_id = bnc_organizations.id
            AND m.user_id = (SELECT auth.uid()))
);

CREATE POLICY bnc_v05_event_member_read ON public.bnc_events
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bnc_members m
          WHERE m.organization_id = bnc_events.organization_id
            AND m.user_id = (SELECT auth.uid()))
);

CREATE POLICY bnc_v05_round_member_read ON public.bnc_rounds
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bnc_events e
          JOIN public.bnc_members m ON m.organization_id = e.organization_id
          WHERE e.id = bnc_rounds.event_id
            AND m.user_id = (SELECT auth.uid()))
);

CREATE POLICY bnc_v05_draw_member_read ON public.bnc_draws
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bnc_rounds r
          JOIN public.bnc_events e ON e.id = r.event_id
          JOIN public.bnc_members m ON m.organization_id = e.organization_id
          WHERE r.id = bnc_draws.round_id
            AND m.user_id = (SELECT auth.uid()))
);

CREATE POLICY bnc_v05_award_member_read ON public.bnc_awards
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bnc_events e
          JOIN public.bnc_members m ON m.organization_id = e.organization_id
          WHERE e.id = bnc_awards.event_id
            AND m.user_id = (SELECT auth.uid()))
);

DO $verify$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM pg_policies
  WHERE schemaname = 'public' AND (
    (tablename='bnc_organizations' AND policyname='bnc_v05_org_member_read') OR
    (tablename='bnc_events' AND policyname='bnc_v05_event_member_read') OR
    (tablename='bnc_rounds' AND policyname='bnc_v05_round_member_read') OR
    (tablename='bnc_draws' AND policyname='bnc_v05_draw_member_read') OR
    (tablename='bnc_awards' AND policyname='bnc_v05_award_member_read')
  );
  IF n <> 5 THEN
    RAISE EXCEPTION 'Esperadas 5 politicas V05; encontradas %', n;
  END IF;
END $verify$;
COMMIT;
