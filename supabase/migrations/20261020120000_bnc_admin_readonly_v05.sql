-- BNC V05: acesso autenticado e SOMENTE LEITURA ao histórico da própria organização.
-- Aplicar exclusivamente no Supabase de HOMOLOGACAO zbqcngvohidmwqkfwwvf.
-- Não concede permissões de escrita, não modifica dados migrados.
BEGIN;

-- Garantir RLS mesmo se outro script a tiver desligado.
ALTER TABLE public.bnc_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bnc_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bnc_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bnc_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bnc_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bnc_awards ENABLE ROW LEVEL SECURITY;

-- Não conceder acesso anon às entidades privadas.
REVOKE ALL ON public.bnc_members, public.bnc_events, public.bnc_rounds, public.bnc_draws, public.bnc_awards FROM anon;
GRANT SELECT ON public.bnc_organizations, public.bnc_members, public.bnc_events, public.bnc_rounds, public.bnc_draws, public.bnc_awards TO authenticated;

-- Consulta da organização apenas para usuários membros (não revela organizações de terceiros).
DROP POLICY IF EXISTS bnc_v05_org_member_read ON public.bnc_organizations;
CREATE POLICY bnc_v05_org_member_read ON public.bnc_organizations
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bnc_members m
          WHERE m.organization_id = bnc_organizations.id AND m.user_id = (SELECT auth.uid()))
);

-- Membership own_read já existe na migration V1 e permite evitar recursão na política acima.
-- Se a instalação original diferir, a consulta de membros deverá ser conferida antes de ativar V05.
DROP POLICY IF EXISTS bnc_v05_event_member_read ON public.bnc_events;
CREATE POLICY bnc_v05_event_member_read ON public.bnc_events
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bnc_members m
          WHERE m.organization_id = bnc_events.organization_id AND m.user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS bnc_v05_round_member_read ON public.bnc_rounds;
CREATE POLICY bnc_v05_round_member_read ON public.bnc_rounds
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bnc_events e JOIN public.bnc_members m ON m.organization_id = e.organization_id
          WHERE e.id = bnc_rounds.event_id AND m.user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS bnc_v05_draw_member_read ON public.bnc_draws;
CREATE POLICY bnc_v05_draw_member_read ON public.bnc_draws
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bnc_rounds r JOIN public.bnc_events e ON e.id=r.event_id
          JOIN public.bnc_members m ON m.organization_id=e.organization_id
          WHERE r.id=bnc_draws.round_id AND m.user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS bnc_v05_award_member_read ON public.bnc_awards;
CREATE POLICY bnc_v05_award_member_read ON public.bnc_awards
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bnc_events e JOIN public.bnc_members m ON m.organization_id=e.organization_id
          WHERE e.id=bnc_awards.event_id AND m.user_id = (SELECT auth.uid()))
);

-- Não liberar bnc_legacy_raw, bnc_legacy_map, ganhadores, pagamentos nem pedidos.
COMMIT;
