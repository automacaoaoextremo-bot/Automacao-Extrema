-- TUCXA / AG24 - Autorizacao por Entidade + protecao transacional para agendamento duplicado.
-- Executar primeiro em homologacao. Nao modifica agendamentos existentes.
BEGIN;

ALTER TABLE public.oh_spiritual_entities
  ADD COLUMN IF NOT EXISTS pilot_allows_nondefault_booking boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.oh_spiritual_entities.pilot_allows_nondefault_booking IS
  'Quando true, permite autoagendamento de consulentes com esta Entidade, mesmo nao sendo a Entidade padrao; nao altera permissão da Recepcao para realocar Primeira Vez.';

CREATE INDEX IF NOT EXISTS idx_tucxa_ag24_appointments_person_date_active
  ON public.oh_consulente_appointments (organization_id, person_id, appointment_date)
  WHERE person_id IS NOT NULL
    AND status IN ('solicitado','confirmado','aprovado','presente','concluido');

-- Evita duas reservas concorrentes para a MESMA pessoa/data em Entidades diferentes.
-- A rotina RPC anterior so usava lock (Entidade, data), deixando uma janela de corrida.
CREATE OR REPLACE FUNCTION public.tucxa_ag24_prevent_duplicate_person_day()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.person_id IS NULL
     OR NEW.appointment_date IS NULL
     OR NEW.status NOT IN ('solicitado','confirmado','aprovado','presente','concluido') THEN
    RETURN NEW;
  END IF;

  -- Protecao especifica do TUCXA; outros modulos/organizacoes nao mudam de regra.
  IF NOT EXISTS (
    SELECT 1 FROM public.oh_organizations o
    WHERE o.id = NEW.organization_id AND o.slug = 'tucxa'
  ) THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    concat_ws(':', 'ag24', NEW.organization_id::text,
      NEW.person_id::text, NEW.appointment_date::text), 0));

  IF EXISTS (
    SELECT 1 FROM public.oh_consulente_appointments a
    WHERE a.organization_id = NEW.organization_id
      AND a.person_id = NEW.person_id
      AND a.appointment_date = NEW.appointment_date
      AND a.status IN ('solicitado','confirmado','aprovado','presente','concluido')
      AND a.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'PILOT_DUPLICATE_PERSON_DATE', ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tucxa_ag24_prevent_duplicate_person_day ON public.oh_consulente_appointments;
CREATE TRIGGER trg_tucxa_ag24_prevent_duplicate_person_day
  BEFORE INSERT OR UPDATE OF person_id, appointment_date, status
  ON public.oh_consulente_appointments
  FOR EACH ROW EXECUTE FUNCTION public.tucxa_ag24_prevent_duplicate_person_day();

COMMIT;
