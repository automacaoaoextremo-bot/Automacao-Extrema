-- Bingo no Controle v07B - aplicar SOMENTE APOS V07A em HOMOLOGACAO.
-- Migration incremental, limitada a tabelas bnc_*; nao modifica outros sistemas.
-- Leia o README. Nao executar diretamente em producao sem homologacao de RLS e concorrencia.
BEGIN;

DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bnc_events' AND policyname='bnc_v07a_event_insert') THEN
  RAISE EXCEPTION 'V07A nao encontrada. Instale e homologue antes da V07B.';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_proc WHERE proname='bnc_v07b_clone_event') THEN
  RAISE EXCEPTION 'V07B ja instalada. Nao reaplique sem auditoria.';
 END IF;
END $$;

CREATE TABLE public.bnc_menu_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES public.bnc_events(id) ON DELETE CASCADE,
 category text NOT NULL CHECK(length(trim(category)) BETWEEN 2 AND 80),
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 2 AND 140),
 description text,
 price_cents integer NOT NULL CHECK(price_cents >= 0),
 is_active boolean NOT NULL DEFAULT true,
 sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bnc_menu_items_event_idx ON public.bnc_menu_items(event_id,category,sort_order);
ALTER TABLE public.bnc_menu_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bnc_menu_items FROM anon, authenticated;
GRANT SELECT ON public.bnc_menu_items TO authenticated;

CREATE TABLE public.bnc_operator_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 event_id uuid NOT NULL REFERENCES public.bnc_events(id),
 round_id uuid REFERENCES public.bnc_rounds(id),
 actor_id uuid NOT NULL,
 action text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bnc_operator_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bnc_operator_audit FROM anon,authenticated;

ALTER TABLE public.bnc_draws
 ADD COLUMN voided_at timestamptz,
 ADD COLUMN voided_by uuid,
 ADD COLUMN void_reason text;
-- Banco legado pode conter repeticoes; so bloqueia duplicados NOVOS sem invalidar historico.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.bnc_draws WHERE NOT is_voided GROUP BY round_id,number HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Sorteios validos duplicados no destino. Revisao manual obrigatoria.';
 END IF;
END $$;
CREATE UNIQUE INDEX bnc_draws_unique_valid_v07b
 ON public.bnc_draws(round_id,number) WHERE NOT is_voided;

ALTER TABLE public.bnc_winner_claims
 ADD COLUMN award_id uuid REFERENCES public.bnc_awards(id),
 ADD COLUMN claimant_name text,
 ADD COLUMN card_serial text,
 ADD COLUMN reviewed_by uuid,
 ADD COLUMN reviewed_at timestamptz,
 ADD COLUMN review_reason text;
CREATE UNIQUE INDEX bnc_claims_one_accepted_award_v07b
 ON public.bnc_winner_claims(award_id) WHERE award_id IS NOT NULL AND status='accepted';

-- helper SECURITY DEFINER: autoriza explicitamente pelo auth.uid(), nao apenas pela interface.
CREATE FUNCTION public.bnc_v07b_tucxa_role(allowed text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT auth.uid() IS NOT NULL AND EXISTS (
 SELECT 1 FROM public.bnc_members m JOIN public.bnc_organizations o ON o.id=m.organization_id
 WHERE o.slug='tucxa' AND m.user_id=auth.uid() AND m.role=ANY(allowed)
) $$;
REVOKE ALL ON FUNCTION public.bnc_v07b_tucxa_role(text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bnc_v07b_tucxa_role(text[]) TO authenticated;

-- Sementinha e grupo do TUCXA: leitura de CONFIGURACOES historicas (nao de PII)
-- apenas para owner/manager/operator do TUCXA.
CREATE POLICY bnc_v07b_sementinha_org_read ON public.bnc_organizations FOR SELECT TO authenticated
 USING (slug='sementinha' AND public.bnc_v07b_tucxa_role(ARRAY['owner','manager','operator']));
CREATE POLICY bnc_v07b_sementinha_events_read ON public.bnc_events FOR SELECT TO authenticated
 USING (organization_id IN (SELECT id FROM public.bnc_organizations WHERE slug='sementinha')
 AND public.bnc_v07b_tucxa_role(ARRAY['owner','manager','operator']));
CREATE POLICY bnc_v07b_sementinha_rounds_read ON public.bnc_rounds FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.bnc_events e JOIN public.bnc_organizations o ON o.id=e.organization_id
 WHERE e.id=bnc_rounds.event_id AND o.slug='sementinha')
 AND public.bnc_v07b_tucxa_role(ARRAY['owner','manager','operator']));
CREATE POLICY bnc_v07b_sementinha_draws_read ON public.bnc_draws FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.bnc_rounds r JOIN public.bnc_events e ON e.id=r.event_id
 JOIN public.bnc_organizations o ON o.id=e.organization_id WHERE r.id=bnc_draws.round_id AND o.slug='sementinha')
 AND public.bnc_v07b_tucxa_role(ARRAY['owner','manager','operator']));
CREATE POLICY bnc_v07b_sementinha_awards_read ON public.bnc_awards FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.bnc_events e JOIN public.bnc_organizations o ON o.id=e.organization_id
 WHERE e.id=bnc_awards.event_id AND o.slug='sementinha')
 AND public.bnc_v07b_tucxa_role(ARRAY['owner','manager','operator']));
CREATE POLICY bnc_v07b_tucxa_menu_read ON public.bnc_menu_items FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.bnc_events e JOIN public.bnc_members m ON m.organization_id=e.organization_id
 WHERE e.id=bnc_menu_items.event_id AND m.user_id=auth.uid()));
CREATE POLICY bnc_v07b_tucxa_claims_read ON public.bnc_winner_claims FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.bnc_rounds r JOIN public.bnc_events e ON e.id=r.event_id
 JOIN public.bnc_members m ON m.organization_id=e.organization_id
 WHERE r.id=bnc_winner_claims.round_id AND m.user_id=auth.uid() AND m.role IN ('owner','manager','operator')));
GRANT SELECT ON public.bnc_winner_claims TO authenticated;

-- Clonagem atomica: todas as rodadas e os titulos das premiacoes; NUNCA sorteios ou ganhadores.
CREATE FUNCTION public.bnc_v07b_clone_event(p_source uuid,p_title text,p_slug text,p_starts_at timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE source_event public.bnc_events%ROWTYPE; dest_org uuid; new_event uuid; old_round record; new_round uuid;
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF length(trim(coalesce(p_title,''))) NOT BETWEEN 3 AND 160 OR p_slug !~ '^[a-z0-9-]{3,80}$' OR p_starts_at IS NULL THEN
  RAISE EXCEPTION 'Titulo, slug ou data invalidos'; END IF;
 SELECT * INTO source_event FROM public.bnc_events WHERE id=p_source;
 IF NOT FOUND OR source_event.status<>'completed' OR NOT EXISTS (
  SELECT 1 FROM public.bnc_organizations o WHERE o.id=source_event.organization_id AND o.slug IN ('tucxa','sementinha')) THEN
  RAISE EXCEPTION 'Origem precisa ser evento historico concluido do TUCXA/Sementinha'; END IF;
 SELECT id INTO STRICT dest_org FROM public.bnc_organizations WHERE slug='tucxa';
 INSERT INTO public.bnc_events(organization_id,slug,title,description,venue,starts_at,status,is_public,sales_enabled)
 VALUES(dest_org,p_slug,trim(p_title),source_event.description,source_event.venue,p_starts_at,'draft',false,false) RETURNING id INTO new_event;
 FOR old_round IN SELECT * FROM public.bnc_rounds WHERE event_id=p_source ORDER BY round_number LOOP
  INSERT INTO public.bnc_rounds(event_id,round_number,title,card_price_cents,status)
  VALUES(new_event,old_round.round_number,old_round.title,old_round.card_price_cents,'planned') RETURNING id INTO new_round;
  INSERT INTO public.bnc_awards(event_id,round_id,award_type,award_number,label,prize_id)
  SELECT new_event,new_round,a.award_type,a.award_number,a.label,NULL
  FROM public.bnc_awards a WHERE a.round_id=old_round.id;
 END LOOP;
 INSERT INTO public.bnc_operator_audit(event_id,actor_id,action,details)
 VALUES(new_event,auth.uid(),'event_clone',jsonb_build_object('source_event_id',p_source));
 RETURN new_event;
END $$;

-- Edicao de rodada copiada: permitida mesmo com premiações-modelo, mas nunca com sorteios.
CREATE FUNCTION public.bnc_v07b_update_planned_round(p_round uuid,p_title text,p_price integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE r record;
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF length(trim(coalesce(p_title,''))) NOT BETWEEN 2 AND 160 OR (p_price IS NOT NULL AND p_price<0) THEN RAISE EXCEPTION 'Dados invalidos'; END IF;
 SELECT r0.id,r0.event_id INTO r FROM public.bnc_rounds r0 JOIN public.bnc_events e ON e.id=r0.event_id
 JOIN public.bnc_organizations o ON o.id=e.organization_id WHERE r0.id=p_round AND r0.status='planned'
 AND o.slug='tucxa' AND e.status IN ('draft','ready') AND NOT EXISTS(SELECT 1 FROM public.bnc_draws d WHERE d.round_id=r0.id) FOR UPDATE OF r0;
 IF NOT FOUND THEN RAISE EXCEPTION 'Rodada concluida ou nao editavel'; END IF;
 UPDATE public.bnc_rounds SET title=trim(p_title),card_price_cents=p_price WHERE id=p_round;
 INSERT INTO public.bnc_operator_audit(event_id,round_id,actor_id,action) VALUES(r.event_id,p_round,auth.uid(),'round_template_edit');
 RETURN true;
END $$;

CREATE FUNCTION public.bnc_v07b_publish_event(p_event uuid,p_publish boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE ev public.bnc_events%ROWTYPE;
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 SELECT e.* INTO ev FROM public.bnc_events e JOIN public.bnc_organizations o ON o.id=e.organization_id
 WHERE e.id=p_event AND o.slug='tucxa' FOR UPDATE OF e;
 IF NOT FOUND OR ev.status NOT IN ('draft','ready') OR ev.sales_enabled THEN RAISE EXCEPTION 'Evento nao elegivel'; END IF;
 IF p_publish AND NOT EXISTS (SELECT 1 FROM public.bnc_rounds r WHERE r.event_id=p_event) THEN RAISE EXCEPTION 'Inclua ao menos uma rodada'; END IF;
 UPDATE public.bnc_events SET is_public=p_publish,status=CASE WHEN p_publish THEN 'ready' ELSE status END WHERE id=p_event;
 INSERT INTO public.bnc_operator_audit(event_id,actor_id,action) VALUES(p_event,auth.uid(),CASE WHEN p_publish THEN 'publish_event' ELSE 'unpublish_event' END);
 RETURN true;
END $$;

-- Premios: catalogo e associacao sempre restritos a uma rodada de evento novo TUCXA.
CREATE FUNCTION public.bnc_v07b_add_prize(p_event uuid,p_round uuid,p_title text,p_description text DEFAULT NULL,p_image_url text DEFAULT NULL,p_award_type text DEFAULT 'other')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE org_id uuid; prize uuid; next_number integer; ev_status text;
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF length(trim(coalesce(p_title,''))) NOT BETWEEN 2 AND 160 OR p_award_type NOT IN ('quina','full_card','other') THEN RAISE EXCEPTION 'Premio invalido'; END IF;
 IF p_image_url IS NOT NULL AND (length(p_image_url)>500 OR p_image_url !~ '^https://') THEN RAISE EXCEPTION 'Imagem deve ser HTTPS'; END IF;
 SELECT e.organization_id,e.status INTO org_id,ev_status FROM public.bnc_events e JOIN public.bnc_organizations o ON o.id=e.organization_id
 WHERE e.id=p_event AND o.slug='tucxa';
 IF NOT FOUND OR ev_status NOT IN ('draft','ready') THEN RAISE EXCEPTION 'Evento nao editavel'; END IF;
 PERFORM 1 FROM public.bnc_rounds WHERE id=p_round AND event_id=p_event AND status='planned' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Rodada invalida'; END IF;
 INSERT INTO public.bnc_prizes(organization_id,title,description,image_url,is_confirmed)
 VALUES(org_id,trim(p_title),nullif(trim(coalesce(p_description,'')),''),p_image_url,true) RETURNING id INTO prize;
 SELECT coalesce(max(award_number),0)+1 INTO next_number FROM public.bnc_awards WHERE round_id=p_round AND award_type=p_award_type;
 INSERT INTO public.bnc_awards(event_id,round_id,prize_id,award_type,award_number,label)
 VALUES(p_event,p_round,prize,p_award_type,next_number,trim(p_title));
 INSERT INTO public.bnc_operator_audit(event_id,round_id,actor_id,action,details)
 VALUES(p_event,p_round,auth.uid(),'prize_add',jsonb_build_object('prize_id',prize));
 RETURN prize;
END $$;

CREATE FUNCTION public.bnc_v07b_add_menu_item(p_event uuid,p_category text,p_title text,p_price_cents integer,p_description text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE new_id uuid;
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF length(trim(coalesce(p_category,''))) NOT BETWEEN 2 AND 80 OR length(trim(coalesce(p_title,''))) NOT BETWEEN 2 AND 140 OR p_price_cents IS NULL OR p_price_cents<0 THEN
  RAISE EXCEPTION 'Item de cardapio invalido'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.bnc_events e JOIN public.bnc_organizations o ON o.id=e.organization_id
 WHERE e.id=p_event AND o.slug='tucxa' AND e.status IN ('draft','ready')) THEN RAISE EXCEPTION 'Evento nao editavel'; END IF;
 INSERT INTO public.bnc_menu_items(event_id,category,title,price_cents,description)
 VALUES(p_event,trim(p_category),trim(p_title),p_price_cents,nullif(trim(coalesce(p_description,'')),'')) RETURNING id INTO new_id;
 INSERT INTO public.bnc_operator_audit(event_id,actor_id,action,details)
 VALUES(p_event,auth.uid(),'menu_add',jsonb_build_object('item_id',new_id));
 RETURN new_id;
END $$;

-- Operacao transacional: bloqueio de rodada, conferencia de permissao e trilha de auditoria.
CREATE FUNCTION public.bnc_v07b_round_state(p_round uuid,p_action text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE r record; ev record; next_status text;
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager','operator']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 SELECT * INTO r FROM public.bnc_rounds WHERE id=p_round FOR UPDATE;
 SELECT e.* INTO ev FROM public.bnc_events e JOIN public.bnc_organizations o ON o.id=e.organization_id
 WHERE e.id=r.event_id AND o.slug='tucxa' FOR UPDATE OF e;
 IF NOT FOUND OR NOT ev.is_public OR ev.status NOT IN ('ready','active') THEN RAISE EXCEPTION 'Evento nao publicado ou inadequado'; END IF;
 IF p_action='open' AND r.status='planned' THEN
  IF EXISTS (SELECT 1 FROM public.bnc_rounds WHERE event_id=ev.id AND id<>p_round AND status='open') THEN RAISE EXCEPTION 'Outra rodada esta aberta'; END IF;
  next_status:='open';
  UPDATE public.bnc_events SET status='active' WHERE id=ev.id;
 ELSIF p_action='close' AND r.status='open' THEN next_status:='closed';
 ELSE RAISE EXCEPTION 'Transicao de rodada nao permitida'; END IF;
 UPDATE public.bnc_rounds SET status=next_status WHERE id=p_round;
 INSERT INTO public.bnc_operator_audit(event_id,round_id,actor_id,action) VALUES(ev.id,p_round,auth.uid(),'round_'||p_action);
 RETURN next_status;
END $$;

CREATE FUNCTION public.bnc_v07b_draw(p_round uuid,p_number integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE r record; next_seq integer;
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager','operator']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF p_number IS NULL OR p_number NOT BETWEEN 1 AND 75 THEN RAISE EXCEPTION 'Numero deve estar entre 1 e 75'; END IF;
 SELECT r0.* INTO r FROM public.bnc_rounds r0 JOIN public.bnc_events e ON e.id=r0.event_id JOIN public.bnc_organizations o ON o.id=e.organization_id
 WHERE r0.id=p_round AND o.slug='tucxa' AND e.is_public AND e.status='active' FOR UPDATE OF r0;
 IF NOT FOUND OR r.status<>'open' THEN RAISE EXCEPTION 'Rodada nao esta aberta'; END IF;
 IF EXISTS (SELECT 1 FROM public.bnc_draws WHERE round_id=p_round AND number=p_number AND NOT is_voided) THEN RAISE EXCEPTION 'Numero ja sorteado'; END IF;
 SELECT coalesce(max(draw_sequence),0)+1 INTO next_seq FROM public.bnc_draws WHERE round_id=p_round;
 INSERT INTO public.bnc_draws(round_id,draw_sequence,number) VALUES(p_round,next_seq,p_number);
 INSERT INTO public.bnc_operator_audit(event_id,round_id,actor_id,action,details)
 VALUES(r.event_id,p_round,auth.uid(),'draw',jsonb_build_object('number',p_number,'sequence',next_seq));
 RETURN next_seq;
END $$;

CREATE FUNCTION public.bnc_v07b_undo_draw(p_round uuid,p_reason text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE r record; last_draw record;
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager','operator']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF length(trim(coalesce(p_reason,'')))<4 THEN RAISE EXCEPTION 'Informe motivo'; END IF;
 SELECT r0.* INTO r FROM public.bnc_rounds r0 JOIN public.bnc_events e ON e.id=r0.event_id JOIN public.bnc_organizations o ON o.id=e.organization_id
 WHERE r0.id=p_round AND o.slug='tucxa' AND e.status='active' FOR UPDATE OF r0;
 IF NOT FOUND OR r.status<>'open' THEN RAISE EXCEPTION 'Rodada nao esta aberta'; END IF;
 SELECT id,number INTO last_draw FROM public.bnc_draws WHERE round_id=p_round AND NOT is_voided ORDER BY draw_sequence DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sem pedras validas'; END IF;
 UPDATE public.bnc_draws SET is_voided=true,voided_at=now(),voided_by=auth.uid(),void_reason=trim(p_reason) WHERE id=last_draw.id;
 INSERT INTO public.bnc_operator_audit(event_id,round_id,actor_id,action,details)
 VALUES(r.event_id,p_round,auth.uid(),'undo_draw',jsonb_build_object('number',last_draw.number,'reason',p_reason));
 RETURN last_draw.number;
END $$;

CREATE FUNCTION public.bnc_v07b_create_claim(p_round uuid,p_award uuid,p_claimant text,p_serial text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE event_id uuid; claim_id uuid;
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager','operator']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF length(trim(coalesce(p_claimant,''))) NOT BETWEEN 2 AND 150 OR length(trim(coalesce(p_serial,''))) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Identificacao da cartela e participante obrigatorias'; END IF;
 SELECT e.id INTO event_id FROM public.bnc_rounds r JOIN public.bnc_events e ON e.id=r.event_id JOIN public.bnc_organizations o ON o.id=e.organization_id
 WHERE r.id=p_round AND o.slug='tucxa' AND e.status='active' AND r.status IN ('open','closed');
 IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.bnc_awards a JOIN public.bnc_prizes p ON p.id=a.prize_id AND p.is_confirmed WHERE a.id=p_award AND a.round_id=p_round) THEN RAISE EXCEPTION 'Premiacao/rodada invalida ou prenda ainda nao confirmada'; END IF;
 INSERT INTO public.bnc_winner_claims(round_id,award_id,claimant_name,card_serial,status)
 VALUES(p_round,p_award,trim(p_claimant),trim(p_serial),'pending') RETURNING id INTO claim_id;
 INSERT INTO public.bnc_operator_audit(event_id,round_id,actor_id,action,details)
 VALUES(event_id,p_round,auth.uid(),'claim_received',jsonb_build_object('claim_id',claim_id));
 RETURN claim_id;
END $$;

CREATE FUNCTION public.bnc_v07b_review_claim(p_claim uuid,p_accept boolean,p_reason text,p_card_checked boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE c record; event_id uuid;
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF length(trim(coalesce(p_reason,'')))<5 THEN RAISE EXCEPTION 'Informe justificativa'; END IF;
 IF p_accept IS NULL THEN RAISE EXCEPTION 'Decisao invalida'; END IF;
 IF p_accept AND p_card_checked IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Conferencia manual da cartela obrigatoria'; END IF;
 SELECT c0.* INTO c FROM public.bnc_winner_claims c0 WHERE c0.id=p_claim FOR UPDATE;
 IF NOT FOUND OR c.status<>'pending' OR c.award_id IS NULL THEN RAISE EXCEPTION 'Reivindicacao indisponivel'; END IF;
 SELECT e.id INTO event_id FROM public.bnc_rounds r JOIN public.bnc_events e ON e.id=r.event_id JOIN public.bnc_organizations o ON o.id=e.organization_id
 WHERE r.id=c.round_id AND o.slug='tucxa' AND e.status='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'Evento nao esta ativo'; END IF;
 UPDATE public.bnc_winner_claims SET status=CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END,
 reviewed_by=auth.uid(),reviewed_at=now(),review_reason=trim(p_reason) WHERE id=p_claim;
 INSERT INTO public.bnc_operator_audit(event_id,round_id,actor_id,action,details)
 VALUES(event_id,c.round_id,auth.uid(),CASE WHEN p_accept THEN 'claim_accept' ELSE 'claim_reject' END,
 jsonb_build_object('claim_id',p_claim,'manual_card_checked',p_card_checked));
 RETURN true;
END $$;

-- API publica expõe SOMENTE campos explicitamente selecionados, sem auth.users, membros, doadores ou ganhadores.
CREATE FUNCTION public.bnc_v07b_public_events()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',e.id,'slug',e.slug,'title',e.title,'description',e.description,
   'starts_at',e.starts_at,'venue',e.venue,'status',e.status,'group',o.slug,
   'rounds', (SELECT coalesce(jsonb_agg(jsonb_build_object('number',r.round_number,'title',r.title) ORDER BY r.round_number),'[]'::jsonb)
              FROM public.bnc_rounds r WHERE r.event_id=e.id),
   'prizes', (SELECT coalesce(jsonb_agg(jsonb_build_object('round_number',r.round_number,'label',a.label,'image_url',p.image_url) ORDER BY r.round_number,a.award_number),'[]'::jsonb)
              FROM public.bnc_awards a JOIN public.bnc_rounds r ON r.id=a.round_id
              JOIN public.bnc_prizes p ON p.id=a.prize_id AND p.is_confirmed WHERE a.event_id=e.id),
   'menu', (SELECT coalesce(jsonb_agg(jsonb_build_object('category',m.category,'title',m.title,'description',m.description,'price_cents',m.price_cents) ORDER BY m.category,m.sort_order,m.title),'[]'::jsonb)
             FROM public.bnc_menu_items m WHERE m.event_id=e.id AND m.is_active)
 ) ORDER BY e.starts_at NULLS LAST),'[]'::jsonb)
 FROM (SELECT * FROM public.bnc_events WHERE is_public AND status IN ('ready','active') ORDER BY starts_at NULLS LAST LIMIT 30) e
 JOIN public.bnc_organizations o ON o.id=e.organization_id WHERE o.slug IN ('tucxa','sementinha');
$$;

DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname LIKE 'bnc_v07b_%' LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.sig);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.bnc_v07b_tucxa_role(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07b_clone_event(uuid,text,text,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07b_publish_event(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07b_update_planned_round(uuid,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07b_add_prize(uuid,uuid,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07b_add_menu_item(uuid,text,text,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07b_round_state(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07b_draw(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07b_undo_draw(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07b_create_claim(uuid,uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07b_review_claim(uuid,boolean,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07b_public_events() TO anon,authenticated;
COMMIT;
