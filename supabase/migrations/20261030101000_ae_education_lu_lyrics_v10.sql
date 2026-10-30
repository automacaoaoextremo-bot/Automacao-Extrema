-- V10 - Legendas das cantigas da Lu; sem letras preenchidas automaticamente.
-- Idempotente; executar no banco de homologacao antes de Production.
CREATE TABLE IF NOT EXISTS public.ae_education_track_lyrics (
  project_slug text NOT NULL REFERENCES public.ae_education_projects(slug) ON DELETE RESTRICT,
  track_id text NOT NULL CHECK (track_id ~ '^(0[1-9]|1[0-2])$'),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 8000),
  is_published boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_slug, track_id),
  CONSTRAINT ae_lu_lyrics_publish_requires_body CHECK (NOT is_published OR length(trim(body)) > 0)
);
ALTER TABLE public.ae_education_track_lyrics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ae_education_track_lyrics FROM PUBLIC, anon, authenticated;
-- Somente APIs servidoras autenticadas acessam via service_role; sem policy publica.
GRANT SELECT, INSERT, UPDATE ON TABLE public.ae_education_track_lyrics TO service_role;
