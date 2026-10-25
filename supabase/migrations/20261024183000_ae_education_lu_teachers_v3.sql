-- MEMORIAS QUE ENCANTAM / LU V3: cadastro individual para as professoras.
-- Executar APOS 20261024133000_ae_education_lu_audio_pilot.sql.
-- A migracao nao inclui senhas nem telefones de pessoas reais.
CREATE TABLE IF NOT EXISTS public.ae_education_teachers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_slug text NOT NULL REFERENCES public.ae_education_projects(slug) ON DELETE RESTRICT,
 name text NOT NULL,
 phone_digits text NOT NULL UNIQUE CHECK (phone_digits ~ '^[0-9]{10,13}$'),
 email text,
 password_hash text NOT NULL,
 must_change_password boolean NOT NULL DEFAULT true,
 active boolean NOT NULL DEFAULT true,
 session_version integer NOT NULL DEFAULT 1,
 failed_attempts integer NOT NULL DEFAULT 0,
 locked_until timestamptz,
 privacy_accepted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ae_education_teachers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ae_education_teachers FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS ae_education_teachers_project_idx ON public.ae_education_teachers(project_slug);
-- Somente o servidor, usando service_role, faz leitura e modificacao.
