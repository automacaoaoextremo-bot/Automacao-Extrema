-- TUCXA AG27: permissao somente para SOLICITAR agendamento de terceiros.
-- Nao concede acesso ao login, historico, alteracao de dados ou confirmacao
-- da pessoa atendida. A decisao de presenca continua pelo link individual.
BEGIN;
ALTER TABLE public.oh_tucxa_consulente_relationships
  DROP CONSTRAINT IF EXISTS oh_tucxa_relationship_approval_status_check;
ALTER TABLE public.oh_tucxa_consulente_relationships
  ADD CONSTRAINT oh_tucxa_relationship_approval_status_check
  CHECK (approval_status IN ('pending', 'approved', 'rejected', 'booking_only'));
-- Solicitações AG26 já associadas a uma identidade tornam-se apenas
-- elegíveis para criar reservas; vínculos sem identidade ficam pendentes
-- até que o cadastro tenha seu próprio personId.
UPDATE public.oh_tucxa_consulente_relationships
SET approval_status = 'booking_only', updated_at = now()
WHERE approval_status = 'pending' AND related_person_id IS NOT NULL;
COMMENT ON COLUMN public.oh_tucxa_consulente_relationships.approval_status IS
  'AG27: booking_only permite apenas agendamento por terceiro sem acesso a conta; approved preserva vinculo autorizado; pending exige conciliar identidade.';
COMMIT;
