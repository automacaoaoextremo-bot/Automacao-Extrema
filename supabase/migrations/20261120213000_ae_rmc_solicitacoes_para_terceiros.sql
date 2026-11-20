-- AE RMC: solicitante autenticado diferente da pessoa atendida.
-- Aplicar APOS 20261120160000_ae_rmc_timeline_multimidia.sql.
-- Sem criar conta Auth ou cliente para a pessoa beneficiaria.
BEGIN;
ALTER TABLE public.ae_ai_requests
  ADD COLUMN IF NOT EXISTS on_behalf_of boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requested_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS beneficiary_name text,
  ADD COLUMN IF NOT EXISTS beneficiary_phone text,
  ADD COLUMN IF NOT EXISTS beneficiary_relationship text,
  ADD COLUMN IF NOT EXISTS beneficiary_contact_channel text;
CREATE INDEX IF NOT EXISTS ae_ai_requests_requested_by_user_idx
  ON public.ae_ai_requests(organization_id,requested_by_user_id,created_at DESC)
  WHERE on_behalf_of;
DO $check$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ae_ai_requests_third_party_details_v1') THEN
    ALTER TABLE public.ae_ai_requests
      ADD CONSTRAINT ae_ai_requests_third_party_details_v1 CHECK (
        NOT on_behalf_of OR (
          length(btrim(coalesce(beneficiary_name,''))) BETWEEN 2 AND 120
          AND coalesce(beneficiary_phone,'') ~ '^55[0-9]{10,11}$'
          AND length(coalesce(beneficiary_relationship,'')) <= 80
          AND beneficiary_contact_channel IN ('phone','requester','whatsapp')
          AND consent_confirmed IS TRUE
        )
      );
  END IF;
END $check$;

-- A transacao fica atomica: se os metadados da pessoa atendida falharem,
-- o pedido e endereco gravados pela funcao v4 tambem sao revertidos.
CREATE OR REPLACE FUNCTION public.ae_ai_register_request_for_third_party_v1(
  p_organization_id uuid,
  p_requester_customer_id uuid,
  p_requester_auth_user_id uuid,
  p_requester_phone text,
  p_requester_name text,
  p_items jsonb,
  p_urgency text,
  p_address jsonb,
  p_preferred_contact text,
  p_beneficiary_name text,
  p_beneficiary_phone text,
  p_beneficiary_relationship text,
  p_contact_channel text,
  p_consent_confirmed boolean,
  p_secret_hash text,
  p_secret_expires_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.ae_ai_customers c
    JOIN public.ae_ai_organizations o ON o.id=c.organization_id
    WHERE c.organization_id=p_organization_id
      AND o.slug='reparos-rmc' AND o.status='active'
      AND c.id=p_requester_customer_id AND c.auth_user_id=p_requester_auth_user_id
      AND c.portal_enabled AND NOT c.must_change_password
  ) THEN RAISE EXCEPTION 'Solicitante nao autorizado'; END IF;

  IF p_consent_confirmed IS DISTINCT FROM TRUE
    OR length(btrim(coalesce(p_beneficiary_name,''))) NOT BETWEEN 2 AND 120
    OR coalesce(p_beneficiary_phone,'') !~ '^55[0-9]{10,11}$'
    OR length(coalesce(p_beneficiary_relationship,''))>80
    OR coalesce(p_contact_channel,'') NOT IN ('phone','requester','whatsapp') THEN
    RAISE EXCEPTION 'Dados ou autorizacao da pessoa atendida invalidos';
  END IF;

  -- O customer_id, conversa e telefone de origem sao sempre do solicitante.
  -- A pessoa atendida nao ganha conta, senha nem acesso a esse historico.
  -- Um endereco novo e criado como local de atendimento sob o solicitante.
  v_id := public.ae_ai_register_request_v4(
    p_organization_id,p_requester_customer_id,p_requester_phone,p_requester_name,
    p_items,p_urgency,NULL,p_address,p_preferred_contact,'customer_portal',
    NULL,TRUE,p_secret_hash,p_secret_expires_at
  );

  UPDATE public.ae_ai_requests SET
    on_behalf_of=TRUE,
    requested_by_user_id=p_requester_auth_user_id,
    beneficiary_name=left(btrim(p_beneficiary_name),120),
    beneficiary_phone=p_beneficiary_phone,
    beneficiary_relationship=nullif(left(btrim(coalesce(p_beneficiary_relationship,'')),80),''),
    beneficiary_contact_channel=p_contact_channel
  WHERE id=v_id AND organization_id=p_organization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido nao encontrado para vinculo'; END IF;

  UPDATE public.ae_ai_request_history
     SET note='Pedido registrado pelo titular da conta para outra pessoa, com autorizacao informada. Solicitante e pessoa atendida possuem identidades distintas.',
         actor_id=p_requester_auth_user_id
   WHERE organization_id=p_organization_id AND request_id=v_id AND status='pending';
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.ae_ai_register_request_for_third_party_v1(
  uuid,uuid,uuid,text,text,jsonb,text,jsonb,text,text,text,text,text,boolean,text,timestamptz
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ae_ai_register_request_for_third_party_v1(
  uuid,uuid,uuid,text,text,jsonb,text,jsonb,text,text,text,text,text,boolean,text,timestamptz
) TO service_role;
COMMIT;
