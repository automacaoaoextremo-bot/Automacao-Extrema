-- BNC V07D: horarios completos, estado de disponibilidade e associacao atomica de prendas.
-- Aplicar primeiro em HOMOLOGACAO, apos V07A/V07B/V07C. Nao executar duas vezes.
-- Nao altera registros historicos concluídos, pedidos, vendas, sorteios ou auth.users.
BEGIN;
DO $$ BEGIN
  IF to_regprocedure('public.bnc_v07b_clone_event(uuid,text,text,timestamptz)') IS NULL
     OR to_regprocedure('public.bnc_v07c_catalog_prize(text,text,text)') IS NULL
     OR to_regclass('public.bnc_operator_audit') IS NULL
     OR to_regclass('public.bnc_v07c_prize_audit') IS NULL THEN
    RAISE EXCEPTION 'V07B/V07C nao encontrados. Interrompido.';
  END IF;
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bnc_events' AND column_name='ends_at')
    OR EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bnc_prizes' AND column_name='availability_status')
    OR to_regprocedure('public.bnc_v07d_assign_prizes(uuid,uuid,uuid[],text)') IS NOT NULL THEN
    RAISE EXCEPTION 'V07D total ou parcialmente aplicada. Auditar antes de reaplicar.';
  END IF;
END $$;

ALTER TABLE public.bnc_events ADD COLUMN ends_at timestamptz;
ALTER TABLE public.bnc_events ADD CONSTRAINT bnc_v07d_ends_after_start_ck
  CHECK(ends_at IS NULL OR (starts_at IS NOT NULL AND ends_at > starts_at));
GRANT INSERT (ends_at) ON public.bnc_events TO authenticated;
GRANT UPDATE (ends_at) ON public.bnc_events TO authenticated;

ALTER TABLE public.bnc_prizes ADD COLUMN availability_status text NOT NULL DEFAULT 'available';
ALTER TABLE public.bnc_prizes ADD CONSTRAINT bnc_v07d_prize_availability_ck
  CHECK(availability_status IN ('available','allocated','unavailable'));
-- Se alguma prenda já estiver atribuída a dois eventos planejados/ativos, a V07D
-- deve interromper para revisão em vez de presumir qual alocação manter.
DO $$ BEGIN
 IF EXISTS (
   SELECT a.prize_id FROM public.bnc_awards a
   JOIN public.bnc_events e ON e.id=a.event_id
   JOIN public.bnc_organizations o ON o.id=e.organization_id
   WHERE a.prize_id IS NOT NULL AND o.slug='tucxa' AND e.status IN ('draft','ready','active')
   GROUP BY a.prize_id HAVING count(*)>1
 ) THEN RAISE EXCEPTION 'Prendas com múltiplas alocações em eventos ativos. Corrigir em homologação antes da V07D.'; END IF;
END $$;
-- Regulariza SOMENTE prendas do TUCXA ligadas a eventos ainda nao concluidos.
UPDATE public.bnc_prizes p SET availability_status='allocated'
FROM public.bnc_awards a JOIN public.bnc_events e ON e.id=a.event_id
JOIN public.bnc_organizations o ON o.id=e.organization_id
WHERE a.prize_id=p.id AND p.organization_id=o.id AND o.slug='tucxa' AND e.status IN ('draft','ready','active');

-- Copia atomica de evento: reutiliza o importador ja homologado e acrescenta termino.
CREATE FUNCTION public.bnc_v07d_clone_event(p_source uuid,p_title text,p_slug text,p_starts_at timestamptz,p_ends_at timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE created_id uuid;
BEGIN
 IF p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at<=p_starts_at THEN
   RAISE EXCEPTION 'Inicio e termino obrigatorios e ordenados'; END IF;
 created_id := public.bnc_v07b_clone_event(p_source,p_title,p_slug,p_starts_at);
 UPDATE public.bnc_events SET ends_at=p_ends_at WHERE id=created_id;
 RETURN created_id;
END $$;

-- Foto real da prenda: caminho do bucket e objeto autenticado, sem upload de documentos pessoais.
CREATE POLICY bnc_v07d_prize_image_upload ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (
   bucket_id='bnc-public-images'
   AND (storage.foldername(name))[1]='tucxa'
   AND (storage.foldername(name))[2]='prizes'
   AND (storage.foldername(name))[3] ~ '^[0-9a-f-]{36}$'
   AND EXISTS (
     SELECT 1 FROM public.bnc_prizes p JOIN public.bnc_organizations o ON o.id=p.organization_id
     WHERE p.id::text=(storage.foldername(name))[3] AND o.slug='tucxa'
       AND public.bnc_v07b_tucxa_role(ARRAY['owner','manager'])
   )
 );

CREATE FUNCTION public.bnc_v07d_prize_set_image(p_prize uuid,p_image_url text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE prefix text;
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.bnc_prizes p JOIN public.bnc_organizations o ON o.id=p.organization_id
               WHERE p.id=p_prize AND o.slug='tucxa') THEN RAISE EXCEPTION 'Prenda invalida'; END IF;
 prefix := '/storage/v1/object/public/bnc-public-images/tucxa/prizes/'||p_prize||'/';
 IF p_image_url IS NULL OR length(p_image_url)>850 OR p_image_url !~ '^https://[a-z0-9-]+\.supabase\.co/'
    OR position(prefix in p_image_url)=0 THEN RAISE EXCEPTION 'URL da foto nao autorizada'; END IF;
 UPDATE public.bnc_prizes SET image_url=p_image_url WHERE id=p_prize;
 INSERT INTO public.bnc_v07c_prize_audit(prize_id,actor_id,action) VALUES(p_prize,auth.uid(),'image_set');
 RETURN true;
END $$;

CREATE FUNCTION public.bnc_v07d_prize_set_availability(p_prize uuid,p_status text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE current_status text;
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF p_status NOT IN ('available','unavailable') OR p_status IS NULL THEN RAISE EXCEPTION 'Status invalido'; END IF;
 SELECT p.availability_status INTO current_status FROM public.bnc_prizes p
 JOIN public.bnc_organizations o ON o.id=p.organization_id
 WHERE p.id=p_prize AND o.slug='tucxa' FOR UPDATE OF p;
 IF NOT FOUND THEN RAISE EXCEPTION 'Prenda nao encontrada'; END IF;
 IF current_status='allocated' OR EXISTS (
  SELECT 1 FROM public.bnc_awards a JOIN public.bnc_events e ON e.id=a.event_id
  WHERE a.prize_id=p_prize AND e.status IN ('draft','ready','active')
 ) THEN RAISE EXCEPTION 'Prenda associada a um evento ativo/planejado. Revisao manual necessaria'; END IF;
 UPDATE public.bnc_prizes SET availability_status=p_status WHERE id=p_prize;
 INSERT INTO public.bnc_v07c_prize_audit(prize_id,actor_id,action) VALUES(p_prize,auth.uid(),'availability_'||p_status);
 RETURN true;
END $$;

-- A vinculação de diversas prendas acontece NUMA transacao, com bloqueio da rodada.
CREATE FUNCTION public.bnc_v07d_assign_prizes(p_event uuid,p_round uuid,p_prizes uuid[],p_award_type text DEFAULT 'other')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ DECLARE chosen record; next_number integer; count_prizes integer:=0; prize_count integer;
BEGIN
 IF NOT public.bnc_v07b_tucxa_role(ARRAY['owner','manager']) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF p_prizes IS NULL OR cardinality(p_prizes)<1 OR cardinality(p_prizes)>30 THEN RAISE EXCEPTION 'Selecione de 1 a 30 prendas'; END IF;
 IF p_award_type NOT IN ('quina','full_card','other') THEN RAISE EXCEPTION 'Tipo de premio invalido'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(p_prizes) q(id) WHERE q.id IS NULL)
   OR (SELECT count(DISTINCT id) FROM unnest(p_prizes) q(id))<>cardinality(p_prizes) THEN
   RAISE EXCEPTION 'IDs de prendas repetidos ou invalidos'; END IF;
 PERFORM 1 FROM public.bnc_rounds r JOIN public.bnc_events e ON e.id=r.event_id
 JOIN public.bnc_organizations o ON o.id=e.organization_id
 WHERE r.id=p_round AND r.event_id=p_event AND r.status='planned'
 AND o.slug='tucxa' AND e.status IN ('draft','ready') AND e.sales_enabled=false FOR UPDATE OF r;
 IF NOT FOUND THEN RAISE EXCEPTION 'Evento ou rodada nao editavel'; END IF;
 SELECT count(*) INTO prize_count FROM public.bnc_prizes p JOIN public.bnc_organizations o ON o.id=p.organization_id
 WHERE p.id=ANY(p_prizes) AND o.slug='tucxa' AND p.availability_status='available';
 IF prize_count<>cardinality(p_prizes) THEN RAISE EXCEPTION 'Uma ou mais prendas nao estao disponiveis'; END IF;
 -- Bloqueio ordenado para serializar a alocacao concorrente em qualquer rodada.
 FOR chosen IN SELECT p.id,p.title,p.availability_status FROM public.bnc_prizes p
   WHERE p.id=ANY(p_prizes) ORDER BY p.id FOR UPDATE LOOP
   IF chosen.availability_status<>'available' THEN RAISE EXCEPTION 'Prenda ja associada'; END IF;
   IF EXISTS (SELECT 1 FROM public.bnc_awards a JOIN public.bnc_events e ON e.id=a.event_id
              WHERE a.prize_id=chosen.id AND e.status IN ('draft','ready','active')) THEN
      RAISE EXCEPTION 'Prenda reservada em outro evento'; END IF;
 END LOOP;
 SELECT coalesce(max(award_number),0)+1 INTO next_number FROM public.bnc_awards
 WHERE round_id=p_round AND award_type=p_award_type;
 FOR chosen IN SELECT p.id,p.title FROM public.bnc_prizes p WHERE p.id=ANY(p_prizes) ORDER BY p.title,p.id LOOP
   INSERT INTO public.bnc_awards(event_id,round_id,prize_id,award_type,award_number,label)
   VALUES(p_event,p_round,chosen.id,p_award_type,next_number,chosen.title);
   UPDATE public.bnc_prizes SET availability_status='allocated' WHERE id=chosen.id;
   next_number:=next_number+1;
   count_prizes:=count_prizes+1;
 END LOOP;
 INSERT INTO public.bnc_operator_audit(event_id,round_id,actor_id,action,details)
 VALUES(p_event,p_round,auth.uid(),'prizes_batch_attached',jsonb_build_object('prize_ids',p_prizes,'count',count_prizes));
 RETURN count_prizes;
END $$;

-- Desativa a associacao antiga que nao verificava disponibilidade e poderia duplicar prendas.
REVOKE EXECUTE ON FUNCTION public.bnc_v07c_attach_prize(uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.bnc_v07b_add_prize(uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;

REVOKE ALL ON FUNCTION public.bnc_v07d_clone_event(uuid,text,text,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bnc_v07d_prize_set_image(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bnc_v07d_prize_set_availability(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bnc_v07d_assign_prizes(uuid,uuid,uuid[],text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07d_clone_event(uuid,text,text,timestamptz,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07d_prize_set_image(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07d_prize_set_availability(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bnc_v07d_assign_prizes(uuid,uuid,uuid[],text) TO authenticated;
COMMIT;
