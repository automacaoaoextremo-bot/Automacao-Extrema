-- Distingue uma suspensao administrativa de um cadastro aguardando conclusao.
-- Cadastro publico nao exige aprovacao manual. Nenhum registro e liberado
-- por esta migration; a liberacao ocorre apos validacao Auth no servidor.
BEGIN;
ALTER TABLE public.ae_ai_customers
  ADD COLUMN IF NOT EXISTS portal_suspended_at timestamptz NULL;
COMMENT ON COLUMN public.ae_ai_customers.portal_suspended_at IS
  'Suspensao administrativa independente de portal_enabled. Registro nao pode ser reativado automaticamente quando preenchido.';
COMMIT;
