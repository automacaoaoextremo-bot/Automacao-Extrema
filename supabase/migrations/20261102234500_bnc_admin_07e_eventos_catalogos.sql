-- BNC V07E - MIGRATION RECONCILIADA (SEGURA PARA REEXECUCAO CONTROLADA)
-- Origem: 20261102234500_bnc_admin_07e_eventos_catalogos.sql
-- Base: arquivo completo fornecido pelo usuario. SEM DROP, TRUNCATE ou DELETE.
-- APLICAR PRIMEIRO SOMENTE EM HOMOLOGACAO. Nao habilita checkout/pagamentos.
-- Objetos existentes sao PRESERVADOS. Funcoes faltantes sao criadas.
-- Uma funcao preexistente NAO e substituida: revisar definicao se divergente.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $bnc_preflight$
DECLARE v_tabela text;
BEGIN
  IF to_regprocedure('public.bnc_v07b_publish_event(uuid,boolean)') IS NULL
     OR to_regprocedure('public.bnc_v07d_clone_event(uuid,text,text,timestamptz,timestamptz)') IS NULL
     OR to_regprocedure('public.bnc_v07b_tucxa_role(text[])') IS NULL
     OR to_regclass('public.bnc_prizes') IS NULL
     OR to_regclass('public.bnc_menu_items') IS NULL
     OR to_regclass('public.bnc_v07c_prize_audit') IS NULL
     OR to_regclass('public.bnc_operator_audit') IS NULL
     OR to_regclass('public.bnc_events') IS NULL
     OR to_regclass('public.bnc_orders') IS NULL
     OR to_regclass('public.bnc_awards') IS NULL THEN
    RAISE EXCEPTION 'Dependencias BNC V07B/V07C/V07D ausentes. Interrompido sem criar objetos.';
  END IF;
  FOR v_tabela IN SELECT unnest(ARRAY['bnc_prizes','bnc_menu_items']) LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=v_tabela
        AND column_name='archived_at' AND data_type <> 'timestamp with time zone'
    ) THEN
      RAISE EXCEPTION 'Coluna public.%.archived_at existente com tipo inesperado.',v_tabela;
    END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='bnc_v07e_prizes_active_title'
      AND (tablename <> 'bnc_prizes' OR indexdef NOT ILIKE '%archived_at IS NULL%')
  ) OR EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='bnc_v07e_menu_active_title'
      AND (tablename <> 'bnc_menu_items' OR indexdef NOT ILIKE '%archived_at IS NULL%')
  ) THEN
    RAISE EXCEPTION 'Indice V07E existente com definicao inesperada. Audite antes de prosseguir.';
  END IF;
END
$bnc_preflight$;

ALTER TABLE public.bnc_prizes ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.bnc_menu_items ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS bnc_v07e_prizes_active_title
  ON public.bnc_prizes(organization_id, lower(title)) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS bnc_v07e_menu_active_title
  ON public.bnc_menu_items(event_id, lower(title)) WHERE archived_at IS NULL;

-- Cria bnc_v07e_clone_from_form somente se nao existir. Nao altera corpo de funcao existente.
DO $bnc_install$
BEGIN
  IF to_regprocedure('public.bnc_v07e_clone_from_form(uuid,text,text,timestamptz,timestamptz,text,text)') IS NULL THEN
    EXECUTE $bnc_function_ddl$
CREATE FUNCTION public.bnc_v07e_clone_from_form(
  p_source uuid, p_title text, p_slug text,
  p_starts_at timestamptz, p_ends_at timestamptz,
  p_description text DEFAULT NULL, p_venue text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $bnc_fn_body$
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
END $bnc_fn_body$;
    $bnc_function_ddl$;
    RAISE NOTICE 'Funcao criada: bnc_v07e_clone_from_form';
  ELSE
    RAISE NOTICE 'Funcao existente preservada: bnc_v07e_clone_from_form';
  END IF;
END
$bnc_install$;

-- Cria bnc_v07e_prize_update somente se nao existir. Nao altera corpo de funcao existente.
DO $bnc_install$
BEGIN
  IF to_regprocedure('public.bnc_v07e_prize_update(uuid,text,text)') IS NULL THEN
    EXECUTE $bnc_function_ddl$
CREATE FUNCTION public.bnc_v07e_prize_update(p_prize uuid,p_title text,p_description text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $bnc_fn_body$
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
END $bnc_fn_body$;
    $bnc_function_ddl$;
    RAISE NOTICE 'Funcao criada: bnc_v07e_prize_update';
  ELSE
    RAISE NOTICE 'Funcao existente preservada: bnc_v07e_prize_update';
  END IF;
END
$bnc_install$;

-- Cria bnc_v07e_prize_archive somente se nao existir. Nao altera corpo de funcao existente.
DO $bnc_install$
BEGIN
  IF to_regprocedure('public.bnc_v07e_prize_archive(uuid)') IS NULL THEN
    EXECUTE $bnc_function_ddl$
CREATE FUNCTION public.bnc_v07e_prize_archive(p_prize uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $bnc_fn_body$
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
END $bnc_fn_body$;
    $bnc_function_ddl$;
    RAISE NOTICE 'Funcao criada: bnc_v07e_prize_archive';
  ELSE
    RAISE NOTICE 'Funcao existente preservada: bnc_v07e_prize_archive';
  END IF;
END
$bnc_install$;

-- Cria bnc_v07e_menu_update somente se nao existir. Nao altera corpo de funcao existente.
DO $bnc_install$
BEGIN
  IF to_regprocedure('public.bnc_v07e_menu_update(uuid,text,text,integer,boolean)') IS NULL THEN
    EXECUTE $bnc_function_ddl$
CREATE FUNCTION public.bnc_v07e_menu_update(p_item uuid,p_category text,p_title text,p_price_cents integer,p_active boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $bnc_fn_body$
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
END $bnc_fn_body$;
    $bnc_function_ddl$;
    RAISE NOTICE 'Funcao criada: bnc_v07e_menu_update';
  ELSE
    RAISE NOTICE 'Funcao existente preservada: bnc_v07e_menu_update';
  END IF;
END
$bnc_install$;

-- Cria bnc_v07e_menu_archive somente se nao existir. Nao altera corpo de funcao existente.
DO $bnc_install$
BEGIN
  IF to_regprocedure('public.bnc_v07e_menu_archive(uuid)') IS NULL THEN
    EXECUTE $bnc_function_ddl$
CREATE FUNCTION public.bnc_v07e_menu_archive(p_item uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $bnc_fn_body$
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
END $bnc_fn_body$;
    $bnc_function_ddl$;
    RAISE NOTICE 'Funcao criada: bnc_v07e_menu_archive';
  ELSE
    RAISE NOTICE 'Funcao existente preservada: bnc_v07e_menu_archive';
  END IF;
END
$bnc_install$;

-- Validar propriedades das funcoes presentes, sem alterar definicoes anteriores.
DO $bnc_security$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid,p.proname,p.prosecdef,p.proconfig
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN
      ('bnc_v07e_clone_from_form','bnc_v07e_prize_update','bnc_v07e_prize_archive',
       'bnc_v07e_menu_update','bnc_v07e_menu_archive')
  LOOP
    IF NOT r.prosecdef OR NOT EXISTS (
      SELECT 1 FROM unnest(coalesce(r.proconfig,ARRAY[]::text[])) c
      WHERE c LIKE 'search_path=%'
    ) THEN
      RAISE EXCEPTION 'Funcao V07E % existente com configuracao de seguranca inesperada',r.proname;
    END IF;
  END LOOP;
END
$bnc_security$;

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

-- Confirmacao final: as cinco funcoes devem existir e anon nao pode executa-las.
DO $bnc_final$
DECLARE v_sig text;
BEGIN
  FOREACH v_sig IN ARRAY ARRAY[
    'public.bnc_v07e_clone_from_form(uuid,text,text,timestamptz,timestamptz,text,text)',
    'public.bnc_v07e_prize_update(uuid,text,text)',
    'public.bnc_v07e_prize_archive(uuid)',
    'public.bnc_v07e_menu_update(uuid,text,text,integer,boolean)',
    'public.bnc_v07e_menu_archive(uuid)'
  ] LOOP
    IF to_regprocedure(v_sig) IS NULL THEN
      RAISE EXCEPTION 'Funcao nao instalada: %',v_sig;
    END IF;
    IF has_function_privilege('anon',to_regprocedure(v_sig),'EXECUTE') THEN
      RAISE EXCEPTION 'Permissao EXECUTE anon indevida na funcao %',v_sig;
    END IF;
    IF NOT has_function_privilege('authenticated',to_regprocedure(v_sig),'EXECUTE') THEN
      RAISE EXCEPTION 'Permissao EXECUTE authenticated ausente na funcao %',v_sig;
    END IF;
  END LOOP;
END
$bnc_final$;

COMMIT;
