-- TUCXA AG19: permissão explícita de recebimento de realocações de Primeira Vez.
-- Default FALSE protege todas as entidades existentes até confirmação da Recepção.
ALTER TABLE public.oh_spiritual_entities
  ADD COLUMN IF NOT EXISTS pilot_accepts_first_time_transfers boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.oh_spiritual_entities.pilot_accepts_first_time_transfers
  IS 'Permite à Recepção realocar um agendamento com histórico de Primeira Vez para esta Entidade; não altera o agendamento inicial.';
