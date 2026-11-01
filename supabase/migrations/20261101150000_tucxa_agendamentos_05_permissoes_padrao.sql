-- TUCXA / Agendamentos 05
-- Nova regra: pode escolher outra Entidade por padrão. Só restringe após marcação explícita.
-- PRECAUÇÃO: efetuar backup do banco antes de aplicar. Executar apenas uma vez e
-- homologar com cadastros reais autorizados. Não afeta outras organizações.
BEGIN;

CREATE TABLE IF NOT EXISTS public.oh_tucxa_ag05_permissions_backup (
  organization_id uuid NOT NULL,
  record_kind text NOT NULL CHECK (record_kind IN ('preference', 'relationship')),
  record_id uuid NOT NULL,
  previous_allow_different_entity boolean,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, record_kind, record_id)
);
ALTER TABLE public.oh_tucxa_ag05_permissions_backup ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.oh_tucxa_ag05_permissions_backup IS 'Backup de permissão anterior à migração do Agendamento 05, sem dados pessoais.';

DO $$
DECLARE
  v_org uuid;
BEGIN
  SELECT id INTO v_org FROM public.oh_organizations
  WHERE slug = 'tucxa'
  ORDER BY created_at DESC LIMIT 1;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Organização tucxa não localizada, migração cancelada.';
  END IF;

  INSERT INTO public.oh_tucxa_ag05_permissions_backup
    (organization_id, record_kind, record_id, previous_allow_different_entity)
  SELECT organization_id, 'preference', person_id, allow_different_entity
  FROM public.oh_tucxa_pilot_person_preferences
  WHERE organization_id = v_org AND allow_different_entity IS DISTINCT FROM TRUE
  ON CONFLICT DO NOTHING;

  INSERT INTO public.oh_tucxa_ag05_permissions_backup
    (organization_id, record_kind, record_id, previous_allow_different_entity)
  SELECT organization_id, 'relationship', id, allow_different_entity
  FROM public.oh_tucxa_consulente_relationships
  WHERE organization_id = v_org AND allow_different_entity IS DISTINCT FROM TRUE
  ON CONFLICT DO NOTHING;

  UPDATE public.oh_tucxa_pilot_person_preferences
  SET allow_different_entity = TRUE
  WHERE organization_id = v_org AND allow_different_entity IS DISTINCT FROM TRUE;

  UPDATE public.oh_tucxa_consulente_relationships
  SET allow_different_entity = TRUE, updated_at = now()
  WHERE organization_id = v_org AND allow_different_entity IS DISTINCT FROM TRUE;
END $$;

-- Como estas são tabelas exclusivas do TUCXA, novos registros terão permissão true.
ALTER TABLE public.oh_tucxa_pilot_person_preferences
  ALTER COLUMN allow_different_entity SET DEFAULT TRUE;
ALTER TABLE public.oh_tucxa_consulente_relationships
  ALTER COLUMN allow_different_entity SET DEFAULT TRUE;

COMMIT;
