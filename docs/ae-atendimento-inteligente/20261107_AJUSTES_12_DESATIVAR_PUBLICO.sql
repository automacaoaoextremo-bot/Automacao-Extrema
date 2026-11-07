-- Ajustes 12: medidas operacionais da Fase 0 - Reparos RMC.
-- Executar em HOMOLOGACAO primeiro, depois em PRODUCAO (com backup).
-- Nao cria usuarios nem redefine senhas. Nao altera a Piloto.
-- Pre-requisito: migrations V1, 02, 03 e 04.
BEGIN;
UPDATE public.ae_ai_organizations
   SET public_intake_enabled = false,
       automation_enabled = false
 WHERE slug = 'reparos-rmc';
COMMIT;

SELECT slug, status, public_intake_enabled, automation_enabled
FROM public.ae_ai_organizations
WHERE slug = 'reparos-rmc';
