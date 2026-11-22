-- AG26: consentimento explícito, canais individuais e auditoria de novos agendamentos.
-- Não apaga agendamentos nem cria vínculos entre pessoas sem autorização.
ALTER TABLE public.oh_tucxa_consulente_relationships
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS related_whatsapp_requested text;
-- Preserva vínculos individuais anteriormente validados e usados pela Recepção.
UPDATE public.oh_tucxa_consulente_relationships
SET approval_status = 'approved'
WHERE related_person_id IS NOT NULL AND approval_status = 'pending'
  AND created_at < TIMESTAMPTZ '2026-11-22 00:00:00-03';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oh_tucxa_relationship_approval_status_check') THEN
    ALTER TABLE public.oh_tucxa_consulente_relationships
      ADD CONSTRAINT oh_tucxa_relationship_approval_status_check
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_oh_tucxa_relationship_pending
  ON public.oh_tucxa_consulente_relationships (organization_id, related_person_id, approval_status);
ALTER TABLE public.oh_tucxa_pilot_person_preferences
  ADD COLUMN IF NOT EXISTS reception_new_booking_channels text[] NOT NULL DEFAULT ARRAY[]::text[];
CREATE TABLE IF NOT EXISTS public.oh_tucxa_pilot_booking_notice_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.oh_organizations(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.oh_consulente_appointments(id) ON DELETE CASCADE,
  recipient_person_id uuid NOT NULL REFERENCES public.oh_people(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient_contact text NOT NULL,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','sent','error')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, recipient_person_id, channel)
);
ALTER TABLE public.oh_tucxa_pilot_booking_notice_dispatches ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.oh_tucxa_pilot_booking_notice_dispatches IS
  'AG26: auditoria idempotente de avisos individuais de agendamento; sem reenvio automático em erro.';
