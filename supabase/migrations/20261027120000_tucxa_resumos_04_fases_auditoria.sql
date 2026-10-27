-- TUCXA - 2026-10-27 - Prévia da Recepção e auditoria independente
-- Executar APENAS uma vez no Supabase da Produção antes de publicar o código.
BEGIN;
ALTER TABLE public.oh_tucxa_pilot_daily_dispatches
  DROP CONSTRAINT IF EXISTS oh_tucxa_pilot_daily_dispatches_audience_check;
ALTER TABLE public.oh_tucxa_pilot_daily_dispatches
  ADD CONSTRAINT oh_tucxa_pilot_daily_dispatches_audience_check
  CHECK (audience IN ('cavalinho', 'reception', 'reception_preview'));
ALTER TABLE public.oh_tucxa_pilot_daily_dispatches
  ADD COLUMN IF NOT EXISTS audit_email_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS audit_email_at timestamptz,
  ADD COLUMN IF NOT EXISTS audit_email_error text NOT NULL DEFAULT '';
ALTER TABLE public.oh_tucxa_pilot_daily_dispatches
  DROP CONSTRAINT IF EXISTS oh_tucxa_pilot_daily_dispatches_audit_email_status_check;
ALTER TABLE public.oh_tucxa_pilot_daily_dispatches
  ADD CONSTRAINT oh_tucxa_pilot_daily_dispatches_audit_email_status_check
  CHECK (audit_email_status IN ('pending','sent','error'));
COMMIT;
