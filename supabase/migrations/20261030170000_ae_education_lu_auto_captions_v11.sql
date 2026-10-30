-- AE / Lu V11: transcricoes automáticas por VERSAO de audio (nunca por nome).
-- Idempotente. Executar apos a V10; nao altera gravacoes ou letras manuais.
CREATE TABLE IF NOT EXISTS public.ae_education_audio_captions (
  version_id uuid PRIMARY KEY REFERENCES public.ae_education_audio_versions(id) ON DELETE CASCADE,
  project_slug text NOT NULL REFERENCES public.ae_education_projects(slug) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','ready','failed')),
  cues jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(cues) = 'array'),
  model text NOT NULL DEFAULT 'whisper-1',
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts BETWEEN 1 AND 3),
  error_code text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ae_education_audio_captions_project
  ON public.ae_education_audio_captions(project_slug);
ALTER TABLE public.ae_education_audio_captions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ae_education_audio_captions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ae_education_audio_captions TO service_role;

-- Claim atomico: so um request pode gerar determinada versao.
-- Retry controlado de falhas; processamento travado reinicia apos 10 minutos.
CREATE OR REPLACE FUNCTION public.ae_education_claim_auto_caption(p_version uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE claimed boolean;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.ae_education_audio_versions v
    JOIN public.ae_education_projects p ON p.slug=v.project_slug
    WHERE v.id=p_version AND v.project_slug='lu-2026'
      AND v.status='available' AND v.is_selected=true
      AND p.media_authorized=true AND p.family_released=true
  ) THEN RETURN false; END IF;

  INSERT INTO public.ae_education_audio_captions
    (version_id,project_slug,status,attempts,cues,model,updated_at)
  VALUES (p_version,'lu-2026','processing',1,'[]'::jsonb,'whisper-1',now())
  ON CONFLICT (version_id) DO UPDATE
    SET status='processing', attempts=ae_education_audio_captions.attempts+1,
        error_code=NULL, cues='[]'::jsonb, updated_at=now()
    WHERE ae_education_audio_captions.attempts < 3
      AND ae_education_audio_captions.status IN ('failed','processing')
      AND ae_education_audio_captions.updated_at < now() - INTERVAL '10 minutes'
  RETURNING true INTO claimed;
  RETURN COALESCE(claimed,false);
END;
$$;
REVOKE ALL ON FUNCTION public.ae_education_claim_auto_caption(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ae_education_claim_auto_caption(uuid) TO service_role;
