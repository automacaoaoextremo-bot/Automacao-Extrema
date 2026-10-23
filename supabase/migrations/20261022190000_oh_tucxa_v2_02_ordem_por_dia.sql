-- TUCXA V2/02 - Ordenacao por dia, mantendo a ordenacao historica como valor inicial.
-- Aplicar primeiro em banco de homologacao apos backup e revisao.
BEGIN;
ALTER TABLE public.oh_spiritual_entities
  ADD COLUMN IF NOT EXISTS pilot_display_order_monday integer,
  ADD COLUMN IF NOT EXISTS pilot_display_order_tuesday integer;
UPDATE public.oh_spiritual_entities
SET pilot_display_order_monday = COALESCE(pilot_display_order_monday, pilot_display_order, 1000),
    pilot_display_order_tuesday = COALESCE(pilot_display_order_tuesday, pilot_display_order, 1000)
WHERE pilot_display_order_monday IS NULL OR pilot_display_order_tuesday IS NULL;
ALTER TABLE public.oh_spiritual_entities
  ALTER COLUMN pilot_display_order_monday SET DEFAULT 1000,
  ALTER COLUMN pilot_display_order_monday SET NOT NULL,
  ALTER COLUMN pilot_display_order_tuesday SET DEFAULT 1000,
  ALTER COLUMN pilot_display_order_tuesday SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.oh_spiritual_entities'::regclass AND conname='oh_spiritual_entities_order_monday_range') THEN
    ALTER TABLE public.oh_spiritual_entities ADD CONSTRAINT oh_spiritual_entities_order_monday_range CHECK (pilot_display_order_monday BETWEEN 0 AND 9999);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.oh_spiritual_entities'::regclass AND conname='oh_spiritual_entities_order_tuesday_range') THEN
    ALTER TABLE public.oh_spiritual_entities ADD CONSTRAINT oh_spiritual_entities_order_tuesday_range CHECK (pilot_display_order_tuesday BETWEEN 0 AND 9999);
  END IF;
END $$;
COMMIT;
