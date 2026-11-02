-- Bingo no Controle / TUCXA v07C. Aplicar SOMENTE apos a V07B homologada.
-- Migrations isoladas: nao alteram tabelas de outras solucoes da Automacao Extrema.
-- Nao cria meios de pagamento, vendas de cartelas ou autorizacao para usar cartelas fisicas.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('public.bnc_v07b_tucxa_role(text[])') IS NULL
    OR to_regprocedure('public.bnc_v07b_public_events()') IS NULL
    OR to_regclass('public.bnc_menu_items') IS NULL THEN
    RAISE EXCEPTION 'A migration BNC V07B ainda nao foi instalada.';
 END IF;
 IF to_regclass('public.bnc_v07c_combos') IS NOT NULL
    OR to_regclass('public.bnc_v07c_card_batches') IS NOT NULL
    OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bnc_menu_items' AND column_name='image_url') THEN
    RAISE EXCEPTION 'Parte da V07C ja existe. Auditar antes de reaplicar.';
 END IF;
END $$;

ALTER TABLE public.bnc_menu_items ADD COLUMN image_url text;
ALTER TABLE public.bnc_menu_items ADD CONSTRAINT bnc_menu_image_url_v07c_ck CHECK (
  image_url IS NULL OR (length(image_url) <= 800 AND image_url ~ '^https://[^[:space:]]+$')
);

CREATE TABLE public.bnc_v07c_combos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES public.bnc_events(id),
 title text NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 140),
 description text,
 kind text NOT NULL CHECK(kind IN ('cards','food','mixed','credit')),
 price_cents integer NOT NULL CHECK(price_cents >= 0),
 card_quantity integer NOT NULL DEFAULT 0 CHECK(card_quantity BETWEEN 0 AND 100),
 food_credit_cents integer NOT NULL DEFAULT 0 CHECK(food_credit_cents BETWEEN 0 AND 10000000),
 credit_scope text NOT NULL DEFAULT 'food' CHECK(credit_scope IN ('food','cards','either')),
 status text NOT NULL DEFAULT 'draft' CHECK(status='draft'),
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((kind='cards' AND card_quantity>0 AND food_credit_cents=0)
     OR (kind='food' AND card_quantity=0 AND food_credit_cents>0)
     OR (kind='mixed' AND card_quantity>0 AND food_credit_cents>0)
     OR (kind='credit' AND card_quantity=0 AND food_credit_cents>0))
);
CREATE INDEX bnc_v07c_combos_event_idx ON public.bnc_v07c_combos(event_id);
ALTER TABLE public.bnc_v07c_combos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bnc_v07c_combos FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.bnc_v07c_combos TO authenticated;
CREATE POLICY bnc_v07c_combos_member_read ON public.bnc_v07c_combos FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.bnc_events e JOIN public.bnc_members m ON m.organization_id=e.organization_id
               WHERE e.id=event_id AND m.user_id=auth.uid()));

CREATE TABLE public.bnc_v07c_card_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES public.bnc_events(id),
 code text NOT NULL CHECK (length(btrim(code)) BETWEEN 2 AND 60),
 color_name text NOT NULL CHECK (length(btrim(color_name)) BETWEEN 2 AND 50),
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 100000),
 allowed_round_id uuid,
 status text NOT NULL DEFAULT 'draft' CHECK(status='draft'),
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(event_id,code),
 FOREIGN KEY (allowed_round_id,event_id) REFERENCES public.bnc_rounds(id,event_id)
);
CREATE INDEX bnc_v07c_card_batches_event_idx ON public.bnc_v07c_card_batches(event_id);
ALTER TABLE public.bnc_v07c_card_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bnc_v07c_card_batches FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.bnc_v07c_card_batches TO authenticated;
CREATE POLICY bnc_v07c_card_batches_member_read ON public.bnc_v07c_card_batches FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.bnc_events e JOIN public.bnc_members m ON m.organization_id=e.organization_id
               WHERE e.id=event_id AND m.user_id=auth.uid()));

-- Fotos de cardapio: bucket publico apenas para fotos, upload autenticado e limitado ao evento TUCXA.
-- Nao use este bucket para documentos, comprovantes ou fotos de participantes.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('bnc-public-images','bnc-public-images',true,3145728,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='bnc-public-images' AND public=true
 AND file_size_limit=3145728 AND allowed_mime_types @> ARRAY['image/jpeg','image/png','image/webp']::text[]) THEN
  RAISE EXCEPTION 'Bucket bnc-public-images ja existe, mas sua configuracao difere da V07C.';
 END IF;
END $$;
CREATE POLICY bnc_v07c_menu_photo_upload ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (
  bucket_id='bnc-public-images'
  AND (storage.foldername(name))[1]='tucxa'
  AND (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  AND (storage.foldername(name))[3]='menu'
  AND EXISTS (
    SELECT 1 FROM public.bnc_events e JOIN public.bnc_organizations o ON o.id=e.organization_id
    WHERE e.id::text=(storage.foldername(name))[2] AND o.slug='tucxa'
      AND e.status IN ('draft','ready') AND public.bnc_v07b_tucxa_role(ARRAY['owner','manager'])
  )
 );

CREATE FUNCTION public.bnc_v07c_menu_set_image(p_item uuid,p_image_url text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE ev record; prefix text;
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 SELECT e.id,e.status,o.slug INTO ev FROM public.bnc_menu_items m
 JOIN public.bnc_events e ON e.id=m.event_id
 JOIN public.bnc_organizations o ON o.id=e.organization_id WHERE m.id=p_item;
 IF NOT FOUND OR ev.slug<>'tucxa' OR ev.status NOT IN ('draft','ready') THEN RAISE EXCEPTION 'Item nao editavel'; END IF;
 prefix := '/storage/v1/object/public/bnc-public-images/tucxa/'||ev.id||'/menu/';
 IF p_image_url IS NOT NULL AND (length(p_image_url)>800 OR p_image_url !~ '^https://[a-z0-9-]+\.supabase\.co/' OR position(prefix in p_image_url)=0) THEN
   RAISE EXCEPTION 'URL da foto deve pertencer ao bucket e evento autorizados'; END IF;
 UPDATE public.bnc_menu_items SET image_url=p_image_url WHERE id=p_item;
 INSERT INTO public.bnc_operator_audit(event_id,actor_id,action,details)
 VALUES (ev.id,auth.uid(),'menu_image_set',jsonb_build_object('menu_id',p_item));
 RETURN true;
END $$;

CREATE FUNCTION public.bnc_v07c_combo_create(p_event uuid,p_title text,p_kind text,p_price_cents integer,
 p_card_quantity integer,p_food_credit_cents integer,p_credit_scope text DEFAULT 'food',p_description text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE result_id uuid;
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 PERFORM 1 FROM public.bnc_events e JOIN public.bnc_organizations o ON o.id=e.organization_id
 WHERE e.id=p_event AND o.slug='tucxa' AND e.status IN ('draft','ready') AND e.sales_enabled=false;
 IF NOT FOUND THEN RAISE EXCEPTION 'Evento nao permite configurar ofertas'; END IF;
 INSERT INTO public.bnc_v07c_combos(event_id,title,kind,price_cents,card_quantity,food_credit_cents,credit_scope,description,created_by)
 VALUES(p_event,trim(p_title),p_kind,p_price_cents,p_card_quantity,p_food_credit_cents,p_credit_scope,nullif(trim(coalesce(p_description,'')),''),auth.uid()) RETURNING id INTO result_id;
 INSERT INTO public.bnc_operator_audit(event_id,actor_id,action,details)
 VALUES(p_event,auth.uid(),'combo_draft_create',jsonb_build_object('combo_id',result_id));
 RETURN result_id;
END $$;

CREATE FUNCTION public.bnc_v07c_batch_create(p_event uuid,p_code text,p_color_name text,p_quantity integer,p_round uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE result_id uuid;
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 PERFORM 1 FROM public.bnc_events e JOIN public.bnc_organizations o ON o.id=e.organization_id
 WHERE e.id=p_event AND o.slug='tucxa' AND e.status IN ('draft','ready') AND e.sales_enabled=false;
 IF NOT FOUND THEN RAISE EXCEPTION 'Evento nao permite configurar lotes'; END IF;
 IF p_round IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.bnc_rounds r WHERE r.id=p_round AND r.event_id=p_event AND r.status='planned') THEN
   RAISE EXCEPTION 'Rodada associada invalida'; END IF;
 INSERT INTO public.bnc_v07c_card_batches(event_id,code,color_name,quantity,allowed_round_id,created_by)
 VALUES(p_event,trim(p_code),trim(p_color_name),p_quantity,p_round,auth.uid()) RETURNING id INTO result_id;
 INSERT INTO public.bnc_operator_audit(event_id,actor_id,action,details)
 VALUES(p_event,auth.uid(),'batch_draft_create',jsonb_build_object('batch_id',result_id));
 RETURN result_id;
END $$;

CREATE TABLE public.bnc_v07c_prize_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, prize_id uuid NOT NULL REFERENCES public.bnc_prizes(id),
 actor_id uuid NOT NULL, action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bnc_v07c_prize_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bnc_v07c_prize_audit FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.bnc_v07c_catalog_prize(p_title text,p_description text DEFAULT NULL,p_image_url text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE org uuid; result_id uuid;
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF length(trim(coalesce(p_title,''))) NOT BETWEEN 2 AND 160 THEN RAISE EXCEPTION 'Nome invalido'; END IF;
 IF p_image_url IS NOT NULL AND (length(p_image_url)>800 OR p_image_url !~ '^https://[^[:space:]]+$') THEN RAISE EXCEPTION 'Imagem deve ser HTTPS'; END IF;
 SELECT id INTO STRICT org FROM public.bnc_organizations WHERE slug='tucxa';
 INSERT INTO public.bnc_prizes(organization_id,title,description,image_url,is_confirmed)
 VALUES(org,trim(p_title),nullif(trim(coalesce(p_description,'')),''),p_image_url,false) RETURNING id INTO result_id;
 INSERT INTO public.bnc_v07c_prize_audit(prize_id,actor_id,action) VALUES(result_id,auth.uid(),'create');
 RETURN result_id;
END $$;

CREATE FUNCTION public.bnc_v07c_attach_prize(p_event uuid,p_round uuid,p_prize uuid,p_award_type text DEFAULT 'other')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE award_id uuid; next_number integer;
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 PERFORM 1 FROM public.bnc_events e JOIN public.bnc_organizations o ON o.id=e.organization_id
 WHERE e.id=p_event AND o.slug='tucxa' AND e.status IN ('draft','ready');
 IF NOT FOUND THEN RAISE EXCEPTION 'Evento nao editavel'; END IF;
 PERFORM 1 FROM public.bnc_rounds WHERE id=p_round AND event_id=p_event AND status='planned' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Rodada nao editavel'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.bnc_prizes p JOIN public.bnc_organizations o ON o.id=p.organization_id
 WHERE p.id=p_prize AND o.slug='tucxa') THEN RAISE EXCEPTION 'Prenda de outra organizacao'; END IF;
 IF p_award_type NOT IN ('quina','full_card','other') THEN RAISE EXCEPTION 'Tipo invalido'; END IF;
 SELECT coalesce(max(award_number),0)+1 INTO next_number FROM public.bnc_awards WHERE round_id=p_round AND award_type=p_award_type;
 INSERT INTO public.bnc_awards(event_id,round_id,prize_id,award_type,award_number,label)
 SELECT p_event,p_round,p.id,p_award_type,next_number,p.title FROM public.bnc_prizes p WHERE p.id=p_prize RETURNING id INTO award_id;
 INSERT INTO public.bnc_operator_audit(event_id,round_id,actor_id,action,details)
 VALUES(p_event,p_round,auth.uid(),'catalog_prize_attached',jsonb_build_object('award_id',award_id,'prize_id',p_prize));
 RETURN award_id;
END $$;

CREATE FUNCTION public.bnc_v07c_confirm_prize(p_prize uuid,p_confirm boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF p_confirm IS NULL THEN RAISE EXCEPTION 'Decisao invalida'; END IF;
 UPDATE public.bnc_prizes p SET is_confirmed=p_confirm
 WHERE p.id=p_prize AND EXISTS (SELECT 1 FROM public.bnc_organizations o WHERE o.id=p.organization_id AND o.slug='tucxa');
 IF NOT FOUND THEN RAISE EXCEPTION 'Prenda indisponivel'; END IF;
 INSERT INTO public.bnc_v07c_prize_audit(prize_id,actor_id,action)
 VALUES(p_prize,auth.uid(),CASE WHEN p_confirm THEN 'confirm' ELSE 'unconfirm' END);
 RETURN true;
END $$;

-- Publicacao estritamente informativa. Ofertas em rascunho e lotes fisicos nunca sao publicos.
CREATE FUNCTION public.bnc_v07c_public_events()
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
   'menu', (SELECT coalesce(jsonb_agg(jsonb_build_object('category',m.category,'title',m.title,'description',m.description,'price_cents',m.price_cents,'image_url',m.image_url) ORDER BY m.category,m.sort_order,m.title),'[]'::jsonb)
             FROM public.bnc_menu_items m WHERE m.event_id=e.id AND m.is_active)
 ) ORDER BY e.starts_at NULLS LAST),'[]'::jsonb)
 FROM (SELECT * FROM public.bnc_events WHERE is_public AND status IN ('ready','active') ORDER BY starts_at NULLS LAST LIMIT 30) e
 JOIN public.bnc_organizations o ON o.id=e.organization_id WHERE o.slug IN ('tucxa','sementinha');
$$;

DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname LIKE 'bnc_v07c_%' AND p.proname<>'bnc_v07c_public_events' LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.sig);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.sig);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.bnc_v07c_public_events() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bnc_v07c_public_events() TO anon,authenticated;
COMMIT;
