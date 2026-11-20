-- Bingo no Controle V07A: escrita limitada de eventos e rodadas + leitura do catalogo de premios.
-- Executar UMA VEZ em HOMOLOGACAO. Aplicar em producao apenas apos testes funcionais e RLS.
-- Nao modifica estruturas de outras solucoes. Nao altera historico, pedidos, sorteios ou financeiro.
-- Preferir uma migration nova, sem reescrever as migrations V1/V04/V05 ja aplicadas.
BEGIN;

DO $$
DECLARE item record;
BEGIN
  -- Politicas preexistentes de escrita precisam de revisao manual: politicas RLS permissivas sao OR.
  FOR item IN
    SELECT tablename, policyname, cmd FROM pg_policies
     WHERE schemaname = 'public' AND tablename IN ('bnc_events','bnc_rounds')
       AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
       AND policyname NOT IN ('bnc_v07a_event_insert','bnc_v07a_event_update','bnc_v07a_round_insert','bnc_v07a_round_update')
  LOOP
    RAISE EXCEPTION 'Politica de escrita preexistente: %.% (%). Revisao obrigatoria.', item.tablename, item.policyname, item.cmd;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND (
      (tablename='bnc_events' AND policyname IN ('bnc_v07a_event_insert','bnc_v07a_event_update')) OR
      (tablename='bnc_rounds' AND policyname IN ('bnc_v07a_round_insert','bnc_v07a_round_update')) OR
      (tablename='bnc_prizes' AND policyname='bnc_v07a_prize_member_read')
    )
  ) THEN
    RAISE EXCEPTION 'Politica V07A ja presente. Nao reaplicar sem auditar seu conteudo.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bnc_events' AND policyname='bnc_v05_event_member_read')
     OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bnc_rounds' AND policyname='bnc_v05_round_member_read') THEN
    RAISE EXCEPTION 'Politicas SELECT V05 nao encontradas. Aplicar e validar V05 antes de V07A.';
  END IF;
END $$;

ALTER TABLE public.bnc_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bnc_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bnc_prizes ENABLE ROW LEVEL SECURITY;

-- As escritas via navegador ficam restritas a campos explicitamente permitidos.
-- Nao conceder: organization_id no UPDATE, sales_enabled, is_public, operacoes de pagamento.
REVOKE INSERT, UPDATE, DELETE ON public.bnc_events, public.bnc_rounds FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.bnc_prizes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.bnc_events, public.bnc_rounds, public.bnc_prizes TO authenticated;
REVOKE SELECT ON public.bnc_prizes FROM anon;
GRANT INSERT (organization_id, slug, title, description, starts_at, venue) ON public.bnc_events TO authenticated;
GRANT UPDATE (slug, title, description, starts_at, venue, status) ON public.bnc_events TO authenticated;
GRANT INSERT (event_id, round_number, title, card_price_cents) ON public.bnc_rounds TO authenticated;
GRANT UPDATE (title, card_price_cents) ON public.bnc_rounds TO authenticated;

CREATE POLICY bnc_v07a_event_insert ON public.bnc_events
FOR INSERT TO authenticated
WITH CHECK (
  status='draft' AND is_public=false AND sales_enabled=false
  AND EXISTS (
    SELECT 1 FROM public.bnc_members m
    WHERE m.organization_id=bnc_events.organization_id
      AND m.user_id=(SELECT auth.uid())
      AND m.role IN ('owner','manager')
  )
);

CREATE POLICY bnc_v07a_event_update ON public.bnc_events
FOR UPDATE TO authenticated
USING (
  status IN ('draft','ready') AND is_public=false AND sales_enabled=false
  AND EXISTS (
    SELECT 1 FROM public.bnc_members m
    WHERE m.organization_id=bnc_events.organization_id
      AND m.user_id=(SELECT auth.uid()) AND m.role IN ('owner','manager')
  )
)
WITH CHECK (
  status IN ('draft','ready') AND is_public=false AND sales_enabled=false
  AND EXISTS (
    SELECT 1 FROM public.bnc_members m
    WHERE m.organization_id=bnc_events.organization_id
      AND m.user_id=(SELECT auth.uid()) AND m.role IN ('owner','manager')
  )
);

CREATE POLICY bnc_v07a_round_insert ON public.bnc_rounds
FOR INSERT TO authenticated
WITH CHECK (
  status='planned'
  AND EXISTS (
    SELECT 1 FROM public.bnc_events e
    JOIN public.bnc_members m ON m.organization_id=e.organization_id
    WHERE e.id=bnc_rounds.event_id AND e.status IN ('draft','ready')
      AND m.user_id=(SELECT auth.uid()) AND m.role IN ('owner','manager')
  )
);

CREATE POLICY bnc_v07a_round_update ON public.bnc_rounds
FOR UPDATE TO authenticated
USING (
  status='planned'
  AND NOT EXISTS (SELECT 1 FROM public.bnc_draws d WHERE d.round_id=bnc_rounds.id)
  AND NOT EXISTS (SELECT 1 FROM public.bnc_awards a WHERE a.round_id=bnc_rounds.id)
  AND EXISTS (
    SELECT 1 FROM public.bnc_events e
    JOIN public.bnc_members m ON m.organization_id=e.organization_id
    WHERE e.id=bnc_rounds.event_id AND e.status IN ('draft','ready')
      AND m.user_id=(SELECT auth.uid()) AND m.role IN ('owner','manager')
  )
)
WITH CHECK (
  status='planned'
  AND EXISTS (
    SELECT 1 FROM public.bnc_events e
    JOIN public.bnc_members m ON m.organization_id=e.organization_id
    WHERE e.id=bnc_rounds.event_id AND e.status IN ('draft','ready')
      AND m.user_id=(SELECT auth.uid()) AND m.role IN ('owner','manager')
  )
);

CREATE POLICY bnc_v07a_prize_member_read ON public.bnc_prizes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bnc_members m
    WHERE m.organization_id=bnc_prizes.organization_id AND m.user_id=(SELECT auth.uid())
  )
);

COMMIT;
