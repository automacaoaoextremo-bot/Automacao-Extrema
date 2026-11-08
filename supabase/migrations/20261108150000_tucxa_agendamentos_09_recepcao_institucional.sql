-- TUCXA / Agendamentos 09. Aplicar após backup e pré-diagnóstico, no ambiente correto.
-- Identidade canônica por telefone. Não cria pessoa, login nem role duplicados.
-- ATENÇÃO: exige cadastro ativo único, membership ativa única, e settings já existentes.
-- Execute isoladamente e confira o resultado; nenhuma mensagem é enviada por este SQL.
BEGIN;

CREATE TABLE IF NOT EXISTS public.oh_tucxa_pilot_reception_email_dispatches (
  organization_id uuid NOT NULL REFERENCES public.oh_organizations(id) ON DELETE CASCADE,
  dispatch_date date NOT NULL,
  phase text NOT NULL CHECK (phase IN ('morning','afternoon')),
  recipient_person_id uuid NOT NULL REFERENCES public.oh_people(id) ON DELETE RESTRICT,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','sent','error')),
  sent_at timestamptz,
  error text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, dispatch_date, phase, recipient_person_id)
);
ALTER TABLE public.oh_tucxa_pilot_reception_email_dispatches ENABLE ROW LEVEL SECURITY;
-- Uso exclusivo da service role no servidor, sem policies de acesso ao navegador.

DO $$
DECLARE
  v_org uuid;
  v_person uuid;
  v_membership uuid;
  v_person_email text;
  v_phone_raw text;
  v_phone_normalized text;
  v_profile jsonb;
  v_functions jsonb;
  v_selected jsonb;
  v_settings jsonb;
  v_rules jsonb;
  v_count integer;
  v_channel_type text;
BEGIN
  SELECT count(*) INTO v_count FROM public.oh_organizations
    WHERE slug = 'tucxa' OR name ILIKE '%tucxa%';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TUCXA: esperado 1 organização, encontradas %.', v_count;
  END IF;
  SELECT id INTO STRICT v_org FROM public.oh_organizations
    WHERE slug = 'tucxa' OR name ILIKE '%tucxa%';

  SELECT count(*) INTO v_count FROM public.oh_people
   WHERE organization_id = v_org AND (
     regexp_replace(coalesce(whatsapp,''),'[^0-9]','','g') IN ('19989045150','5519989045150') OR
     regexp_replace(coalesce(normalized_whatsapp,''),'[^0-9]','','g') IN ('19989045150','5519989045150'));
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Telefone institucional: esperado exatamente 1 cadastro, encontrados %.', v_count;
  END IF;
  SELECT id, email,
         regexp_replace(coalesce(whatsapp,''),'[^0-9]','','g'),
         regexp_replace(coalesce(normalized_whatsapp,''),'[^0-9]','','g')
    INTO STRICT v_person, v_person_email, v_phone_raw, v_phone_normalized
    FROM public.oh_people
   WHERE organization_id = v_org AND (
     regexp_replace(coalesce(whatsapp,''),'[^0-9]','','g') IN ('19989045150','5519989045150') OR
     regexp_replace(coalesce(normalized_whatsapp,''),'[^0-9]','','g') IN ('19989045150','5519989045150'))
   AND active IS TRUE;
  IF v_person IS NULL THEN RAISE EXCEPTION 'Cadastro institucional inativo.'; END IF;
  IF (v_phone_raw <> '' AND v_phone_raw NOT IN ('19989045150','5519989045150'))
    OR (v_phone_normalized <> '' AND v_phone_normalized NOT IN ('19989045150','5519989045150')) THEN
    RAISE EXCEPTION 'Conflito entre os campos de celular. Corrija antes de autorizar envios.';
  END IF;
  IF nullif(trim(coalesce(v_person_email,'')),'') IS NOT NULL
     AND lower(trim(v_person_email)) <> 'tucxacentro@gmail.com' THEN
    RAISE EXCEPTION 'Cadastro tem e-mail diferente; revisar manualmente antes de modificar.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.oh_people
     WHERE organization_id = v_org AND id <> v_person
       AND lower(trim(coalesce(email,''))) = 'tucxacentro@gmail.com') THEN
    RAISE EXCEPTION 'E-mail institucional já pertence a outro cadastro; interrompido.';
  END IF;

  SELECT count(*) INTO v_count FROM public.oh_memberships
   WHERE organization_id = v_org AND person_id = v_person AND active IS TRUE AND status = 'ativo';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Esperada 1 membership ativa com status ativo, encontradas %.', v_count;
  END IF;
  SELECT id, coalesce(agenda_viva_profile,'{}'::jsonb) INTO STRICT v_membership, v_profile
    FROM public.oh_memberships
    WHERE organization_id = v_org AND person_id = v_person AND active IS TRUE AND status = 'ativo';
  IF jsonb_typeof(v_profile) <> 'object' THEN
    RAISE EXCEPTION 'agenda_viva_profile não é objeto JSON válido.';
  END IF;
  v_functions := CASE WHEN jsonb_typeof(v_profile->'functionSlugs')='array'
    THEN v_profile->'functionSlugs' ELSE '[]'::jsonb END;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_functions) x
      WHERE lower(x) IN ('recepcao','recepção')) THEN
    v_functions := v_functions || to_jsonb('recepcao'::text);
  END IF;
  v_selected := CASE WHEN jsonb_typeof(v_profile->'selectedFunctions')='array'
    THEN v_profile->'selectedFunctions' ELSE '[]'::jsonb END;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_selected) x
      WHERE lower(coalesce(x->>'slug',''))='recepcao') THEN
    v_selected := v_selected || jsonb_build_array(jsonb_build_object('slug','recepcao','label','Recepção'));
  END IF;
  v_profile := v_profile || jsonb_build_object(
    'supportsReception',true,'isReception',true,
    'functionSlugs', v_functions,'selectedFunctions',v_selected,
    'receptionSchedule',jsonb_build_object('monday',jsonb_build_array(1,2,3,4),
                                           'tuesday',jsonb_build_array(1,2,3,4)));

  -- A regra adicional contempla inclusive uma eventual 5ª segunda/terça,
  -- mas somente se o calendário do TUCXA autorizar atendimento nessa data.
  SELECT count(*) INTO v_count FROM public.oh_module_settings
    WHERE organization_id = v_org AND module_slug = 'atendimento-em-harmonia';
  IF v_count <> 1 THEN RAISE EXCEPTION 'Configuração do módulo não encontrada ou duplicada.'; END IF;
  SELECT coalesce(settings,'{}'::jsonb) INTO STRICT v_settings FROM public.oh_module_settings
    WHERE organization_id = v_org AND module_slug = 'atendimento-em-harmonia';
  IF jsonb_typeof(v_settings) <> 'object' THEN RAISE EXCEPTION 'settings não é objeto JSON.'; END IF;
  v_rules := CASE WHEN jsonb_typeof(v_settings->'pilotReceptionAdditionalRecipients')='array'
    THEN v_settings->'pilotReceptionAdditionalRecipients' ELSE '[]'::jsonb END;
  SELECT coalesce(jsonb_agg(x), '[]'::jsonb) INTO v_rules
    FROM jsonb_array_elements(v_rules) x
    WHERE regexp_replace(coalesce(x->>'phone',''),'[^0-9]','','g') NOT IN ('19989045150','5519989045150');
  v_rules := v_rules || jsonb_build_array(jsonb_build_object(
    'phone','19989045150','weekdays',jsonb_build_array(1,2),'enabled',true));

  UPDATE public.oh_people SET email = 'tucxacentro@gmail.com'
    WHERE id = v_person AND organization_id = v_org;
  UPDATE public.oh_memberships SET agenda_viva_profile = v_profile
    WHERE id = v_membership AND organization_id = v_org;
  UPDATE public.oh_module_settings SET
    settings = jsonb_set(v_settings,'{pilotReceptionAdditionalRecipients}',v_rules,true),
    updated_at = now()
    WHERE organization_id = v_org AND module_slug = 'atendimento-em-harmonia';

  -- Ajusta preferências existentes sem presumir que o campo é text[] ou jsonb.
  SELECT udt_name INTO v_channel_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='oh_tucxa_pilot_person_preferences'
      AND column_name='reception_summary_channels';
  IF v_channel_type = '_text' THEN
    UPDATE public.oh_tucxa_pilot_person_preferences
      SET reception_summary_channels = ARRAY['whatsapp','email'], updated_at = now()
      WHERE organization_id = v_org AND person_id = v_person;
  ELSIF v_channel_type = 'jsonb' THEN
    EXECUTE 'UPDATE public.oh_tucxa_pilot_person_preferences SET reception_summary_channels = $1, updated_at = now() WHERE organization_id=$2 AND person_id=$3'
      USING '["whatsapp","email"]'::jsonb, v_org, v_person;
  ELSIF v_channel_type IS NOT NULL THEN
    RAISE EXCEPTION 'Tipo inesperado para reception_summary_channels: %', v_channel_type;
  END IF;
END $$;
COMMIT;
