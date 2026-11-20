-- AE / Atendimento Inteligente / Reparos RMC 01
-- Aplicar depois de 20261120160000 (timeline) e 20261120213000 (terceiros).
-- A proxima acao e independente do status tecnico e nao afeta outras empresas.
BEGIN;
ALTER TABLE public.ae_ai_requests
  ADD COLUMN IF NOT EXISTS awaiting_response_from text;
ALTER TABLE public.ae_ai_request_timeline
  ADD COLUMN IF NOT EXISTS requires_response boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ae_ai_requests_awaiting_response_from_check') THEN
    ALTER TABLE public.ae_ai_requests
      ADD CONSTRAINT ae_ai_requests_awaiting_response_from_check
      CHECK (awaiting_response_from IS NULL OR awaiting_response_from IN ('customer','n2'));
  END IF;
END $$;

-- Pedidos anteriores em analise ficam com o N2; nao atribuir automaticamente
-- a responsabilidade dos pedidos need_info, pois o historico nao a comprova.
UPDATE public.ae_ai_requests r SET awaiting_response_from='n2'
FROM public.ae_ai_organizations o
WHERE r.organization_id=o.id AND o.slug='reparos-rmc'
  AND r.awaiting_response_from IS NULL AND r.status IN ('pending','in_review');

-- Novos pedidos RMC comecam aguardando avaliacao N2, sem afetar outros tenants.
CREATE OR REPLACE FUNCTION public.ae_ai_rmc_01_on_new_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.status='pending' AND EXISTS (
    SELECT 1 FROM public.ae_ai_organizations
    WHERE id=NEW.organization_id AND slug='reparos-rmc'
  ) THEN NEW.awaiting_response_from:='n2'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ae_ai_rmc_01_new_request ON public.ae_ai_requests;
CREATE TRIGGER ae_ai_rmc_01_new_request
BEFORE INSERT ON public.ae_ai_requests
FOR EACH ROW EXECUTE FUNCTION public.ae_ai_rmc_01_on_new_request();

-- Etapas alteradas pelo N2 (ou pelo fluxo de orcamento) sincronizam o proximo passo.
CREATE OR REPLACE FUNCTION public.ae_ai_rmc_01_on_stage_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.ae_ai_organizations
                 WHERE id=NEW.organization_id AND slug='reparos-rmc') THEN
    RETURN NEW;
  END IF;
  IF NEW.status='need_info' THEN
    NEW.awaiting_response_from:='customer';
  ELSIF NEW.status IN ('pending','in_review') THEN
    NEW.awaiting_response_from:='n2';
  ELSE
    NEW.awaiting_response_from:=NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ae_ai_rmc_01_stage_change ON public.ae_ai_requests;
CREATE TRIGGER ae_ai_rmc_01_stage_change
BEFORE UPDATE OF status ON public.ae_ai_requests
FOR EACH ROW EXECUTE FUNCTION public.ae_ai_rmc_01_on_stage_change();

-- Mensagens novas mudam a vez somente ao pedir resposta explicitamente (N2)
-- ou quando o cliente efetivamente responde a uma pergunta pendente.
-- Importacoes historicas NUNCA movem a vez nem modificam o status atual.
CREATE OR REPLACE FUNCTION public.ae_ai_rmc_01_on_timeline_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_status text;
BEGIN
  IF NEW.origin <> 'portal' THEN RETURN NEW; END IF;
  IF NEW.event_type='attachment' AND NOT NEW.uploaded THEN RETURN NEW; END IF;
  IF NEW.event_type NOT IN ('message','attachment') THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ae_ai_organizations
                 WHERE id=NEW.organization_id AND slug='reparos-rmc') THEN
    RETURN NEW;
  END IF;

  IF NEW.author_role='operator' AND NEW.requires_response THEN
    UPDATE public.ae_ai_requests r
       SET status='need_info',awaiting_response_from='customer',updated_at=now()
     WHERE r.organization_id=NEW.organization_id AND r.id=NEW.request_id
       AND r.status IN ('pending','in_review','need_info')
       AND (r.status <> 'need_info' OR r.awaiting_response_from IS DISTINCT FROM 'customer')
     RETURNING r.status INTO v_status;
    IF FOUND THEN
      INSERT INTO public.ae_ai_request_history(organization_id,request_id,status,note,actor_id)
      VALUES(NEW.organization_id,NEW.request_id,'need_info',
        'Resposta solicitada ao cliente no historico multimidia.',NEW.author_user_id);
    END IF;
  ELSIF NEW.author_role='customer' THEN
    UPDATE public.ae_ai_requests r
       SET status='in_review',awaiting_response_from='n2',updated_at=now()
     WHERE r.organization_id=NEW.organization_id AND r.id=NEW.request_id
       AND r.status='need_info' AND r.awaiting_response_from='customer'
     RETURNING r.status INTO v_status;
    IF FOUND THEN
      INSERT INTO public.ae_ai_request_history(organization_id,request_id,status,note,actor_id)
      VALUES(NEW.organization_id,NEW.request_id,'in_review',
        'Resposta do solicitante recebida; encaminhado ao N2.',NEW.author_user_id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ae_ai_rmc_01_timeline_after_insert ON public.ae_ai_request_timeline;
DROP TRIGGER IF EXISTS ae_ai_rmc_01_timeline_after_upload ON public.ae_ai_request_timeline;
CREATE TRIGGER ae_ai_rmc_01_timeline_after_insert
AFTER INSERT ON public.ae_ai_request_timeline
FOR EACH ROW EXECUTE FUNCTION public.ae_ai_rmc_01_on_timeline_event();
CREATE TRIGGER ae_ai_rmc_01_timeline_after_upload
AFTER UPDATE OF uploaded ON public.ae_ai_request_timeline
FOR EACH ROW WHEN (OLD.uploaded IS DISTINCT FROM NEW.uploaded AND NEW.uploaded)
EXECUTE FUNCTION public.ae_ai_rmc_01_on_timeline_event();

REVOKE ALL ON FUNCTION public.ae_ai_rmc_01_on_new_request() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.ae_ai_rmc_01_on_stage_change() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.ae_ai_rmc_01_on_timeline_event() FROM PUBLIC,anon,authenticated;
COMMIT;
