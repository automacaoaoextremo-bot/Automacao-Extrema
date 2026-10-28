-- MEMORIAS QUE ENCANTAM - ILUSTRACOES V9
-- Execute APOS o backup e ANTES de publicar a V9; nao modifica tabelas de audio.
ALTER TABLE public.ae_education_projects
 ADD COLUMN IF NOT EXISTS illustrations_released boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.ae_education_illustration_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_slug text NOT NULL REFERENCES public.ae_education_projects(slug) ON DELETE RESTRICT,
 track_id text NOT NULL CHECK (track_id ~ '^(0[1-9]|1[0-2])$'),
 original_filename text NOT NULL,
 storage_path text NOT NULL UNIQUE,
 mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
 file_bytes bigint NOT NULL CHECK (file_bytes BETWEEN 1 AND 10485760),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','available','hidden')),
 is_featured boolean NOT NULL DEFAULT false,
 is_published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT ae_lu_illustration_featured_available CHECK (NOT is_featured OR status='available'),
 CONSTRAINT ae_lu_illustration_published_available CHECK (NOT is_published OR status='available')
);
CREATE UNIQUE INDEX IF NOT EXISTS ae_lu_illustration_one_featured
 ON public.ae_education_illustration_versions (project_slug, track_id) WHERE is_featured;
CREATE INDEX IF NOT EXISTS ae_lu_illustration_song
 ON public.ae_education_illustration_versions (project_slug, track_id, created_at);
ALTER TABLE public.ae_education_illustration_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ae_education_illustration_versions FROM anon, authenticated;

-- Escolha atomica, feita SOMENTE pela API autenticada e service_role.
CREATE OR REPLACE FUNCTION public.ae_education_feature_illustration(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE chosen record;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 SELECT project_slug, track_id INTO chosen
 FROM public.ae_education_illustration_versions
 WHERE id=p_id AND project_slug='lu-2026' AND status='available';
 IF NOT FOUND THEN RAISE EXCEPTION 'Ilustracao nao disponivel'; END IF;
 PERFORM 1 FROM public.ae_education_projects WHERE slug=chosen.project_slug FOR UPDATE;
 UPDATE public.ae_education_illustration_versions SET is_featured=false,updated_at=now()
 WHERE project_slug=chosen.project_slug AND track_id=chosen.track_id AND is_featured;
 UPDATE public.ae_education_illustration_versions SET is_featured=true,updated_at=now() WHERE id=p_id;
END;
$$;
REVOKE ALL ON FUNCTION public.ae_education_feature_illustration(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ae_education_feature_illustration(uuid) TO service_role;

-- Bucket privado; nao permite URL publica nem politicas de leitura anonima.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('education-illustrations-private','education-illustrations-private',false,10485760,
 ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public=false, file_size_limit=10485760,
 allowed_mime_types=EXCLUDED.allowed_mime_types;
