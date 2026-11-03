-- BNC V07E - Publicacao via V07B, clonagem pelo mesmo formulario,
-- edicao/arquivamento auditado de prendas e itens de cardapio.
-- APLICAR PRIMEIRO NA HOMOLOGACAO. Nao ativa checkout, cartelas ou pagamentos.
BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.bnc_v07b_publish_event(uuid,boolean)') IS NULL
     OR to_regprocedure('public.bnc_v07d_clone_event(uuid,text,text,timestamptz,timestamptz)') IS NULL
     OR to_regclass('public.bnc_menu_items') IS NULL
     OR to_regclass('public.bnc_v07c_prize_audit') IS NULL
     OR to_regclass('public.bnc_operator_audit') IS NULL THEN
    RAISE EXCEPTION 'Dependencias V07B/V07C/V07D ausentes. Instalacao V07E interrompida.';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='bnc_prizes' AND column_name='archived_at')
    OR to_regprocedure('public.bnc_v07e_prize_update(uuid,text,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'V07E possivelmente aplicada. Audite; nao reaplique.';
  END IF;
END $$;

ALTER TABLE public.bnc_prizes ADD COLUMN archived_at timestamptz;
ALTER TABLE public.bnc_menu_items ADD COLUMN archived_at timestamptz;
CREATE INDEX bnc_v07e_prizes_active_title ON public.bnc_prizes(organization_id, lower(title)) WHERE archived_at IS NULL;
CREATE INDEX bnc_v07e_menu_active_title ON public.bnc_menu_items(event_id, lower(title)) WHERE archived_at IS NULL;

-- Clone apenas por gestor TUCXA; a funcao V07D copia somente modelo de
-- evento/rodadas/premiacao e nunca copia sorteios, vencedores ou reivindicacoes.
CREATE FUNCTION public.bnc_v07e_clone_from_form(
  p_source uuid, p_title text, p_slug text,
  p_starts_at timestamptz, p_ends_at timestamptz,
  p_description text DEFAULT NULL, p_venue text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_event uuid;
BEGIN
  IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF length(coalesce(p_description,''))>3000 OR length(coalesce(p_venue,''))>220 THEN
    RAISE EXCEPTION 'Descricao ou local excede o limite';
  END IF;
  v_event := public.bnc_v07d_clone_event(p_source,p_title,p_slug,p_starts_at,p_ends_at);
  UPDATE public.bnc_events SET
    description = nullif(btrim(p_description),''),
    venue = nullif(btrim(p_venue),'')
  WHERE id = v_event AND is_public=false AND status='draft';
  IF NOT FOUND THEN RAISE EXCEPTION 'Evento clonado em estado inesperado'; END IF;
  RETURN v_event;
END $$;

CREATE FUNCTION public.bnc_v07e_prize_update(p_prize uuid,p_title text,p_description text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_org uuid;
BEGIN
  IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF length(btrim(coalesce(p_title,''))) NOT BETWEEN 2 AND 160 OR length(coalesce(p_description,'')) > 2000 THEN
    RAISE EXCEPTION 'Nome ou descricao invalida'; END IF;
  SELECT p.organization_id INTO v_org
  FROM public.bnc_prizes p JOIN public.bnc_organizations o ON o.id=p.organization_id
  WHERE p.id=p_prize AND o.slug='tucxa' AND p.archived_at IS NULL
    AND p.availability_status <> 'allocated'
  FOR UPDATE OF p;
  IF NOT FOUND THEN RAISE EXCEPTION 'Prenda indisponivel para edicao'; END IF;
  IF EXISTS(SELECT 1 FROM public.bnc_awards a WHERE a.prize_id=p_prize) THEN
    RAISE EXCEPTION 'Prenda ja vinculada a premio: edicao bloqueada para preservar historico'; END IF;
  UPDATE public.bnc_prizes SET title=btrim(p_title), description=nullif(btrim(p_description),'') WHERE id=p_prize;
  INSERT INTO public.bnc_v07c_prize_audit(prize_id,actor_id,action) VALUES(p_prize,auth.uid(),'catalog_edit_07e');
  RETURN true;
END $$;

-- Exclusao logica: preserva rastreabilidade e nao apaga Storage historico.
CREATE FUNCTION public.bnc_v07e_prize_archive(p_prize uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  PERFORM 1 FROM public.bnc_prizes p JOIN public.bnc_organizations o ON o.id=p.organization_id
   WHERE p.id=p_prize AND o.slug='tucxa' AND p.archived_at IS NULL
     AND p.availability_status <> 'allocated' FOR UPDATE OF p;
  IF NOT FOUND THEN RAISE EXCEPTION 'Prenda nao disponivel para arquivamento'; END IF;
  IF EXISTS (SELECT 1 FROM public.bnc_awards a WHERE a.prize_id=p_prize) THEN
    RAISE EXCEPTION 'Prenda ligada a uma premiacao. Nao e permitido apagar'; END IF;
  UPDATE public.bnc_prizes SET archived_at=now(), availability_status='unavailable' WHERE id=p_prize;
  INSERT INTO public.bnc_v07c_prize_audit(prize_id,actor_id,action) VALUES(p_prize,auth.uid(),'catalog_archive_07e');
  RETURN true;
END $$;

-- Itens do cardapio sao por evento nesta modelagem; nao existe catalogo
-- global de alimentos. Edicao segura para evento TUCXA sem vendas habilitadas.
CREATE FUNCTION public.bnc_v07e_menu_update(p_item uuid,p_category text,p_title text,p_price_cents integer,p_active boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_event uuid;
BEGIN
  IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF length(btrim(coalesce(p_category,''))) NOT BETWEEN 2 AND 80
      OR length(btrim(coalesce(p_title,''))) NOT BETWEEN 2 AND 140
      OR p_price_cents IS NULL OR p_price_cents<0 OR p_active IS NULL THEN
      RAISE EXCEPTION 'Dados de cardapio invalidos'; END IF;
  SELECT e.id INTO v_event FROM public.bnc_menu_items m
  JOIN public.bnc_events e ON e.id=m.event_id
  JOIN public.bnc_organizations o ON o.id=e.organization_id
  WHERE m.id=p_item AND m.archived_at IS NULL AND o.slug='tucxa'
    AND e.status IN ('draft','ready') AND NOT e.sales_enabled
  FOR UPDATE OF m,e;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item ou evento nao editavel'; END IF;
  IF EXISTS (SELECT 1 FROM public.bnc_orders b WHERE b.event_id=v_event) THEN
     RAISE EXCEPTION 'Existe pedido no evento. Revisao financeira necessaria'; END IF;
  UPDATE public.bnc_menu_items SET category=btrim(p_category),title=btrim(p_title),price_cents=p_price_cents,is_active=p_active WHERE id=p_item;
  INSERT INTO public.bnc_operator_audit(event_id,actor_id,action,details)
    VALUES(v_event,auth.uid(),'menu_edit_07e',jsonb_build_object('menu_id',p_item,'active',p_active));
  RETURN true;
END $$;

CREATE FUNCTION public.bnc_v07e_menu_archive(p_item uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_event uuid;
BEGIN
  IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT e.id INTO v_event FROM public.bnc_menu_items m
  JOIN public.bnc_events e ON e.id=m.event_id
  JOIN public.bnc_organizations o ON o.id=e.organization_id
  WHERE m.id=p_item AND m.archived_at IS NULL AND o.slug='tucxa'
    AND e.status IN ('draft','ready') AND NOT e.is_public AND NOT e.sales_enabled
  FOR UPDATE OF m,e;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item vinculado a evento publicado ou nao editavel. Marque indisponivel'; END IF;
  IF EXISTS (SELECT 1 FROM public.bnc_orders b WHERE b.event_id=v_event) THEN
    RAISE EXCEPTION 'Ha pedidos associados ao evento. Exclusao bloqueada'; END IF;
  UPDATE public.bnc_menu_items SET archived_at=now(),is_active=false WHERE id=p_item;
  INSERT INTO public.bnc_operator_audit(event_id,actor_id,action,details)
    VALUES(v_event,auth.uid(),'menu_archive_07e',jsonb_build_object('menu_id',p_item));
  RETURN true;
END $$;

-- Evitar RPCs publicas por grants padrao de funcoes no PostgreSQL.
REVOKE ALL ON FUNCTION public.bnc_v07e_clone_from_form(uuid,text,text,timestamptz,timestamptz,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bnc_v07e_prize_update(uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bnc_v07e_prize_archive(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bnc_v07e_menu_update(uuid,text,text,integer,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bnc_v07e_menu_archive(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07e_clone_from_form(uuid,text,text,timestamptz,timestamptz,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07e_prize_update(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07e_prize_archive(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07e_menu_update(uuid,text,text,integer,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07e_menu_archive(uuid) TO authenticated;

COMMIT;
