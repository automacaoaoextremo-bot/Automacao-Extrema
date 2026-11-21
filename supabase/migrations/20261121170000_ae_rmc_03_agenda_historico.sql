-- RMC 03: agenda privada e data original declarada. Nao altera created_at.
BEGIN;
ALTER TABLE public.ae_ai_requests ADD COLUMN IF NOT EXISTS requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS historical_import_key uuid;
CREATE UNIQUE INDEX IF NOT EXISTS ae_ai_rmc_03_import_key ON public.ae_ai_requests(organization_id,requested_by_user_id,historical_import_key) WHERE historical_import_key IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.ae_ai_rmc_saved_recipients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.ae_ai_organizations(id),
 owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES public.ae_ai_customers(id) ON DELETE CASCADE,
 name text NOT NULL, name_key text GENERATED ALWAYS AS (lower(btrim(name))) STORED,
 phone text NOT NULL CHECK (phone ~ '^55[0-9]{10,11}$'),
 relationship text NOT NULL DEFAULT '', contact_channel text NOT NULL CHECK(contact_channel IN ('phone','requester','whatsapp')),
 address_id uuid NOT NULL REFERENCES public.ae_ai_customer_addresses(id) ON DELETE CASCADE,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,owner_user_id,customer_id,phone,name_key,address_id)
);
ALTER TABLE public.ae_ai_rmc_saved_recipients ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ae_ai_rmc_saved_recipients FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.ae_ai_rmc_saved_recipients TO service_role;
-- Reaproveita somente pedidos anteriores com vinculo comprovado ao titular.
INSERT INTO public.ae_ai_rmc_saved_recipients(organization_id,owner_user_id,customer_id,name,phone,relationship,contact_channel,address_id)
SELECT r.organization_id,r.requested_by_user_id,r.customer_id,r.beneficiary_name,r.beneficiary_phone,
 coalesce(r.beneficiary_relationship,''),r.beneficiary_contact_channel,r.address_id
FROM public.ae_ai_requests r JOIN public.ae_ai_customers c ON c.id=r.customer_id AND c.organization_id=r.organization_id AND c.auth_user_id=r.requested_by_user_id
JOIN public.ae_ai_customer_addresses a ON a.id=r.address_id AND a.organization_id=r.organization_id AND a.contact_id=c.contact_id
JOIN public.ae_ai_organizations o ON o.id=r.organization_id AND o.slug='reparos-rmc'
WHERE r.on_behalf_of AND r.consent_confirmed AND r.beneficiary_phone ~ '^55[0-9]{10,11}$'
 AND r.beneficiary_name IS NOT NULL AND r.beneficiary_contact_channel IN ('phone','requester','whatsapp')
ORDER BY r.created_at DESC ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.ae_ai_register_request_for_third_party_v2(
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
  p_secret_expires_at timestamptz,
  p_saved_id uuid, p_requested_at timestamptz, p_import_key uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_id uuid; v_address_id uuid; v_contact_id uuid; v_name text;
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

  IF (p_requested_at IS NULL) <> (p_import_key IS NULL) OR p_requested_at > now() THEN
    RAISE EXCEPTION 'Data historica invalida'; END IF;
  IF p_import_key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || p_requester_auth_user_id::text || ':' || p_import_key::text,0));
    SELECT id INTO v_id FROM public.ae_ai_requests WHERE organization_id=p_organization_id
      AND requested_by_user_id=p_requester_auth_user_id AND historical_import_key=p_import_key;
    IF FOUND THEN RETURN jsonb_build_object('requestId',v_id,'duplicate',true); END IF;
  END IF;
  -- Serializa a agenda por titular, para nao duplicar enderecos em solicitacoes simultaneas.
  PERFORM pg_advisory_xact_lock(hashtextextended('rmc-agenda:' || p_organization_id::text || ':' || p_requester_auth_user_id::text,0));
  SELECT contact_id INTO v_contact_id FROM public.ae_ai_customers WHERE id=p_requester_customer_id AND organization_id=p_organization_id;
  v_name := btrim(p_beneficiary_name);
  IF p_saved_id IS NOT NULL THEN
    SELECT s.address_id INTO v_address_id FROM public.ae_ai_rmc_saved_recipients s
      JOIN public.ae_ai_customer_addresses a ON a.id=s.address_id AND a.organization_id=s.organization_id
      WHERE s.id=p_saved_id AND s.organization_id=p_organization_id AND s.owner_user_id=p_requester_auth_user_id
      AND s.customer_id=p_requester_customer_id AND a.contact_id=v_contact_id
      AND s.phone=p_beneficiary_phone AND lower(s.name)=lower(v_name);
    IF NOT FOUND THEN RAISE EXCEPTION 'Endereco salvo nao autorizado para essa pessoa'; END IF;
  ELSE
    SELECT s.address_id INTO v_address_id FROM public.ae_ai_rmc_saved_recipients s
      JOIN public.ae_ai_customer_addresses a ON a.id=s.address_id AND a.organization_id=s.organization_id
      WHERE s.organization_id=p_organization_id AND s.owner_user_id=p_requester_auth_user_id
      AND s.customer_id=p_requester_customer_id AND a.contact_id=v_contact_id
      AND s.phone=p_beneficiary_phone AND lower(s.name)=lower(v_name)
      AND a.cep=p_address->>'cep' AND a.street=p_address->>'street' AND a.number=p_address->>'number'
      AND coalesce(a.complement,'')=coalesce(p_address->>'complement','')
      AND a.neighborhood=p_address->>'neighborhood' AND a.city=p_address->>'city' AND a.state=p_address->>'state'
      LIMIT 1;
  END IF;
  -- O customer_id, conversa e telefone de origem sao sempre do solicitante.
  -- A pessoa atendida nao ganha conta, senha nem acesso a esse historico.
  -- Um endereco novo e criado como local de atendimento sob o solicitante.
  v_id := public.ae_ai_register_request_v4(
    p_organization_id,p_requester_customer_id,p_requester_phone,p_requester_name,
    p_items,p_urgency,v_address_id,p_address,p_preferred_contact,'customer_portal',
    NULL,TRUE,p_secret_hash,p_secret_expires_at
  );

  UPDATE public.ae_ai_requests SET
    on_behalf_of=TRUE,
    requested_by_user_id=p_requester_auth_user_id,
    beneficiary_name=left(btrim(p_beneficiary_name),120),
    beneficiary_phone=p_beneficiary_phone,
    beneficiary_relationship=nullif(left(btrim(coalesce(p_beneficiary_relationship,'')),80),''),
    beneficiary_contact_channel=p_contact_channel,
    requested_at=p_requested_at,historical_import_key=p_import_key
  WHERE id=v_id AND organization_id=p_organization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido nao encontrado para vinculo'; END IF;

  UPDATE public.ae_ai_request_history
     SET note='Pedido registrado pelo titular da conta para outra pessoa, com autorizacao informada. Solicitante e pessoa atendida possuem identidades distintas.',
         actor_id=p_requester_auth_user_id
   WHERE organization_id=p_organization_id AND request_id=v_id AND status='pending';
  SELECT address_id INTO v_address_id FROM public.ae_ai_requests WHERE id=v_id AND organization_id=p_organization_id;
  INSERT INTO public.ae_ai_rmc_saved_recipients(organization_id,owner_user_id,customer_id,name,phone,relationship,contact_channel,address_id)
  VALUES(p_organization_id,p_requester_auth_user_id,p_requester_customer_id,v_name,p_beneficiary_phone,
    coalesce(p_beneficiary_relationship,''),p_contact_channel,v_address_id)
  ON CONFLICT(organization_id,owner_user_id,customer_id,phone,name_key,address_id)
  DO UPDATE SET name=excluded.name,relationship=excluded.relationship,contact_channel=excluded.contact_channel,updated_at=now();
  IF p_requested_at IS NOT NULL THEN
    UPDATE public.ae_ai_request_history SET note=note || ' Data historica declarada pelo solicitante; registro efetivo preservado.'
    WHERE organization_id=p_organization_id AND request_id=v_id AND status='pending';
  END IF;
  RETURN jsonb_build_object('requestId',v_id,'duplicate',false);
END $$;
REVOKE ALL ON FUNCTION public.ae_ai_register_request_for_third_party_v2(uuid,uuid,uuid,text,text,jsonb,text,jsonb,text,text,text,text,text,boolean,text,timestamptz,uuid,timestamptz,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ae_ai_register_request_for_third_party_v2(uuid,uuid,uuid,text,text,jsonb,text,jsonb,text,text,text,text,text,boolean,text,timestamptz,uuid,timestamptz,uuid) TO service_role;
COMMIT;
