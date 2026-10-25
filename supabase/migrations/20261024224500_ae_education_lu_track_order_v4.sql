-- Memórias que Encantam: ordem visível independente do ID permanente do QR.
-- Migracao incremental: NAO altera tabelas do TUCXA ou Bingo.
CREATE TABLE IF NOT EXISTS public.ae_education_track_order (
  project_slug text NOT NULL REFERENCES public.ae_education_projects(slug) ON DELETE RESTRICT,
  track_id text NOT NULL CHECK (track_id ~ '^(0[1-9]|1[0-2])$'),
  sort_order integer NOT NULL CHECK (sort_order BETWEEN 1 AND 12),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_slug, track_id)
);
ALTER TABLE public.ae_education_track_order ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ae_education_track_order FROM anon, authenticated;
INSERT INTO public.ae_education_track_order (project_slug, track_id, sort_order)
SELECT 'lu-2026', lpad(n::text, 2, '0'), n FROM generate_series(1, 12) n
ON CONFLICT (project_slug, track_id) DO NOTHING;
CREATE INDEX IF NOT EXISTS ae_education_track_order_sort_idx
  ON public.ae_education_track_order (project_slug, sort_order);
