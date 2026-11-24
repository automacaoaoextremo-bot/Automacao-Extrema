-- TUCXA AG28: vínculos geridos pela Recepção; avisos opt-in desligados por padrão.
-- Migração aditiva: não exclui reservas, pessoas ou relacionamentos existentes.
BEGIN;
ALTER TABLE public.oh_tucxa_consulente_relationships
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_oh_tucxa_relationship_active_owner
  ON public.oh_tucxa_consulente_relationships(organization_id, owner_person_id, active);
ALTER TABLE public.oh_tucxa_pilot_person_preferences
  ADD COLUMN IF NOT EXISTS reception_link_request_channels text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS reception_entity_change_channels text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS reception_reschedule_channels text[] NOT NULL DEFAULT ARRAY[]::text[];
CREATE TABLE IF NOT EXISTS public.oh_tucxa_link_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.oh_organizations(id) ON DELETE CASCADE,
  requester_person_id uuid NOT NULL REFERENCES public.oh_people(id) ON DELETE CASCADE,
  requested_name text NOT NULL,
  requested_whatsapp text,
  relationship text NOT NULL,
  first_time boolean NOT NULL DEFAULT false,
  usual_entity text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oh_tucxa_link_requests_pending
  ON public.oh_tucxa_link_requests(organization_id,status,created_at DESC);
ALTER TABLE public.oh_tucxa_link_requests ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.oh_tucxa_ag28_event_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.oh_organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('link_request','entity_change','reschedule')),
  recipient_person_id uuid NOT NULL REFERENCES public.oh_people(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','whatsapp')),
  recipient_contact text NOT NULL,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','sent','error')),
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id,recipient_person_id,channel)
);
ALTER TABLE public.oh_tucxa_ag28_event_dispatches ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.oh_tucxa_ag28_event_dispatches IS 'Envios AG28 opt-in, sem repetição automática de falhas.';
COMMIT;
